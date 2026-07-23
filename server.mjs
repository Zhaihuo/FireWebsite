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
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

let writeQueue = Promise.resolve()

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
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

function createId() {
  return randomBytes(12).toString('hex')
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
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    users: Array.isArray(parsed.users) ? parsed.users : [],
  }
}

async function writeDb(nextDb) {
  writeQueue = writeQueue.then(() =>
    writeFile(
      dbPath,
      JSON.stringify(
        {
          sessions: nextDb.sessions,
          users: nextDb.users,
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
    id: String(note.id || createId()),
    title: String(note.title || '未命名文件').slice(0, 200),
    type: ['image', 'table', 'text', 'data', 'pdf', 'excel', 'word', 'file'].includes(note.type)
      ? note.type
      : 'file',
    size: String(note.size || ''),
    content: String(note.content || '').slice(0, 2_000_000),
    preview: typeof note.preview === 'string' ? note.preview.slice(0, 10_000_000) : null,
    sourceUrl: typeof note.sourceUrl === 'string' ? note.sourceUrl.slice(0, 10_000_000) : null,
    extension: String(note.extension || '').slice(0, 20),
    relativePath: String(note.relativePath || '').slice(0, 1000),
    folderPath: String(note.folderPath || '').slice(0, 1000),
    mimeType: String(note.mimeType || '').slice(0, 200),
    rows: Array.isArray(note.rows)
      ? note.rows
          .slice(0, 20)
          .map((row) => (Array.isArray(row) ? row.slice(0, 10).map((cell) => String(cell).slice(0, 200)) : []))
      : [],
    createdAt: String(note.createdAt || ''),
    deletedAt: note.deletedAt ? String(note.deletedAt) : null,
  }
}

function sanitizeProject(project) {
  return {
    id: String(project.id || createId()),
    name: String(project.name || '未命名项目').slice(0, 100),
    createdAt: String(project.createdAt || new Date().toISOString()),
    updatedAt: String(project.updatedAt || new Date().toISOString()),
    notes: Array.isArray(project.notes) ? project.notes.map((note) => sanitizeNote(note)) : [],
  }
}

function ensureUserData(user) {
  if (!Array.isArray(user.notes)) {
    user.notes = []
  }

  if (!Array.isArray(user.projects)) {
    user.projects = []
  }

  user.notes = user.notes.map((note) => sanitizeNote(note))
  user.projects = user.projects.map((project) => sanitizeProject(project))
}

function findNote(list, noteId) {
  return list.find((item) => item.id === noteId) || null
}

function findProject(user, projectId) {
  ensureUserData(user)
  return user.projects.find((item) => item.id === projectId) || null
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

  ensureUserData(user)
  return { db, user }
}

function applyNoteAction(list, action, ids) {
  const idSet = new Set(ids)

  if (action === 'trash') {
    for (const note of list) {
      if (idSet.has(note.id)) {
        note.deletedAt = new Date().toISOString()
      }
    }
    return
  }

  if (action === 'restore') {
    for (const note of list) {
      if (idSet.has(note.id)) {
        note.deletedAt = null
      }
    }
    return
  }

  if (action === 'remove') {
    return list.filter((note) => !(idSet.has(note.id) && note.deletedAt))
  }

  return list
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

      const now = new Date().toISOString()
      const salt = randomBytes(16).toString('hex')
      const userId = createId()
      const token = createToken()

      db.users.push({
        id: userId,
        username,
        passwordHash: hashPassword(password, salt),
        salt,
        notes: [],
        projects: [],
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
        projects: [],
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

      ensureUserData(user)
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
        notes: user.notes,
        projects: user.projects,
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
      notes: auth.user.notes,
      projects: auth.user.projects,
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

    sendJson(response, 200, { notes: auth.user.notes })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/notes/import') {
    try {
      const auth = await requireUser(request, response)
      if (!auth) return

      const body = await readBody(request)
      const incoming = Array.isArray(body.notes) ? body.notes : []
      const notes = incoming.map((note) => ({
        ...sanitizeNote(note),
        deletedAt: null,
      }))

      auth.user.notes = [...notes, ...auth.user.notes]
      await writeDb(auth.db)
      sendJson(response, 201, { notes: auth.user.notes })
    } catch (error) {
      if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
        sendJson(response, 413, { message: '上传内容太大，请拆分后重试。' })
        return
      }
      sendJson(response, 400, { message: '常用文件保存失败。' })
    }
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/notes/batch') {
    try {
      const auth = await requireUser(request, response)
      if (!auth) return

      const body = await readBody(request)
      const action = String(body.action || '')
      const ids = Array.isArray(body.ids) ? body.ids.map((id) => String(id)) : []

      if (!['trash', 'restore', 'remove'].includes(action) || !ids.length) {
        sendJson(response, 400, { message: '批量操作参数无效。' })
        return
      }

      const matches = auth.user.notes.filter((note) => ids.includes(note.id))
      if (!matches.length) {
        sendJson(response, 404, { message: '没有找到要处理的常用文件。' })
        return
      }

      if (action === 'remove') {
        auth.user.notes = applyNoteAction(auth.user.notes, action, ids)
      } else {
        applyNoteAction(auth.user.notes, action, ids)
      }

      await writeDb(auth.db)
      sendJson(response, 200, { notes: auth.user.notes })
    } catch {
      sendJson(response, 400, { message: '批量操作失败。' })
    }
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/notes/trash') {
    const auth = await requireUser(request, response)
    if (!auth) return

    const body = await readBody(request)
    const noteId = String(body.id || '')
    const note = findNote(auth.user.notes, noteId)
    if (!note) {
      sendJson(response, 404, { message: '没有找到要删除的常用文件。' })
      return
    }

    note.deletedAt = new Date().toISOString()
    await writeDb(auth.db)
    sendJson(response, 200, { notes: auth.user.notes })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/notes/restore') {
    const auth = await requireUser(request, response)
    if (!auth) return

    const body = await readBody(request)
    const noteId = String(body.id || '')
    const note = findNote(auth.user.notes, noteId)
    if (!note) {
      sendJson(response, 404, { message: '没有找到要恢复的常用文件。' })
      return
    }

    note.deletedAt = null
    await writeDb(auth.db)
    sendJson(response, 200, { notes: auth.user.notes })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/notes/remove') {
    const auth = await requireUser(request, response)
    if (!auth) return

    const body = await readBody(request)
    const noteId = String(body.id || '')
    const note = findNote(auth.user.notes, noteId)
    if (!note) {
      sendJson(response, 404, { message: '没有找到要彻底删除的常用文件。' })
      return
    }

    if (!note.deletedAt) {
      sendJson(response, 400, { message: '请先将常用文件移入垃圾管理，再进行彻底删除。' })
      return
    }

    auth.user.notes = auth.user.notes.filter((item) => item.id !== noteId)
    await writeDb(auth.db)
    sendJson(response, 200, { notes: auth.user.notes })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/projects') {
    const auth = await requireUser(request, response)
    if (!auth) return

    sendJson(response, 200, { projects: auth.user.projects })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/projects') {
    const auth = await requireUser(request, response)
    if (!auth) return

    const body = await readBody(request)
    const name = String(body.name || '').trim()
    if (name.length < 1) {
      sendJson(response, 400, { message: '请输入项目名称。' })
      return
    }

    const project = sanitizeProject({
      id: createId(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
    })

    auth.user.projects.unshift(project)
    await writeDb(auth.db)
    sendJson(response, 201, { project, projects: auth.user.projects })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/projects/import') {
    try {
      const auth = await requireUser(request, response)
      if (!auth) return

      const body = await readBody(request)
      const projectId = String(body.projectId || '')
      const project = findProject(auth.user, projectId)
      if (!project) {
        sendJson(response, 404, { message: '没有找到对应项目。' })
        return
      }

      const incoming = Array.isArray(body.notes) ? body.notes : []
      const notes = incoming.map((note) => ({
        ...sanitizeNote(note),
        deletedAt: null,
      }))

      project.notes = [...notes, ...project.notes]
      project.updatedAt = new Date().toISOString()
      await writeDb(auth.db)
      sendJson(response, 201, { project, projects: auth.user.projects })
    } catch (error) {
      if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
        sendJson(response, 413, { message: '上传内容太大，请拆分后重试。' })
        return
      }
      sendJson(response, 400, { message: '项目文件保存失败。' })
    }
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/projects/remove') {
    const auth = await requireUser(request, response)
    if (!auth) return

    const body = await readBody(request)
    const projectId = String(body.projectId || '')
    const password = String(body.password || '')
    const project = findProject(auth.user, projectId)
    if (!project) {
      sendJson(response, 404, { message: 'Project not found.' })
      return
    }

    if (!password) {
      sendJson(response, 400, { message: 'Please enter your password.' })
      return
    }

    if (auth.user.passwordHash !== hashPassword(password, auth.user.salt)) {
      sendJson(response, 401, { message: 'Incorrect password.' })
      return
    }

    auth.user.projects = auth.user.projects.filter((item) => item.id !== projectId)
    await writeDb(auth.db)
    sendJson(response, 200, { projects: auth.user.projects })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/projects/batch') {
    try {
      const auth = await requireUser(request, response)
      if (!auth) return

      const body = await readBody(request)
      const projectId = String(body.projectId || '')
      const action = String(body.action || '')
      const ids = Array.isArray(body.ids) ? body.ids.map((id) => String(id)) : []
      const project = findProject(auth.user, projectId)
      if (!project) {
        sendJson(response, 404, { message: 'Project not found.' })
        return
      }

      if (action !== 'remove' || !ids.length) {
        sendJson(response, 400, { message: 'Invalid project batch action.' })
        return
      }

      const idSet = new Set(ids)
      const nextNotes = project.notes.filter((note) => !idSet.has(note.id))
      if (nextNotes.length === project.notes.length) {
        sendJson(response, 404, { message: 'No matching project files were found.' })
        return
      }

      project.notes = nextNotes
      project.updatedAt = new Date().toISOString()
      await writeDb(auth.db)
      sendJson(response, 200, { project, projects: auth.user.projects })
    } catch {
      sendJson(response, 400, { message: 'Project batch delete failed.' })
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
