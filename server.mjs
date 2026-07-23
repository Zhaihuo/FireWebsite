import { createHash, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
const dbPath = path.join(dataDir, 'db.json')
const distDir = path.join(__dirname, 'dist')
const port = Number(process.env.PORT || 3100)

const defaultDb = {
  users: [],
  sessions: [],
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

let writeQueue = Promise.resolve()

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
  })
  response.end(text)
}

function hashPassword(password, salt) {
  return createHash('sha256').update(`${salt}:${password}`).digest('hex')
}

function createToken() {
  return randomBytes(24).toString('hex')
}

async function ensureDb() {
  await mkdir(dataDir, { recursive: true })

  try {
    await access(dbPath)
  } catch {
    await writeFile(dbPath, JSON.stringify(defaultDb, null, 2), 'utf8')
  }
}

async function readDb() {
  await ensureDb()
  const raw = await readFile(dbPath, 'utf8')
  const parsed = JSON.parse(raw)

  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
  }
}

async function writeDb(nextDb) {
  writeQueue = writeQueue.then(() =>
    writeFile(
      dbPath,
      JSON.stringify(
        {
          users: nextDb.users,
          sessions: nextDb.sessions,
        },
        null,
        2,
      ),
      'utf8',
    ),
  )

  return writeQueue
}

async function readBody(request) {
  const chunks = []
  let total = 0

  for await (const chunk of request) {
    total += chunk.length
    if (total > 25 * 1024 * 1024) {
      throw new Error('PAYLOAD_TOO_LARGE')
    }
    chunks.push(chunk)
  }

  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

function getAuthToken(request) {
  const header = request.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length)
}

function sanitizeNote(note) {
  return {
    id: String(note.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    title: String(note.title || '未命名文件').slice(0, 200),
    type: ['image', 'table', 'text', 'data', 'file'].includes(note.type) ? note.type : 'file',
    size: String(note.size || ''),
    content: String(note.content || '').slice(0, 2_000_000),
    preview: typeof note.preview === 'string' ? note.preview.slice(0, 10_000_000) : null,
    rows: Array.isArray(note.rows)
      ? note.rows
          .slice(0, 12)
          .map((row) => (Array.isArray(row) ? row.slice(0, 8).map((cell) => String(cell).slice(0, 200)) : []))
      : [],
    createdAt: String(note.createdAt || ''),
  }
}

async function requireUser(request, response) {
  const token = getAuthToken(request)
  if (!token) {
    sendJson(response, 401, { message: '请先登录。' })
    return null
  }

  const db = await readDb()
  const session = db.sessions.find((item) => item.token === token)
  if (!session) {
    sendJson(response, 401, { message: '登录状态已失效，请重新登录。' })
    return null
  }

  const user = db.users.find((item) => item.id === session.userId)
  if (!user) {
    sendJson(response, 401, { message: '账号不存在，请重新登录。' })
    return null
  }

  return { db, user, token }
}

async function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`)

  if (request.method === 'POST' && url.pathname === '/api/auth/register') {
    try {
      const body = await readBody(request)
      const username = String(body.username || '').trim().toLowerCase()
      const password = String(body.password || '')

      if (username.length < 3 || password.length < 6) {
        sendJson(response, 400, { message: '用户名至少 3 位，密码至少 6 位。' })
        return
      }

      const db = await readDb()
      if (db.users.some((user) => user.username === username)) {
        sendJson(response, 409, { message: '这个用户名已被使用。' })
        return
      }

      const salt = randomBytes(16).toString('hex')
      const userId = randomBytes(12).toString('hex')
      const token = createToken()
      const now = new Date().toISOString()

      db.users.push({
        id: userId,
        username,
        passwordHash: hashPassword(password, salt),
        salt,
        notes: [],
        createdAt: now,
      })
      db.sessions.push({
        token,
        userId,
        createdAt: now,
      })

      await writeDb(db)
      sendJson(response, 201, {
        token,
        user: { username },
        notes: [],
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
        sendJson(response, 413, { message: '上传内容太大，请拆分后重试。' })
        return
      }
      sendJson(response, 400, { message: '注册请求无效。' })
    }
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    try {
      const body = await readBody(request)
      const username = String(body.username || '').trim().toLowerCase()
      const password = String(body.password || '')
      const db = await readDb()
      const user = db.users.find((item) => item.username === username)

      if (!user || user.passwordHash !== hashPassword(password, user.salt)) {
        sendJson(response, 401, { message: '用户名或密码不正确。' })
        return
      }

      const token = createToken()
      db.sessions = db.sessions.filter((item) => item.userId !== user.id)
      db.sessions.push({
        token,
        userId: user.id,
        createdAt: new Date().toISOString(),
      })

      await writeDb(db)
      sendJson(response, 200, {
        token,
        user: { username: user.username },
        notes: Array.isArray(user.notes) ? user.notes : [],
      })
    } catch {
      sendJson(response, 400, { message: '登录请求无效。' })
    }
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/auth/me') {
    const auth = await requireUser(request, response)
    if (!auth) return

    sendJson(response, 200, {
      user: { username: auth.user.username },
      notes: Array.isArray(auth.user.notes) ? auth.user.notes : [],
    })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
    const token = getAuthToken(request)
    if (!token) {
      sendJson(response, 204, {})
      return
    }

    const db = await readDb()
    db.sessions = db.sessions.filter((item) => item.token !== token)
    await writeDb(db)
    sendJson(response, 204, {})
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/notes') {
    const auth = await requireUser(request, response)
    if (!auth) return

    sendJson(response, 200, {
      notes: Array.isArray(auth.user.notes) ? auth.user.notes : [],
    })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/notes/import') {
    try {
      const auth = await requireUser(request, response)
      if (!auth) return

      const body = await readBody(request)
      const incoming = Array.isArray(body.notes) ? body.notes : []
      const notes = incoming.map(sanitizeNote)

      auth.user.notes = [...notes, ...(Array.isArray(auth.user.notes) ? auth.user.notes : [])]
      await writeDb(auth.db)

      sendJson(response, 201, {
        notes: auth.user.notes,
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
        sendJson(response, 413, { message: '上传内容太大，请拆分后重试。' })
        return
      }
      sendJson(response, 400, { message: '笔记保存失败。' })
    }
    return
  }

  sendJson(response, 404, { message: '接口不存在。' })
}

async function serveStatic(request, response) {
  let pathname = new URL(request.url, `http://${request.headers.host}`).pathname
  if (pathname === '/') pathname = '/index.html'

  const safePath = path.normalize(path.join(distDir, pathname))
  if (!safePath.startsWith(distDir)) {
    sendText(response, 403, 'Forbidden')
    return
  }

  let filePath = safePath

  try {
    await access(filePath)
  } catch {
    filePath = path.join(distDir, 'index.html')
  }

  try {
    const content = await readFile(filePath)
    const extension = path.extname(filePath).toLowerCase()
    response.writeHead(200, {
      'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    })
    response.end(content)
  } catch {
    sendText(response, 404, 'Build output not found. Run "npm run build" first.')
  }
}

const server = createServer(async (request, response) => {
  if (!request.url || !request.method) {
    sendText(response, 400, 'Bad Request')
    return
  }

  if (request.url.startsWith('/api/')) {
    await handleApi(request, response)
    return
  }

  await serveStatic(request, response)
})

server.listen(port, async () => {
  await ensureDb()
  console.log(`Server running at http://localhost:${port}`)
})
