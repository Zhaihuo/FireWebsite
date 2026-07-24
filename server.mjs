import { createHash, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
const dbPath = path.join(dataDir, 'db.json')
const distDir = path.join(__dirname, 'dist')
const uploadsDir = path.join(dataDir, 'uploads')
const port = Number(process.env.PORT || 3100)
const host = process.env.HOST || '0.0.0.0'
const maxJsonBodyBytes = 25 * 1024 * 1024
const maxUploadBodyBytes = Number(process.env.MAX_UPLOAD_BODY_BYTES || 200 * 1024 * 1024)

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
  '.csv': 'text/csv; charset=utf-8',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.tsv': 'text/tab-separated-values; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

let writeQueue = Promise.resolve()
const utf8Decoder = new TextDecoder('utf-8', { fatal: true })
const gb18030Decoder = new TextDecoder('gb18030')

function getNetworkUrls(portNumber) {
  const interfaces = networkInterfaces()
  const urls = []

  for (const items of Object.values(interfaces)) {
    for (const item of items || []) {
      if (item.family !== 'IPv4' || item.internal) continue
      urls.push(`http://${item.address}:${portNumber}`)
    }
  }

  return [...new Set(urls)]
}

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

function decodeMultipartHeaderValue(value) {
  if (!value) return ''

  try {
    return Buffer.from(value, 'latin1').toString('utf8')
  } catch {
    return value
  }
}

function decodeMultipartFilename(disposition) {
  const encodedMatch = disposition.match(/filename\*\s*=\s*([^;]+)/i)
  if (encodedMatch) {
    const encodedValue = encodedMatch[1].trim()
    const charsetIndex = encodedValue.indexOf("''")

    if (charsetIndex >= 0) {
      const encodedName = encodedValue.slice(charsetIndex + 2)

      try {
        return decodeURIComponent(encodedName)
      } catch {
        // Fall back to the plain filename parser below.
      }
    }
  }

  const fileNameMatch = disposition.match(/filename="([^"]*)"/i)
  return fileNameMatch ? decodeMultipartHeaderValue(fileNameMatch[1]) : ''
}

function decodeUploadedText(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) return ''

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.slice(3).toString('utf8')
  }

  try {
    return utf8Decoder.decode(buffer)
  } catch {
    return gb18030Decoder.decode(buffer)
  }
}

async function ensureDb() {
  await mkdir(dataDir, { recursive: true })
  await mkdir(uploadsDir, { recursive: true })

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
  return readJsonBody(request, maxJsonBodyBytes)
}

async function readJsonBody(request, limitBytes) {
  const chunks = []
  let total = 0

  for await (const chunk of request) {
    total += chunk.length
    if (total > limitBytes) {
      throw new Error('PAYLOAD_TOO_LARGE')
    }
    chunks.push(chunk)
  }

  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

async function readRawBody(request, limitBytes) {
  const chunks = []
  let total = 0

  for await (const chunk of request) {
    total += chunk.length
    if (total > limitBytes) {
      throw new Error('PAYLOAD_TOO_LARGE')
    }
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

function getAuthToken(request) {
  const header = request.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length)
}

function getExtension(fileName) {
  return path.extname(fileName).toLowerCase()
}

function getFileType(fileName, mimeType = '') {
  const extension = getExtension(fileName)
  if (mimeType.startsWith('image/')) return 'image'
  if (['.csv', '.tsv'].includes(extension)) return 'table'
  if (extension === '.pdf' || mimeType === 'application/pdf') return 'pdf'
  if (['.xls', '.xlsx'].includes(extension)) return 'excel'
  if (['.doc', '.docx'].includes(extension)) return 'word'
  if (mimeType.startsWith('text/') || ['.md', '.txt', '.json', '.html', '.css', '.js', '.jsx'].includes(extension)) {
    return extension === '.json' ? 'data' : 'text'
  }

  return 'file'
}

function getFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function parseTable(content, fileName) {
  const separator = fileName.toLowerCase().endsWith('.tsv') ? '\t' : ','
  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(0, 8)
    .map((row) => row.split(separator).map((cell) => cell.trim()).slice(0, 6))
}

function buildDocumentSummary(fileName, type) {
  const typeNameMap = {
    pdf: 'PDF 文档',
    excel: 'Excel 表格',
    word: 'Word 文档',
    file: '文件',
  }

  return `${fileName} 已上传并保存。类型：${typeNameMap[type] || '文件'}，可在详情页中打开或下载原文件。`
}

function getFileMimeType(fileName, fallbackMimeType = 'application/octet-stream') {
  return mimeTypes[getExtension(fileName)] || fallbackMimeType
}

function getStoredFileUrl(relativeFilePath) {
  return `/uploads/${relativeFilePath.split(path.sep).join('/')}`
}

function getUploadFilePath(note) {
  if (!note.filePath) return ''
  return path.normalize(path.join(uploadsDir, note.filePath))
}

async function removeUploadFile(note) {
  if (!note?.filePath) return

  const filePath = getUploadFilePath(note)
  if (!filePath.startsWith(uploadsDir)) return

  try {
    await rm(filePath, { force: true })
  } catch {
    // Ignore missing files during cleanup.
  }
}

function parseMultipartFormData(contentType, bodyBuffer) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)
  if (!boundaryMatch) {
    throw new Error('INVALID_MULTIPART')
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2]
  const boundaryText = `--${boundary}`
  const raw = bodyBuffer.toString('latin1')
  const segments = raw.split(boundaryText).slice(1, -1)
  const parts = []

  for (const segment of segments) {
    const normalized = segment.startsWith('\r\n') ? segment.slice(2) : segment
    const headerEnd = normalized.indexOf('\r\n\r\n')
    if (headerEnd === -1) continue

    const headerText = normalized.slice(0, headerEnd)
    let contentText = normalized.slice(headerEnd + 4)
    if (contentText.endsWith('\r\n')) {
      contentText = contentText.slice(0, -2)
    }

    const headers = {}
    for (const line of headerText.split('\r\n')) {
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) continue
      headers[line.slice(0, colonIndex).trim().toLowerCase()] = line.slice(colonIndex + 1).trim()
    }

    const disposition = headers['content-disposition'] || ''
    const nameMatch = disposition.match(/name="([^"]+)"/i)
    if (!nameMatch) continue

    const fileName = decodeMultipartFilename(disposition)
    const contentBuffer = Buffer.from(contentText, 'latin1')
    parts.push({
      name: nameMatch[1],
      filename: fileName,
      contentType: headers['content-type'] || 'application/octet-stream',
      value: fileName ? contentBuffer : decodeUploadedText(contentBuffer),
      isFile: Boolean(fileName),
    })
  }

  return parts
}

async function parseUploadRequest(request) {
  const contentType = request.headers['content-type'] || ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    throw new Error('INVALID_UPLOAD_TYPE')
  }

  const bodyBuffer = await readRawBody(request, maxUploadBodyBytes)
  const parts = parseMultipartFormData(contentType, bodyBuffer)
  const filePart = parts.find((part) => part.isFile && part.name === 'file')
  if (!filePart || !Buffer.isBuffer(filePart.value) || !filePart.filename) {
    throw new Error('UPLOAD_FILE_REQUIRED')
  }

  return {
    fileName: filePart.filename,
    mimeType: filePart.contentType || 'application/octet-stream',
    buffer: filePart.value,
    relativePath: String(parts.find((part) => !part.isFile && part.name === 'relativePath')?.value || ''),
    folderPath: String(parts.find((part) => !part.isFile && part.name === 'folderPath')?.value || ''),
    projectId: String(parts.find((part) => !part.isFile && part.name === 'projectId')?.value || ''),
    articleId: String(parts.find((part) => !part.isFile && part.name === 'articleId')?.value || ''),
  }
}

async function createNoteFromUpload({ userId, fileName, mimeType, buffer, relativePath = '', folderPath = '' }) {
  const noteId = createId()
  const extension = getExtension(fileName)
  const type = getFileType(fileName, mimeType)
  const storageDir = path.join(uploadsDir, userId)
  await mkdir(storageDir, { recursive: true })

  const storedFileName = `${noteId}${extension}`
  const relativeFilePath = path.join(userId, storedFileName)
  const absoluteFilePath = path.join(storageDir, storedFileName)
  await writeFile(absoluteFilePath, buffer)

  const sourceUrl = getStoredFileUrl(relativeFilePath)
  const note = {
    id: noteId,
    title: fileName,
    type,
    size: getFileSize(buffer.length),
    content: '',
    preview: null,
    sourceUrl,
    extension: extension.replace(/^\./, ''),
    relativePath: String(relativePath || '').replace(/\\/g, '/').slice(0, 1000),
    folderPath: String(folderPath || '').replace(/\\/g, '/').slice(0, 1000),
    mimeType: String(mimeType || getFileMimeType(fileName)).slice(0, 200),
    rows: [],
    createdAt: new Date().toISOString(),
    deletedAt: null,
    filePath: relativeFilePath,
  }

  if (type === 'image') {
    note.preview = sourceUrl
    note.content = `${fileName} ${note.mimeType} 图片 视觉素材`
    return note
  }

  if (['table', 'text', 'data'].includes(type)) {
    const content = decodeUploadedText(buffer)
    note.content = content.slice(0, 2_000_000)
    note.rows = type === 'table' ? parseTable(content, fileName) : []
    return note
  }

  note.content = buildDocumentSummary(fileName, type)
  return note
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
    filePath: note.filePath ? String(note.filePath).slice(0, 1000) : '',
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

function sanitizeArticle(article) {
  const status = ['draft', 'published'].includes(article.status) ? article.status : 'draft'
  const tags = Array.isArray(article.tags)
    ? article.tags.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 12)
    : []

  return {
    id: String(article.id || createId()),
    title: String(article.title || 'Untitled Note').slice(0, 200),
    summary: String(article.summary || '').slice(0, 500),
    content: String(article.content || '').slice(0, 200_000),
    coverImage: typeof article.coverImage === 'string' ? article.coverImage.slice(0, 10_000_000) : '',
    tags,
    status,
    attachments: Array.isArray(article.attachments) ? article.attachments.map((note) => sanitizeNote(note)) : [],
    createdAt: String(article.createdAt || new Date().toISOString()),
    updatedAt: String(article.updatedAt || new Date().toISOString()),
  }
}

function ensureUserData(user) {
  if (!Array.isArray(user.notes)) {
    user.notes = []
  }

  if (!Array.isArray(user.projects)) {
    user.projects = []
  }

  if (!Array.isArray(user.articles)) {
    user.articles = []
  }

  user.notes = user.notes.map((note) => sanitizeNote(note))
  user.projects = user.projects.map((project) => sanitizeProject(project))
  user.articles = user.articles.map((article) => sanitizeArticle(article))
}

function findNote(list, noteId) {
  return list.find((item) => item.id === noteId) || null
}

function findProject(user, projectId) {
  ensureUserData(user)
  return user.projects.find((item) => item.id === projectId) || null
}

function findArticle(user, articleId) {
  ensureUserData(user)
  return user.articles.find((item) => item.id === articleId) || null
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
        articles: [],
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
        articles: [],
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
        articles: user.articles,
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
      articles: auth.user.articles,
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

  if (request.method === 'GET' && url.pathname === '/api/articles') {
    const auth = await requireUser(request, response)
    if (!auth) return

    sendJson(response, 200, { articles: auth.user.articles })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/articles/save') {
    try {
      const auth = await requireUser(request, response)
      if (!auth) return

      const body = await readBody(request)
      const incoming = sanitizeArticle(body.article || {})
      const existingIndex = auth.user.articles.findIndex((article) => article.id === incoming.id)
      const now = new Date().toISOString()
      const nextArticle = {
        ...incoming,
        updatedAt: now,
        createdAt: existingIndex >= 0 ? auth.user.articles[existingIndex].createdAt : now,
      }

      if (existingIndex >= 0) {
        auth.user.articles[existingIndex] = nextArticle
      } else {
        auth.user.articles.unshift(nextArticle)
      }

      await writeDb(auth.db)
      sendJson(response, 200, { article: nextArticle, articles: auth.user.articles })
    } catch (error) {
      if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
        sendJson(response, 413, { message: 'Article payload is too large.' })
        return
      }
      sendJson(response, 400, { message: 'Unable to save the note article.' })
    }
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/articles/remove') {
    const auth = await requireUser(request, response)
    if (!auth) return

    const body = await readBody(request)
    const articleId = String(body.articleId || '')
    const article = findArticle(auth.user, articleId)
    if (!article) {
      sendJson(response, 404, { message: 'Note article not found.' })
      return
    }

    for (const attachment of article.attachments) {
      await removeUploadFile(attachment)
    }

    auth.user.articles = auth.user.articles.filter((item) => item.id !== articleId)
    await writeDb(auth.db)
    sendJson(response, 200, { articles: auth.user.articles })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/articles/batch') {
    const auth = await requireUser(request, response)
    if (!auth) return

    const body = await readBody(request)
    const action = String(body.action || '')
    const ids = Array.isArray(body.ids) ? body.ids.map((id) => String(id)) : []

    if (action !== 'remove' || !ids.length) {
      sendJson(response, 400, { message: 'Invalid article batch action.' })
      return
    }

    const idSet = new Set(ids)
    const matches = auth.user.articles.filter((article) => idSet.has(article.id))
    if (!matches.length) {
      sendJson(response, 404, { message: 'No matching note articles were found.' })
      return
    }

    for (const article of matches) {
      for (const attachment of article.attachments) {
        await removeUploadFile(attachment)
      }
    }

    auth.user.articles = auth.user.articles.filter((article) => !idSet.has(article.id))
    await writeDb(auth.db)
    sendJson(response, 200, { articles: auth.user.articles })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/articles/upload') {
    try {
      const auth = await requireUser(request, response)
      if (!auth) return

      const upload = await parseUploadRequest(request)
      const article = findArticle(auth.user, upload.articleId)
      if (!article) {
        sendJson(response, 404, { message: 'Please save the note article before uploading attachments.' })
        return
      }

      const attachment = await createNoteFromUpload({
        userId: auth.user.id,
        fileName: upload.fileName,
        mimeType: upload.mimeType,
        buffer: upload.buffer,
        relativePath: upload.relativePath,
        folderPath: upload.folderPath,
      })

      article.attachments = [attachment, ...article.attachments.map((note) => sanitizeNote(note))]
      article.updatedAt = new Date().toISOString()
      await writeDb(auth.db)
      sendJson(response, 201, { attachment, article, articles: auth.user.articles })
    } catch (error) {
      if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
        sendJson(response, 413, { message: 'Attachment is too large.' })
        return
      }

      if (error instanceof Error && error.message === 'UPLOAD_FILE_REQUIRED') {
        sendJson(response, 400, { message: 'Please choose a file to upload.' })
        return
      }

      if (error instanceof Error && error.message === 'INVALID_UPLOAD_TYPE') {
        sendJson(response, 400, { message: 'Invalid attachment upload format.' })
        return
      }

      sendJson(response, 400, { message: 'Attachment upload failed.' })
    }
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/articles/attachment/remove') {
    const auth = await requireUser(request, response)
    if (!auth) return

    const body = await readBody(request)
    const articleId = String(body.articleId || '')
    const attachmentId = String(body.attachmentId || '')
    const article = findArticle(auth.user, articleId)
    if (!article) {
      sendJson(response, 404, { message: 'Note article not found.' })
      return
    }

    const attachment = article.attachments.find((item) => item.id === attachmentId)
    if (!attachment) {
      sendJson(response, 404, { message: 'Attachment not found.' })
      return
    }

    await removeUploadFile(attachment)
    article.attachments = article.attachments.filter((item) => item.id !== attachmentId)
    article.updatedAt = new Date().toISOString()
    await writeDb(auth.db)
    sendJson(response, 200, { article, articles: auth.user.articles })
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

  if (request.method === 'POST' && url.pathname === '/api/notes/upload') {
    try {
      const auth = await requireUser(request, response)
      if (!auth) return

      const upload = await parseUploadRequest(request)
      const note = await createNoteFromUpload({
        userId: auth.user.id,
        fileName: upload.fileName,
        mimeType: upload.mimeType,
        buffer: upload.buffer,
        relativePath: upload.relativePath,
        folderPath: upload.folderPath,
      })

      auth.user.notes = [note, ...auth.user.notes]
      await writeDb(auth.db)
      sendJson(response, 201, { note, notes: auth.user.notes })
    } catch (error) {
      if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
        sendJson(response, 413, { message: '上传文件过大，请拆分后重试。' })
        return
      }

      if (error instanceof Error && error.message === 'UPLOAD_FILE_REQUIRED') {
        sendJson(response, 400, { message: '请选择要上传的文件。' })
        return
      }

      if (error instanceof Error && error.message === 'INVALID_UPLOAD_TYPE') {
        sendJson(response, 400, { message: '上传格式无效，请重新选择文件。' })
        return
      }

      sendJson(response, 400, { message: '文件上传失败，请稍后重试。' })
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
        for (const note of matches) {
          if (note.deletedAt) {
            await removeUploadFile(note)
          }
        }
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

    await removeUploadFile(note)
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

  if (request.method === 'POST' && url.pathname === '/api/projects/upload') {
    try {
      const auth = await requireUser(request, response)
      if (!auth) return

      const upload = await parseUploadRequest(request)
      const project = findProject(auth.user, upload.projectId)
      if (!project) {
        sendJson(response, 404, { message: '没有找到对应项目。' })
        return
      }

      const note = await createNoteFromUpload({
        userId: auth.user.id,
        fileName: upload.fileName,
        mimeType: upload.mimeType,
        buffer: upload.buffer,
        relativePath: upload.relativePath,
        folderPath: upload.folderPath,
      })

      project.notes = [note, ...project.notes]
      project.updatedAt = new Date().toISOString()
      await writeDb(auth.db)
      sendJson(response, 201, { note, project, projects: auth.user.projects })
    } catch (error) {
      if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
        sendJson(response, 413, { message: '上传文件过大，请拆分后重试。' })
        return
      }

      if (error instanceof Error && error.message === 'UPLOAD_FILE_REQUIRED') {
        sendJson(response, 400, { message: '请选择要上传的文件。' })
        return
      }

      if (error instanceof Error && error.message === 'INVALID_UPLOAD_TYPE') {
        sendJson(response, 400, { message: '上传格式无效，请重新选择文件。' })
        return
      }

      sendJson(response, 400, { message: '项目文件上传失败，请稍后重试。' })
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

    for (const note of project.notes) {
      await removeUploadFile(note)
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

      const removedNotes = project.notes.filter((note) => idSet.has(note.id))
      for (const note of removedNotes) {
        await removeUploadFile(note)
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

async function serveUpload(request, response) {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname
  const relativeFilePath = pathname.slice('/uploads/'.length)
  const filePath = path.normalize(path.join(uploadsDir, relativeFilePath))

  if (!filePath.startsWith(uploadsDir)) {
    sendText(response, 403, 'Forbidden')
    return
  }

  try {
    const content = await readFile(filePath)
    response.writeHead(200, {
      'Content-Type': getFileMimeType(filePath),
      'Cache-Control': 'no-store',
    })
    response.end(content)
  } catch {
    sendText(response, 404, 'File not found.')
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

  if (request.url.startsWith('/uploads/')) {
    await serveUpload(request, response)
    return
  }

  await serveStatic(request, response)
})

server.listen(port, host, async () => {
  await ensureDb()
  console.log(`Server running at http://localhost:${port}`)

  const networkUrls = getNetworkUrls(port)
  if (networkUrls.length) {
    console.log('Available on your network:')
    for (const url of networkUrls) {
      console.log(`  ${url}`)
    }
  }
})
