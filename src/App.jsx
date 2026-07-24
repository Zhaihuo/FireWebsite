import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const TOKEN_KEY = 'firewebsite-auth-token'
const TEXT_EXTENSIONS = ['md', 'txt', 'json', 'html', 'css', 'js', 'jsx']
const TABLE_EXTENSIONS = ['csv', 'tsv']
const WORD_EXTENSIONS = ['doc', 'docx']
const EXCEL_EXTENSIONS = ['xls', 'xlsx']
const SUPPORTED_ACCEPT = [
  'image/*',
  '.txt',
  '.md',
  '.csv',
  '.tsv',
  '.json',
  '.html',
  '.css',
  '.js',
  '.jsx',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
].join(',')

const ARTICLE_AUTO_SAVE_DELAY_MS = 1200
const RICH_TEXT_FONT_OPTIONS = [
  { label: '杂志衬线', value: '"Palatino Linotype", "Georgia", "STSong", "Songti SC", serif' },
  { label: '现代无衬线', value: '"Segoe UI", "PingFang SC", "Microsoft YaHei UI", sans-serif' },
  { label: '书卷宋体', value: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", serif' },
  { label: '等宽记录', value: '"Cascadia Code", "Consolas", "Courier New", monospace' },
]

const RICH_TEXT_SIZE_OPTIONS = [
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '20', value: '20px' },
  { label: '24', value: '24px' },
]

const profile = {
  name: '翎羽晨风',
  role: '产品策划 / 交互体验 / 数据管理 / 视觉设计',
  intro: '把常用文件、项目文件和服务端存储整理成一个更接近博客后台的知识工作台。',
  location: '中国 · 远程',
  status: '当前站点支持登录、常用文件、项目管理、回收站管理、文件夹上传和服务端永久保存。',
}

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'
const APP_BUILD_TIME = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : new Date().toISOString()

const frontendPosts = [
  {
    title: '站点结构：多模块工作台',
    summary: '登录后进入站点体验、数据中心、常用文件、项目空间、笔记管理与回收站等独立页面，不再是单一长页堆叠。',
    tags: ['React', 'UI', 'Workspace'],
  },
  {
    title: '资料入口：文件与文件夹并行',
    summary: '常用文件页和项目页都支持上传单个文件，也支持上传整个文件夹，并保留原始文件夹层级。',
    tags: ['Upload', 'Folder', 'Files'],
  },
]

const backendPosts = [
  {
    title: '数据中心：账号与长期保存',
    summary: '所有账号、常用文件、项目和项目内文件统一保存在服务器，重新登录或更换电脑都能恢复。',
    tags: ['Auth', 'API', 'Storage'],
  },
  {
    title: '批量操作：一次确认，一次执行',
    summary: '批量删除、批量恢复和批量彻底删除都只弹出一次确认窗口，然后统一走服务端批量处理流程。',
    tags: ['Batch', 'Confirm', 'Server'],
  },
]

const frontendHighlights = [
  {
    label: '页面结构',
    value: '6 大模块',
    detail: '站点体验、数据中心、常用文件、笔记、项目与回收站清晰分区。',
  },
  {
    label: '上传体验',
    value: '双入口',
    detail: '同时支持单文件上传与文件夹上传，保留层级结构。',
  },
  {
    label: '交互方式',
    value: '批量操作',
    detail: '选择、下载、删除、恢复等动作都采用统一工具条与确认流程。',
  },
]

const backendHighlights = [
  {
    label: '数据存储',
    value: '服务端持久化',
    detail: '账号、文件、项目、笔记和附件统一写入服务端数据文件。',
  },
  {
    label: '权限状态',
    value: '登录隔离',
    detail: '每个账号都有独立的工作区数据，重新登录后可以继续使用。',
  },
  {
    label: '删除机制',
    value: '两段式',
    detail: '先进入回收站，再由用户确认后执行彻底删除。',
  },
]

const links = [
  { label: '代码仓库', href: 'https://github.com/' },
  { label: '邮箱', href: 'mailto:2948756447@qq.com' },
  { label: '项目管理', href: '#' },
]

const formatLabels = {
  image: '图片',
  table: '表格',
  text: '文本',
  data: '数据',
  pdf: 'PDF',
  excel: 'Excel',
  word: 'Word',
  file: '文件',
}

const beijingTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function formatBeijingTime(value) {
  if (!value) return '未知'

  const normalized = String(value).trim()
  if (!normalized) return '未知'

  const parsed = new Date(normalized)
  if (!Number.isNaN(parsed.getTime())) {
    return beijingTimeFormatter.format(parsed)
  }

  return normalized
}


const pageMeta = {
  frontend: {
    eyebrow: '站点体验',
    title: '站点体验区',
    description: '查看当前网站的页面组织、上传流程与整体使用体验。',
  },
  backend: {
    eyebrow: '数据中心',
    title: '数据中心',
    description: '查看账号、项目、常用文件与长期保存结构。',
  },
  notes: {
    eyebrow: '资料中心',
    title: '资料中心',
    description: '集中管理常用资料，支持上传、检索、预览与批量操作。',
  },
  writing: {
    eyebrow: '内容创作',
    title: '内容创作',
    description: '用于撰写、整理和沉淀内容，支持标题、摘要、正文、封面、标签与附件。',
  },
  projects: {
    eyebrow: '项目空间',
    title: '项目空间',
    description: '按项目归档资料与文件夹结构，方便长期分类管理与持续更新。',
  },
  trash: {
    eyebrow: '回收记录',
    title: '回收记录',
    description: '集中查看已移除内容，可恢复、下载或执行最终清理。',
  },
}

function createEmptyArticle() {
  return {
    id: '',
    title: '',
    summary: '',
    content: '',
    coverImage: '',
    tags: [],
    attachments: [],
    status: 'draft',
    createdAt: '',
    updatedAt: '',
  }
}

function parseTagInput(value) {
  return String(value || '')
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12)
}

function getExtension(fileName) {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

function getRelativePath(file) {
  return String(file.webkitRelativePath || '').replace(/\\/g, '/')
}

function getFolderPath(file) {
  const relativePath = getRelativePath(file)
  if (!relativePath.includes('/')) return ''
  return relativePath.split('/').slice(0, -1).join('/')
}

function getFileType(file) {
  const extension = getExtension(file.name)
  if (file.type.startsWith('image/')) return 'image'
  if (TABLE_EXTENSIONS.includes(extension)) return 'table'
  if (extension === 'pdf' || file.type === 'application/pdf') return 'pdf'
  if (EXCEL_EXTENSIONS.includes(extension)) return 'excel'
  if (WORD_EXTENSIONS.includes(extension)) return 'word'

  if (file.type.startsWith('text/') || TEXT_EXTENSIONS.includes(extension)) {
    return extension === 'json' ? 'data' : 'text'
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

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function buildDocumentSummary(file, type) {
  const typeNameMap = {
    pdf: 'PDF 文档',
    excel: 'Excel 表格',
    word: 'Word 文档',
    file: '文件',
  }

  return `${file.name} 已上传并保存。类型：${typeNameMap[type] || '文件'}，可在详情页中打开或下载原文件。`
}

async function createNoteFromFile(file) {
  const type = getFileType(file)
  const createdAt = formatBeijingTime(new Date().toISOString())

  const baseNote = {
    id: `${file.name}-${file.lastModified}`,
    title: file.name,
    type,
    size: getFileSize(file.size),
    createdAt,
    extension: getExtension(file.name),
    relativePath: getRelativePath(file),
    folderPath: getFolderPath(file),
    mimeType: file.type || 'application/octet-stream',
    preview: null,
    rows: [],
    sourceUrl: null,
    content: '',
  }

  if (type === 'image') {
    const preview = await readFileAsDataUrl(file)
    return {
      ...baseNote,
      preview,
      sourceUrl: preview,
      content: `${file.name} ${file.type} 图片 视觉素材`,
    }
  }

  if (['table', 'text', 'data'].includes(type)) {
    const content = await readFileAsText(file)
    return {
      ...baseNote,
      content,
      rows: type === 'table' ? parseTable(content, file.name) : [],
    }
  }

  const sourceUrl = await readFileAsDataUrl(file)
  return {
    ...baseNote,
    sourceUrl,
    content: buildDocumentSummary(file, type),
  }
}

function triggerFileDownload(fileName, href) {
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = fileName
  anchor.rel = 'noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}

function downloadNote(note) {
  if (note.sourceUrl) {
    triggerFileDownload(note.title, note.sourceUrl)
    return
  }

  const tableContent = note.rows?.length ? note.rows.map((row) => row.join('\t')).join('\n') : ''
  const content = note.content || tableContent || ''
  const blob = new Blob([content], { type: note.mimeType || 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  triggerFileDownload(note.title || `note-${note.id}.txt`, url)
  window.setTimeout(() => URL.revokeObjectURL(url), 800)
}

function buildArticleDownloadContent(article) {
  const tagsLine = Array.isArray(article.tags) && article.tags.length ? `标签：${article.tags.join(', ')}` : '标签：'
  const summaryLine = article.summary ? `摘要：\n${article.summary}` : '摘要：'
  const contentLine = article.content ? `正文：\n${stripHtml(article.content)}` : '正文：'

  return [`# ${article.title || '未命名笔记'}`, tagsLine, '', summaryLine, '', contentLine].join('\n')
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

function stripHtml(value) {
  return decodeHtmlEntities(
    String(value || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|blockquote)>/gi, '\n')
      .replace(/<li>/gi, '- ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function looksLikeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ''))
}

function contentToEditorHtml(value) {
  if (!value) return ''
  if (looksLikeHtml(value)) return String(value)
  return escapeHtml(value).replace(/\r?\n/g, '<br>')
}

function normalizeEditorHtml(value) {
  const normalized = String(value || '')
    .replace(/<div><br><\/div>/gi, '<br>')
    .replace(/<div>/gi, '<p>')
    .replace(/<\/div>/gi, '</p>')
    .replace(/<p><\/p>/gi, '')
    .trim()

  return stripHtml(normalized) ? normalized : ''
}

function buildArticleDraftFingerprint(article) {
  return JSON.stringify({
    id: article?.id || '',
    title: article?.title || '',
    summary: article?.summary || '',
    content: article?.content || '',
    coverImage: article?.coverImage || '',
    tags: Array.isArray(article?.tags) ? article.tags : [],
    status: article?.status || 'draft',
  })
}

function hasMeaningfulArticleContent(article) {
  return Boolean(
    String(article?.title || '').trim() ||
      String(article?.summary || '').trim() ||
      String(article?.content || '').trim() ||
      String(article?.coverImage || '').trim() ||
      (Array.isArray(article?.tags) && article.tags.length),
  )
}

function downloadArticle(article) {
  const blob = new Blob([buildArticleDownloadContent(article)], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const fileName = `${(article.title || '未命名笔记').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80) || '未命名笔记'}.md`
  triggerFileDownload(fileName, url)
  window.setTimeout(() => URL.revokeObjectURL(url), 800)
}

async function apiFetch(path, options = {}, token = null) {
  const headers = new Headers(options.headers || {})
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(path, {
    ...options,
    headers,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : {}

  if (!response.ok) {
    throw new Error(data.message || '请求失败，请稍后重试。')
  }

  return data
}

function buildUploadFormData(file, extraFields = {}) {
  const formData = new FormData()
  formData.append('file', file, file.name)
  formData.append('relativePath', getRelativePath(file))
  formData.append('folderPath', getFolderPath(file))

  for (const [key, value] of Object.entries(extraFields)) {
    formData.append(key, String(value))
  }

  return formData
}

function createFolderNode(name, fullPath = '') {
  return {
    name,
    fullPath,
    folders: new Map(),
    files: [],
  }
}

function buildFolderTree(notes) {
  const root = createFolderNode('根目录文件')

  for (const note of notes) {
    const relativePath = String(note.relativePath || '').replace(/\\/g, '/')
    const parts = relativePath.split('/').filter(Boolean)
    const folderParts = parts.length > 1 ? parts.slice(0, -1) : String(note.folderPath || '').replace(/\\/g, '/').split('/').filter(Boolean)
    let current = root

    for (const folderName of folderParts) {
      const nextPath = current.fullPath ? `${current.fullPath}/${folderName}` : folderName
      if (!current.folders.has(folderName)) {
        current.folders.set(folderName, createFolderNode(folderName, nextPath))
      }
      current = current.folders.get(folderName)
    }

    current.files.push(note)
  }

  function finalize(node) {
    return {
      ...node,
      folders: Array.from(node.folders.values())
        .map(finalize)
        .sort((left, right) => left.name.localeCompare(right.name)),
      files: [...node.files].sort((left, right) => String(left.title || '').localeCompare(String(right.title || ''))),
    }
  }

  return finalize(root)
}

function SelectionCheckbox({ checked, onChange, label }) {
  return (
    <label className="select-toggle" onClick={(event) => event.stopPropagation()}>
      <input type="checkbox" checked={checked} onChange={onChange} aria-label={label} />
      <span>选择</span>
    </label>
  )
}

function LoginScreen({
  authMode,
  credentials,
  isBooting,
  isSubmittingAuth,
  authMessage,
  onModeChange,
  onCredentialChange,
  onSubmit,
}) {
  return (
    <main className="login-shell">
      <section className="login-panel card">
        <div className="login-copy">
          <p className="eyebrow">火焰笔记</p>
          <h1>先登录，再进入你的项目与常用文件空间</h1>
          <p className="intro">登录后可管理常用文件、项目内文件和文件夹结构，数据会跟随账号永久保存到服务器。</p>
          <div className="status-strip">
            <span className="status-pill status-pill-strong">独立登录页</span>
            <span className="status-pill">项目管理页</span>
            <span className="status-pill">文件夹上传</span>
          </div>
        </div>

        <div className="login-card">
          <div className="auth-tabs">
            <button className={authMode === 'login' ? 'is-active' : ''} type="button" onClick={() => onModeChange('login')}>
              登录
            </button>
            <button className={authMode === 'register' ? 'is-active' : ''} type="button" onClick={() => onModeChange('register')}>
              注册
            </button>
          </div>

          <form className="auth-form" onSubmit={onSubmit}>
            <label>
              <span>用户名</span>
              <input
                value={credentials.username}
                onChange={(event) => onCredentialChange('username', event.target.value)}
                placeholder="至少 3 位"
                autoComplete="username"
              />
            </label>

            <label>
              <span>密码</span>
              <input
                type="password"
                value={credentials.password}
                onChange={(event) => onCredentialChange('password', event.target.value)}
                placeholder="至少 6 位"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>

            <div className="auth-actions">
              <button className="button button-primary" type="submit" disabled={isSubmittingAuth || isBooting}>
                {isSubmittingAuth ? '提交中...' : authMode === 'login' ? '登录账号' : '创建账号'}
              </button>
            </div>
          </form>

          <div className="auth-message">{isBooting ? '正在恢复登录状态...' : authMessage}</div>
        </div>
      </section>
    </main>
  )
}

function PostCard({ title, summary, tags, category }) {
  return (
    <article className="blog-post-card">
      <p className="post-category">{category}</p>
      <h3>{title}</h3>
      <p>{summary}</p>
      <div className="tag-list">
        {tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>
    </article>
  )
}

function InsightCard({ label, value, detail }) {
  return (
    <article className="insight-card">
      <p className="insight-label">{label}</p>
      <h3>{value}</h3>
      <p>{detail}</p>
    </article>
  )
}

function OverviewStrip({ items }) {
  return (
    <div className="overview-strip">
      {items.map((item) => (
        <InsightCard key={`${item.label}-${item.value}`} {...item} />
      ))}
    </div>
  )
}

function DocumentTeaser({ note }) {
  return (
    <div className={`document-teaser document-${note.type}`}>
      <strong>{formatLabels[note.type]}</strong>
      <span>{note.extension ? `.${note.extension}` : note.mimeType || '二进制文件'}</span>
      <small>点击查看详情或下载原文件</small>
    </div>
  )
}

function NoteCard({ note, isSelected = false, selectable = false, onToggleSelect, onOpen, onDelete }) {
  const showDocumentTeaser = ['pdf', 'excel', 'word', 'file'].includes(note.type)

  return (
    <article className={isSelected ? 'note-card is-selected' : 'note-card'}>
      {selectable ? (
        <div className="card-select-row">
          <SelectionCheckbox checked={isSelected} onChange={() => onToggleSelect(note.id)} label={`选择 ${note.title}`} />
        </div>
      ) : null}

      <button className="note-card-main" type="button" onClick={() => onOpen(note)}>
        <div className="note-card-head">
          <span className={`format-pill format-${note.type}`}>{formatLabels[note.type]}</span>
          <span>{note.size}</span>
        </div>

        <h3>{note.title}</h3>
        <p className="note-meta">{formatBeijingTime(note.createdAt)}</p>
        {note.folderPath ? <p className="note-path">文件夹：{note.folderPath}</p> : null}

        {note.preview ? <img className="note-image" src={note.preview} alt={note.title} /> : null}

        {note.rows?.length ? (
          <div className="table-preview compact-table-preview">
            <table>
              <tbody>
                {note.rows.map((row, rowIndex) => (
                  <tr key={`${note.id}-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={`${note.id}-${rowIndex}-${cellIndex}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!note.preview && !note.rows?.length && showDocumentTeaser ? <DocumentTeaser note={note} /> : null}

        {!note.preview && !note.rows?.length && !showDocumentTeaser ? (
          <p className="note-excerpt">
            {note.content?.slice(0, 170)}
            {note.content?.length > 170 ? '...' : ''}
          </p>
        ) : null}
      </button>

      <div className="note-card-footer">
        <span className="note-open-hint">点击打开完整内容</span>
        {onDelete ? (
          <button className="danger-link" type="button" onClick={() => onDelete(note)}>
            删除
          </button>
        ) : (
          <button className="small-action" type="button" onClick={() => downloadNote(note)}>
            下载
          </button>
        )}
      </div>
    </article>
  )
}

function TrashCard({ note, isSelected, onToggleSelect, onOpen, onRestore, onDeleteForever }) {
  return (
    <article className={isSelected ? 'trash-card is-selected' : 'trash-card'}>
      <div className="card-select-row">
        <SelectionCheckbox checked={isSelected} onChange={() => onToggleSelect(note.id)} label={`选择 ${note.title}`} />
      </div>

      <button className="trash-card-main" type="button" onClick={() => onOpen(note)}>
        <div className="note-card-head">
          <span className={`format-pill format-${note.type}`}>{formatLabels[note.type]}</span>
          <span>{note.size}</span>
        </div>
        <h3>{note.title}</h3>
        <p className="note-meta">删除时间：{formatBeijingTime(note.deletedAt)}</p>
        {note.folderPath ? <p className="note-path">文件夹：{note.folderPath}</p> : null}
      </button>

      <div className="trash-actions">
        <button className="small-action" type="button" onClick={() => onRestore(note)}>
          恢复
        </button>
        <button className="small-action danger-action" type="button" onClick={() => onDeleteForever(note)}>
          彻底删除
        </button>
      </div>
    </article>
  )
}

function DocumentDetail({ note }) {
  const isPdf = note.type === 'pdf' && note.sourceUrl

  return (
    <div className="document-detail">
      <div className="document-actions">
        {note.sourceUrl ? (
          <>
            <a className="modal-link" href={note.sourceUrl} target="_blank" rel="noreferrer">
              新窗口打开
            </a>
            <a className="modal-link" href={note.sourceUrl} download={note.title}>
              下载原文件
            </a>
          </>
        ) : null}
      </div>

      <div className="document-meta-card">
        <p>文件名：{note.title}</p>
        {note.folderPath ? <p>文件夹：{note.folderPath}</p> : null}
        <p>文件类型：{formatLabels[note.type]}</p>
        <p>扩展名：{note.extension ? `.${note.extension}` : '未知'}</p>
        <p>MIME：{note.mimeType || '未知'}</p>
      </div>

      {isPdf ? (
        <iframe className="pdf-frame" src={note.sourceUrl} title={note.title} />
      ) : (
        <pre className="note-full-text secondary-text">{note.content || '当前文件已上传，可通过上方按钮打开或下载。'}</pre>
      )}
    </div>
  )
}

function NoteModal({ note, onClose }) {
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    setZoom(1)
  }, [note])

  if (!note) return null

  const zoomPercent = Math.round(zoom * 100)
  const isDocument = ['pdf', 'excel', 'word', 'file'].includes(note.type)

  return (
    <div className="note-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="note-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="note-modal-head">
          <div>
            <span className={`format-pill format-${note.type}`}>{formatLabels[note.type]}</span>
            <h2>{note.title}</h2>
            <p className="note-meta">
              {formatBeijingTime(note.createdAt)} · {note.size}
            </p>
            {note.folderPath ? <p className="note-path">文件夹：{note.folderPath}</p> : null}
          </div>

          <div className="modal-actions">
            {!isDocument ? (
              <div className="zoom-controls">
                <button className="modal-control" type="button" onClick={() => setZoom((current) => Math.max(0.6, Number((current - 0.1).toFixed(2))))}>
                  -
                </button>
                <button className="modal-control zoom-readout" type="button" onClick={() => setZoom(1)}>
                  {zoomPercent}%
                </button>
                <button className="modal-control" type="button" onClick={() => setZoom((current) => Math.min(2, Number((current + 0.1).toFixed(2))))}>
                  +
                </button>
              </div>
            ) : null}
            <button className="modal-close" type="button" onClick={onClose}>
              关闭
            </button>
          </div>
        </div>

        <div className="note-modal-body">
          {note.preview ? (
            <div className="note-modal-image-wrap">
              <img className="note-modal-image" src={note.preview} alt={note.title} style={{ '--detail-zoom': zoom }} />
            </div>
          ) : null}

          {note.rows?.length ? (
            <div className="table-preview table-preview-full detail-zoomable" style={{ '--detail-zoom': zoom }}>
              <table>
                <tbody>
                  {note.rows.map((row, rowIndex) => (
                    <tr key={`${note.id}-full-${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={`${note.id}-full-${rowIndex}-${cellIndex}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {!note.preview && !note.rows?.length && isDocument ? <DocumentDetail note={note} /> : null}

          {!note.preview && !note.rows?.length && !isDocument ? (
            <pre className="note-full-text detail-zoomable" style={{ '--detail-zoom': zoom }}>
              {note.content || '没有可显示的正文内容。'}
            </pre>
          ) : null}

          {note.preview && note.content ? (
            <pre className="note-full-text secondary-text detail-zoomable" style={{ '--detail-zoom': zoom }}>
              {note.content}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({ config, isWorking, onCancel, onConfirm }) {
  const [password, setPassword] = useState('')

  useEffect(() => {
    setPassword('')
  }, [config])

  if (!config) return null

  return (
    <div className="confirm-backdrop" role="presentation" onClick={onCancel}>
      <div className="confirm-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h3>{config.title}</h3>
        <p>{config.description}</p>
        {config.requirePassword ? (
          <label className="confirm-field">
            <span>请输入登录密码确认删除</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="输入当前账号密码"
              autoComplete="current-password"
            />
          </label>
        ) : null}
        <div className="confirm-actions">
          <button className="small-action" type="button" onClick={onCancel} disabled={isWorking}>
            取消
          </button>
          <button
            className="small-action danger-action"
            type="button"
            onClick={() => onConfirm({ password })}
            disabled={isWorking || (config.requirePassword && !password.trim())}
          >
            {isWorking ? '处理中...' : config.confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

function BatchToolbar({
  totalCount,
  selectedCount,
  allSelected,
  onSelectAllToggle,
  onClearSelection,
  onDownload,
  onPrimaryAction,
  onSecondaryAction,
  primaryLabel,
  secondaryLabel,
}) {
  return (
    <div className="batch-toolbar">
      <div className="batch-toolbar-left">
        <SelectionCheckbox checked={allSelected && totalCount > 0} onChange={onSelectAllToggle} label="全选当前列表" />
        <span className="batch-count">
          已选 {selectedCount} / {totalCount}
        </span>
      </div>

      <div className="batch-toolbar-actions">
        <button className="small-action" type="button" onClick={onDownload} disabled={!selectedCount}>
          批量下载
        </button>
        {secondaryLabel ? (
          <button className="small-action" type="button" onClick={onSecondaryAction} disabled={!selectedCount}>
            {secondaryLabel}
          </button>
        ) : null}
        <button className="small-action danger-action" type="button" onClick={onPrimaryAction} disabled={!selectedCount}>
          {primaryLabel}
        </button>
        <button className="small-action" type="button" onClick={onClearSelection} disabled={!selectedCount}>
          清空选择
        </button>
      </div>
    </div>
  )
}

function FolderTreeNode({ node, depth = 0, selectedIds, onToggleSelect, onOpenNote, onDeleteRequest = null, isRoot = false }) {
  const [isOpen, setIsOpen] = useState(true)
  const hasFolders = node.folders.length > 0
  const hasFiles = node.files.length > 0
  const isEmpty = !hasFolders && !hasFiles

  if (isRoot) {
    return (
      <div className="folder-tree">
        {hasFiles ? (
          <section className="folder-section">
            <div className="folder-section-head">
              <div>
                <p className="folder-section-kicker">直接上传</p>
                <h3>根目录文件</h3>
              </div>
              <span>{node.files.length} 个文件</span>
            </div>

            <div className="notes-feed">
              {node.files.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isSelected={selectedIds.includes(note.id)}
                  selectable
                  onToggleSelect={onToggleSelect}
                  onOpen={onOpenNote}
                  onDelete={onDeleteRequest}
                />
              ))}
            </div>
          </section>
        ) : null}

        {node.folders.map((folder) => (
          <FolderTreeNode
            key={folder.fullPath}
            node={folder}
            depth={0}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onOpenNote={onOpenNote}
            onDeleteRequest={onDeleteRequest}
          />
        ))}
      </div>
    )
  }

  if (isEmpty) return null

  return (
    <section className="folder-section folder-tree-branch" style={{ '--folder-depth': depth }}>
      <button className="folder-section-head folder-toggle" type="button" onClick={() => setIsOpen((current) => !current)}>
        <div>
          <p className="folder-section-kicker">{depth === 0 ? '文件夹上传' : '子文件夹'}</p>
          <h3>{node.name}</h3>
        </div>
        <span>{isOpen ? '收起' : '展开'} · {node.files.length + node.folders.length} 项</span>
      </button>

      {isOpen ? (
        <div className="folder-tree-children">
          {hasFiles ? (
            <div className="notes-feed">
              {node.files.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isSelected={selectedIds.includes(note.id)}
                  selectable
                  onToggleSelect={onToggleSelect}
                  onOpen={onOpenNote}
                  onDelete={onDeleteRequest}
                />
              ))}
            </div>
          ) : null}

          {node.folders.map((folder) => (
            <FolderTreeNode
              key={folder.fullPath}
              node={folder}
              depth={depth + 1}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onOpenNote={onOpenNote}
              onDeleteRequest={onDeleteRequest}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function FolderNoteSections({ tree, selectedIds, onToggleSelect, onOpenNote, onDeleteRequest = null }) {
  return (
    <FolderTreeNode
      node={tree}
      isRoot
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onOpenNote={onOpenNote}
      onDeleteRequest={onDeleteRequest}
    />
  )
}

function UploadFolderInput({ disabled, onChange, copy, small }) {
  return (
    <label className="upload-zone folder-upload-zone">
      <input type="file" multiple webkitdirectory="" directory="" disabled={disabled} onChange={onChange} />
      <span className="upload-icon folder-upload-icon">□</span>
      <span className="upload-copy">
        <strong>{copy}</strong>
        <small>{small}</small>
      </span>
    </label>
  )
}

function UploadFileInput({ disabled, onChange, copy, small }) {
  return (
    <label className="upload-zone">
      <input type="file" multiple disabled={disabled} accept={SUPPORTED_ACCEPT} onChange={onChange} />
      <span className="upload-icon">+</span>
      <span className="upload-copy">
        <strong>{copy}</strong>
        <small>{small}</small>
      </span>
    </label>
  )
}

function FrontendView({ notesCount, projectsCount, articlesCount }) {
  const overviewItems = [
    { label: '当前文件', value: `${notesCount} 份`, detail: '常用文件区可直接查看、批量选择、下载或删除。' },
    { label: '当前项目', value: `${projectsCount} 个`, detail: '项目页按空间管理资料，适合长期分类沉淀。' },
    { label: '当前笔记', value: `${articlesCount} 篇`, detail: '笔记管理页支持长文编辑、附件、预览与自动保存。' },
  ]

  return (
    <section className="blog-section card section-frontend">
      <div className="section-head">
        <div>
          <p className="eyebrow">站点体验</p>
          <h2>站点体验区</h2>
        </div>
        <span>聚焦页面组织、导航逻辑与资料上传体验</span>
      </div>

      <OverviewStrip items={overviewItems} />

      <div className="insight-grid">
        {frontendHighlights.map((item) => (
          <InsightCard key={item.label} {...item} />
        ))}
      </div>

      <div className="blog-post-list">
        {frontendPosts.map((post) => (
          <PostCard key={post.title} {...post} category="体验专题" />
        ))}
      </div>
    </section>
  )
}

function BackendView({ notesCount, projectsCount, articlesCount }) {
  const overviewItems = [
    { label: '数据文件', value: '1 份核心库', detail: '当前所有账号与内容都沉淀在 data/db.json 中。' },
    { label: '内容规模', value: `${notesCount + projectsCount + articlesCount}`, detail: '文件、项目和笔记共同组成你的个人资料库。' },
    { label: '回收机制', value: '先回收后删除', detail: '危险操作统一通过确认弹窗和回收站中转。' },
  ]

  return (
    <section className="blog-section card section-backend">
      <div className="section-head">
        <div>
          <p className="eyebrow">数据中心</p>
          <h2>数据中心</h2>
        </div>
        <span>聚焦登录状态、内容存储、项目资料与长期保存</span>
      </div>

      <OverviewStrip items={overviewItems} />

      <div className="insight-grid">
        {backendHighlights.map((item) => (
          <InsightCard key={item.label} {...item} />
        ))}
      </div>

      <div className="blog-post-list">
        {backendPosts.map((post) => (
          <PostCard key={post.title} {...post} category="系统专题" />
        ))}
      </div>
    </section>
  )
}

function WritingView({
  articles,
  activeArticleId,
  articleDraft,
  articleQuery,
  articleAutoSaveLabel,
  selectedArticleIds,
  isSavingArticle,
  isUploadingArticleAssets,
  serverMessage,
  onArticleQueryChange,
  onSelectArticle,
  onCreateArticle,
  onArticleFieldChange,
  onSaveArticle,
  onPublishArticle,
  onDeleteArticle,
  onToggleArticleSelect,
  onToggleAllArticles,
  onClearArticleSelection,
  onBatchDownloadArticles,
  onBatchDeleteArticles,
  onUploadCover,
  onUploadAttachments,
  onOpenAttachment,
  onDeleteAttachment,
}) {
  const editorRef = useRef(null)
  const filteredArticles = useMemo(() => {
    const keyword = articleQuery.trim().toLowerCase()
    if (!keyword) return articles

    return articles.filter((article) =>
      [article.title, article.summary, article.content, (article.tags || []).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    )
  }, [articles, articleQuery])

  const articleCountLabel = `${articles.length} 篇笔记`
  const attachmentCount = Array.isArray(articleDraft.attachments) ? articleDraft.attachments.length : 0
  const allSelected = filteredArticles.length > 0 && filteredArticles.every((article) => selectedArticleIds.includes(article.id))
  const [typographyStyle, setTypographyStyle] = useState({
    fontPreset: 'editorial',
    fontSize: '18px',
    colorPreset: 'ink',
  })

  const fontPresetMap = {
    editorial: {
      label: '杂志感',
      editorFont: '"Palatino Linotype", "Georgia", "STSong", "Songti SC", serif',
      previewFont: '"Palatino Linotype", "Georgia", "STSong", "Songti SC", serif',
      titleFont: '"Georgia", "Times New Roman", "Songti SC", serif',
      lineHeight: '2',
    },
    modern: {
      label: '现代感',
      editorFont: '"Segoe UI", "PingFang SC", "Microsoft YaHei UI", sans-serif',
      previewFont: '"Segoe UI", "PingFang SC", "Microsoft YaHei UI", sans-serif',
      titleFont: '"Segoe UI", "PingFang SC", "Microsoft YaHei UI", sans-serif',
      lineHeight: '1.9',
    },
    classic: {
      label: '书卷感',
      editorFont: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", serif',
      previewFont: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", serif',
      titleFont: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", serif',
      lineHeight: '2.06',
    },
  }

  const colorPresetMap = {
    ink: {
      label: '墨黑',
      text: '#20293a',
      summary: '#5d6574',
      panel: 'rgba(255, 255, 255, 0.92)',
    },
    pine: {
      label: '松青',
      text: '#1f3a34',
      summary: '#59706a',
      panel: 'rgba(246, 251, 249, 0.94)',
    },
    plum: {
      label: '梅灰',
      text: '#3d3042',
      summary: '#76687a',
      panel: 'rgba(251, 247, 251, 0.94)',
    },
  }

  const activeFontPreset = fontPresetMap[typographyStyle.fontPreset] || fontPresetMap.editorial
  const activeColorPreset = colorPresetMap[typographyStyle.colorPreset] || colorPresetMap.ink
  const editorHtml = contentToEditorHtml(articleDraft.content)
  const writingTypographyStyle = {
    '--writing-editor-font-active': activeFontPreset.editorFont,
    '--writing-preview-font-active': activeFontPreset.previewFont,
    '--writing-title-font-active': activeFontPreset.titleFont,
    '--writing-font-size-active': typographyStyle.fontSize,
    '--writing-line-height-active': activeFontPreset.lineHeight,
    '--writing-text-color-active': activeColorPreset.text,
    '--writing-summary-color-active': activeColorPreset.summary,
    '--writing-panel-tint-active': activeColorPreset.panel,
  }

  useEffect(() => {
    if (!editorRef.current) return

    const nextHtml = editorHtml
    if (editorRef.current.innerHTML !== nextHtml) {
      editorRef.current.innerHTML = nextHtml
    }
  }, [editorHtml])

  useEffect(() => {
    if (typeof document !== 'undefined' && document.queryCommandSupported?.('styleWithCSS')) {
      document.execCommand('styleWithCSS', false, true)
    }
  }, [])

  function focusEditor() {
    editorRef.current?.focus()
  }

  function handleEditorInput(event) {
    onArticleFieldChange('content', normalizeEditorHtml(event.currentTarget.innerHTML))
  }

  function applyRichTextCommand(command, value = null) {
    focusEditor()
    document.execCommand('styleWithCSS', false, true)
    document.execCommand(command, false, value)
    onArticleFieldChange('content', normalizeEditorHtml(editorRef.current?.innerHTML || ''))
  }

  function handleFontFamilyChange(value) {
    applyRichTextCommand('fontName', value)
  }

  function handleFontSizeChange(value) {
    applyRichTextCommand('fontSize', '7')
    const selection = window.getSelection()
    if (!selection?.anchorNode || !editorRef.current) {
      onArticleFieldChange('content', normalizeEditorHtml(editorRef.current?.innerHTML || ''))
      return
    }

    const root = selection.anchorNode.nodeType === Node.ELEMENT_NODE ? selection.anchorNode : selection.anchorNode.parentElement
    const fontNode = root?.closest?.('font[size="7"]')
    if (fontNode) {
      const span = document.createElement('span')
      span.style.fontSize = value
      span.innerHTML = fontNode.innerHTML
      fontNode.replaceWith(span)
    }

    onArticleFieldChange('content', normalizeEditorHtml(editorRef.current?.innerHTML || ''))
  }

  function handleTextColorChange(value) {
    applyRichTextCommand('foreColor', value)
  }

  function handleClearFormatting() {
    applyRichTextCommand('removeFormat')
  }

  return (
    <section className="blog-section card section-writing" style={writingTypographyStyle}>
      <div className="section-head">
        <div>
          <p className="eyebrow">内容创作</p>
          <h2>内容创作</h2>
        </div>
        <span>围绕主题写作、整理观点，并把内容沉淀为可持续复用的笔记资产。</span>
      </div>

      <div className="writing-layout">
        <aside className="writing-sidebar">
          <div className="writing-sidebar-head">
            <button className="button button-primary" type="button" onClick={onCreateArticle}>
              新建笔记
            </button>
            <span className="sidebar-text">{articleCountLabel}</span>
          </div>

          <label className="search-box writing-search-box">
            <span>搜索笔记</span>
            <input
              type="search"
              value={articleQuery}
              placeholder="标题、摘要、标签、正文"
              onChange={(event) => onArticleQueryChange(event.target.value)}
            />
          </label>

          <BatchToolbar
            totalCount={filteredArticles.length}
            selectedCount={selectedArticleIds.length}
            allSelected={allSelected}
            onSelectAllToggle={onToggleAllArticles}
            onClearSelection={onClearArticleSelection}
            onDownload={onBatchDownloadArticles}
            onPrimaryAction={onBatchDeleteArticles}
            primaryLabel="批量删除"
          />

          <div className="writing-list">
            {filteredArticles.map((article) => (
              <article key={article.id} className={article.id === activeArticleId ? 'writing-card is-active' : 'writing-card'}>
                <div className="card-select-row">
                  <SelectionCheckbox
                    checked={selectedArticleIds.includes(article.id)}
                    onChange={() => onToggleArticleSelect(article.id)}
                    label={`选择 ${article.title || '未命名笔记'}`}
                  />
                </div>

                <button className="writing-card-main" type="button" onClick={() => onSelectArticle(article.id)}>
                  <div className="writing-card-meta">
                    <span className={`status-dot status-${article.status}`}>{article.status === 'published' ? '已发布' : '草稿'}</span>
                    <span>{formatBeijingTime(article.updatedAt || article.createdAt)}</span>
                  </div>
                  <h3>{article.title || '未命名笔记'}</h3>
                  <p>{article.summary || '暂无摘要，开始编辑后这里会显示这篇笔记的简介。'}</p>
                </button>
              </article>
            ))}

            {!filteredArticles.length ? <div className="empty-state">还没有匹配的笔记，先新建一篇。</div> : null}
          </div>
        </aside>

        <div className="writing-editor">
          <div className="writing-editor-top">
            <div>
              <p className="eyebrow">编辑区</p>
              <h3>{articleDraft.id ? '正在编辑笔记' : '新建笔记'}</h3>
            </div>

            <div className="writing-actions">
              <button className="small-action" type="button" onClick={onSaveArticle} disabled={isSavingArticle}>
                {isSavingArticle ? '保存中...' : '保存草稿'}
              </button>
              <button className="small-action danger-action" type="button" onClick={onPublishArticle} disabled={isSavingArticle}>
                发布
              </button>
              <button className="small-action" type="button" onClick={onDeleteArticle} disabled={!articleDraft.id || isSavingArticle}>
                删除
              </button>
            </div>
          </div>

          <section className="writing-style-panel card-lite">
            <div className="writing-style-panel-head">
              <div>
                <p className="eyebrow">排版控制</p>
                <h3>文字样式</h3>
              </div>
              <span>同步作用于编辑区与预览区</span>
            </div>

            <div className="writing-style-grid">
              <label className="writing-style-field">
                <span>字体风格</span>
                <select
                  value={typographyStyle.fontPreset}
                  onChange={(event) => setTypographyStyle((current) => ({ ...current, fontPreset: event.target.value }))}
                >
                  {Object.entries(fontPresetMap).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="writing-style-field">
                <span>字号大小</span>
                <select
                  value={typographyStyle.fontSize}
                  onChange={(event) => setTypographyStyle((current) => ({ ...current, fontSize: event.target.value }))}
                >
                  <option value="16px">紧凑</option>
                  <option value="18px">舒适</option>
                  <option value="20px">宽松</option>
                  <option value="22px">阅读感</option>
                </select>
              </label>

              <div className="writing-style-field">
                <span>文字色调</span>
                <div className="writing-tone-row">
                  {Object.entries(colorPresetMap).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      className={typographyStyle.colorPreset === key ? 'tone-chip is-active' : 'tone-chip'}
                      onClick={() => setTypographyStyle((current) => ({ ...current, colorPreset: key }))}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="writing-cover card-lite">
            <div className="writing-cover-preview">
              {articleDraft.coverImage ? <img src={articleDraft.coverImage} alt={articleDraft.title || '笔记封面'} /> : <div className="cover-placeholder">封面预览</div>}
            </div>
            <div className="writing-cover-fields">
              <label>
                <span>封面图地址</span>
                <input
                  value={articleDraft.coverImage}
                  placeholder="https://..."
                  onChange={(event) => onArticleFieldChange('coverImage', event.target.value)}
                />
              </label>
              <label className="upload-zone cover-upload-zone">
                <input type="file" accept="image/*" onChange={onUploadCover} />
                <span className="upload-icon">+</span>
                <span className="upload-copy">
                  <strong>上传封面</strong>
                  <small>支持本地图片直接作为封面</small>
                </span>
              </label>
            </div>
          </div>

          <div className="writing-form-grid">
            <label className="writing-field writing-title-field">
              <span>标题</span>
              <input
                className="writing-title-input"
                value={articleDraft.title}
                placeholder="请输入一篇像博客文章一样的标题"
                onChange={(event) => onArticleFieldChange('title', event.target.value)}
              />
            </label>

            <label className="writing-field">
              <span>摘要</span>
              <textarea
                value={articleDraft.summary}
                rows={4}
                placeholder="用 2-4 句话概括这篇笔记想表达什么"
                onChange={(event) => onArticleFieldChange('summary', event.target.value)}
              />
            </label>

            <label className="writing-field">
              <span>标签</span>
              <input
                value={(articleDraft.tags || []).join(', ')}
                placeholder="随笔, 方案整理, 项目总结"
                onChange={(event) => onArticleFieldChange('tags', parseTagInput(event.target.value))}
              />
            </label>

            <div className="writing-chip-row">
              {(articleDraft.tags || []).map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="writing-compose-grid">
            <label className="writing-field">
              <span>正文</span>
              <div className="writing-rich-toolbar">
                <button className="small-action" type="button" onClick={() => applyRichTextCommand('bold')}>
                  加粗
                </button>
                <button className="small-action" type="button" onClick={() => applyRichTextCommand('italic')}>
                  斜体
                </button>
                <button className="small-action" type="button" onClick={() => applyRichTextCommand('underline')}>
                  下划线
                </button>
                <label className="inline-style-control">
                  <span>字体</span>
                  <select onChange={(event) => handleFontFamilyChange(event.target.value)} defaultValue="">
                    <option value="" disabled>
                      选择字体
                    </option>
                    {RICH_TEXT_FONT_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="inline-style-control">
                  <span>字号</span>
                  <select onChange={(event) => handleFontSizeChange(event.target.value)} defaultValue="">
                    <option value="" disabled>
                      选择字号
                    </option>
                    {RICH_TEXT_SIZE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="inline-style-control inline-color-control">
                  <span>颜色</span>
                  <input type="color" defaultValue="#20293a" onChange={(event) => handleTextColorChange(event.target.value)} />
                </label>
                <button className="small-action" type="button" onClick={handleClearFormatting}>
                  清除样式
                </button>
              </div>
              <div
                ref={editorRef}
                className="writing-editor-textarea writing-rich-editor"
                contentEditable
                suppressContentEditableWarning
                data-placeholder="像写博客一样输入正文，可记录方案、过程、经验和结果。"
                onInput={handleEditorInput}
              />
            </label>

            <section className="writing-preview card-lite">
              <div className="writing-preview-head">
                <p className="eyebrow">实时预览</p>
                <span>{articleDraft.status === 'published' ? '发布视图' : '草稿视图'}</span>
              </div>
              <h2>{articleDraft.title || '未命名笔记'}</h2>
              <p className="writing-preview-summary">{articleDraft.summary || '这里会显示笔记摘要。'}</p>
              {articleDraft.content ? (
                <div className="writing-preview-body" dangerouslySetInnerHTML={{ __html: editorHtml }} />
              ) : (
                <div className="writing-preview-body writing-preview-placeholder">这里会实时预览正文内容。</div>
              )}
            </section>
          </div>

          <section className="writing-assets card-lite">
            <div className="writing-assets-head">
              <div>
                <p className="eyebrow">附件</p>
                <h3>附件资源</h3>
              </div>
              <span>{attachmentCount} 个附件</span>
            </div>

            <label className="upload-zone">
              <input type="file" multiple disabled={isUploadingArticleAssets} onChange={onUploadAttachments} />
              <span className="upload-icon">+</span>
              <span className="upload-copy">
                <strong>{isUploadingArticleAssets ? '上传附件中...' : '上传附件到当前笔记'}</strong>
                <small>支持图片、文档、表格、压缩包等素材</small>
              </span>
            </label>

            <div className="writing-attachment-list">
              {(articleDraft.attachments || []).map((attachment) => (
                <div key={attachment.id} className="writing-attachment-item">
                  <button className="writing-attachment-main" type="button" onClick={() => onOpenAttachment(attachment)}>
                    <strong>{attachment.title}</strong>
                    <span>{attachment.size}</span>
                  </button>
                  <div className="writing-attachment-actions">
                    <button className="small-action" type="button" onClick={() => onOpenAttachment(attachment)}>
                      预览
                    </button>
                    <button className="small-action danger-action" type="button" onClick={() => onDeleteAttachment(attachment)}>
                      删除
                    </button>
                  </div>
                </div>
              ))}

              {!attachmentCount ? <div className="empty-state">保存笔记后即可上传附件，适合挂设计稿、PDF、表格和截图。</div> : null}
            </div>
          </section>

          <div className="note-stats">
            <span>{serverMessage}</span>
            <span>{articleAutoSaveLabel || '自动保存未开始。'}</span>
            <span>状态：{articleDraft.status === 'published' ? '已发布' : '草稿'}</span>
            <span>更新时间：{formatBeijingTime(articleDraft.updatedAt || articleDraft.createdAt)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function NotesView({
  activeNotes,
  filteredNotes,
  selectedIds,
  isUploading,
  query,
  serverMessage,
  onQueryChange,
  onUpload,
  onUploadFolder,
  onOpenNote,
  onDeleteRequest,
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  onBatchDownload,
  onBatchDelete,
}) {
  const allSelected = filteredNotes.length > 0 && filteredNotes.every((note) => selectedIds.includes(note.id))
  const folderTree = useMemo(() => buildFolderTree(filteredNotes), [filteredNotes])

  return (
    <section className="blog-section card section-notes">
      <div className="section-head">
        <div>
          <p className="eyebrow">资料中心</p>
          <h2>资料中心</h2>
        </div>
        <span>集中整理日常资料，支持上传、搜索、预览与批量管理</span>
      </div>

      <div className="notes-toolbar">
        <div className="upload-stack">
          <UploadFileInput
            disabled={isUploading}
            onChange={onUpload}
            copy={isUploading ? '正在读取并上传...' : '上传文件到常用文件区'}
            small="支持图片、PDF、Excel、Word、TXT、Markdown、CSV/TSV 和 JSON"
          />
          <UploadFolderInput
            disabled={isUploading}
            onChange={onUploadFolder}
            copy={isUploading ? '正在上传文件夹...' : '上传整个文件夹'}
            small="会保留文件夹层级，文件夹里的文件会一起进入常用文件区"
          />
        </div>

        <label className="search-box">
          <span>搜索内容</span>
          <input
            type="search"
            value={query}
            placeholder="输入标题、正文、扩展名、格式或文件夹名..."
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
      </div>

      <BatchToolbar
        totalCount={filteredNotes.length}
        selectedCount={selectedIds.length}
        allSelected={allSelected}
        onSelectAllToggle={onToggleSelectAll}
        onClearSelection={onClearSelection}
        onDownload={onBatchDownload}
        onPrimaryAction={onBatchDelete}
        primaryLabel="批量删除"
      />

      <div className="note-stats">
        <span>{activeNotes.length} 份正常资料</span>
        <span>{filteredNotes.length} 条匹配结果</span>
        <span>{serverMessage}</span>
      </div>

      <FolderNoteSections
        tree={folderTree}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onOpenNote={onOpenNote}
        onDeleteRequest={onDeleteRequest}
      />
    </section>
  )
}

function ProjectsView({
  projects,
  projectQuery,
  projectName,
  activeProjectId,
  selectedIds,
  isUploadingProject,
  onProjectQueryChange,
  onProjectNameChange,
  onCreateProject,
  onSelectProject,
  onUploadToProject,
  onUploadFolderToProject,
  onOpenNote,
  onDeleteProjectRequest,
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  onBatchDownload,
  onBatchDelete,
}) {
  const filteredProjects = useMemo(() => {
    const keyword = projectQuery.trim().toLowerCase()
    if (!keyword) return projects
    return projects.filter((project) => project.name.toLowerCase().includes(keyword))
  }, [projects, projectQuery])

  const activeProject = projects.find((project) => project.id === activeProjectId) || filteredProjects[0] || null
  const activeProjectNotes = useMemo(() => activeProject?.notes || [], [activeProject])
  const allSelected = activeProjectNotes.length > 0 && activeProjectNotes.every((note) => selectedIds.includes(note.id))
  const activeProjectTree = useMemo(() => buildFolderTree(activeProjectNotes), [activeProjectNotes])

  return (
    <section className="blog-section card section-projects">
      <div className="section-head">
        <div>
          <p className="eyebrow">项目空间</p>
          <h2>项目空间</h2>
        </div>
        <span>围绕项目归档资料与目录结构，方便持续迭代和长期沉淀</span>
      </div>

      <div className="project-topbar">
        <form className="project-create-form" onSubmit={onCreateProject}>
          <input value={projectName} onChange={(event) => onProjectNameChange(event.target.value)} placeholder="输入新的项目名称..." />
          <button className="button button-primary" type="submit">
            创建项目
          </button>
        </form>

        <label className="search-box project-search-box">
          <span>搜索项目名称</span>
          <input type="search" value={projectQuery} placeholder="输入项目名..." onChange={(event) => onProjectQueryChange(event.target.value)} />
        </label>
      </div>

      <div className="project-layout">
        <div className="project-list">
          {filteredProjects.map((project) => (
            <button
              key={project.id}
              className={project.id === activeProject?.id ? 'project-card is-active' : 'project-card'}
              type="button"
              onClick={() => onSelectProject(project.id)}
            >
              <p className="post-category">项目</p>
              <h3>{project.name}</h3>
              <p>{project.notes.length} 个文件</p>
            </button>
          ))}

          {!filteredProjects.length ? <div className="empty-state">当前没有匹配的项目名称。</div> : null}
        </div>

        <div className="project-detail">
          {activeProject ? (
            <>
              <div className="project-detail-head">
                <div>
                  <p className="eyebrow">当前项目</p>
                  <h3>{activeProject.name}</h3>
                  <p className="sidebar-text">{activeProject.notes.length} 个已上传文件</p>
                  <div className="note-card-footer">
                    <button className="small-action danger-action" type="button" onClick={() => onDeleteProjectRequest(activeProject)}>
                      删除项目
                    </button>
                  </div>
                </div>

                <div className="upload-stack">
                  <UploadFileInput
                    disabled={isUploadingProject}
                    onChange={onUploadToProject}
                    copy={isUploadingProject ? '上传中...' : '上传到当前项目'}
                    small="支持 TXT、Excel、Word、PDF、图片等格式"
                  />
                  <UploadFolderInput
                    disabled={isUploadingProject}
                    onChange={onUploadFolderToProject}
                    copy={isUploadingProject ? '上传中...' : '上传项目文件夹'}
                    small="会保留项目内原始文件夹层级"
                  />
                </div>
              </div>

              <BatchToolbar
                totalCount={activeProjectNotes.length}
                selectedCount={selectedIds.length}
                allSelected={allSelected}
                onSelectAllToggle={onToggleSelectAll}
                onClearSelection={onClearSelection}
                onDownload={onBatchDownload}
                onPrimaryAction={onBatchDelete}
                primaryLabel="批量删除"
              />

              <FolderNoteSections
                tree={activeProjectTree}
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
                onOpenNote={onOpenNote}
              />

              {!activeProject.notes.length ? <div className="empty-state">这个项目里还没有文件，先上传一份试试。</div> : null}
            </>
          ) : (
            <div className="empty-state">先创建一个项目，或从左侧选择已有项目。</div>
          )}
        </div>
      </div>
    </section>
  )
}

function TrashView({
  activeNotes,
  trashedNotes,
  selectedIds,
  onOpenNote,
  onRestoreRequest,
  onDeleteForeverRequest,
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  onBatchDownload,
  onBatchRestore,
  onBatchDeleteForever,
}) {
  const allSelected = trashedNotes.length > 0 && trashedNotes.every((note) => selectedIds.includes(note.id))

  return (
    <section className="blog-section card section-trash">
      <div className="section-head">
        <div>
          <p className="eyebrow">回收记录</p>
          <h2>回收记录</h2>
        </div>
        <span>统一查看已移除内容，支持恢复、导出与最终清理</span>
      </div>

      <BatchToolbar
        totalCount={trashedNotes.length}
        selectedCount={selectedIds.length}
        allSelected={allSelected}
        onSelectAllToggle={onToggleSelectAll}
        onClearSelection={onClearSelection}
        onDownload={onBatchDownload}
        onPrimaryAction={onBatchDeleteForever}
        onSecondaryAction={onBatchRestore}
        primaryLabel="批量彻底删除"
        secondaryLabel="批量恢复"
      />

      <div className="note-stats">
        <span>{trashedNotes.length} 份已删除资料</span>
        <span>常用文件 {activeNotes.length} 份</span>
        <span>只有在这里再次删除，文件才会彻底消失</span>
      </div>

      <div className="trash-grid">
        {trashedNotes.map((note) => (
          <TrashCard
            key={note.id}
            note={note}
            isSelected={selectedIds.includes(note.id)}
            onToggleSelect={onToggleSelect}
            onOpen={onOpenNote}
            onRestore={onRestoreRequest}
            onDeleteForever={onDeleteForeverRequest}
          />
        ))}
      </div>
    </section>
  )
}

function SidebarPanel({ activePage, session, activeNotes, trashedNotes, projects }) {
  if (activePage === 'writing') {
    return (
      <>
        <section className="sidebar-card card">
          <p className="eyebrow">创作区</p>
          <h3>内容工作台</h3>
          <p className="sidebar-text">围绕主题组织标题、摘要、正文、封面与附件，形成可持续沉淀的内容。</p>
          <p className="sidebar-text">当前账号：{session.username}</p>
        </section>

        <section className="sidebar-card card">
          <p className="eyebrow">写作建议</p>
          <h3>内容结构建议</h3>
          <ul className="sidebar-list">
            <li>标题突出主题和结果</li>
            <li>摘要先写结论与价值</li>
            <li>正文按问题、过程、结果展开</li>
            <li>附件可补设计稿、文档、截图</li>
          </ul>
        </section>
      </>
    )
  }

  if (activePage === 'projects') {
    return (
      <>
        <section className="sidebar-card card">
          <p className="eyebrow">项目空间</p>
          <h3>空间概览</h3>
          <p className="sidebar-text">项目数量：{projects.length}</p>
          <p className="sidebar-text">当前账号：{session.username}</p>
          <p className="sidebar-text">每个项目都有自己的文件和文件夹内容。</p>
        </section>

        <section className="sidebar-card card">
          <p className="eyebrow">支持内容</p>
          <h3>空间内可归档</h3>
          <ul className="sidebar-list">
            <li>TXT、Markdown、JSON</li>
            <li>Excel、Word、PDF</li>
            <li>图片、CSV、TSV</li>
            <li>整个文件夹</li>
          </ul>
        </section>
      </>
    )
  }

  if (activePage === 'trash') {
    return (
      <>
        <section className="sidebar-card card">
          <p className="eyebrow">清理规则</p>
          <h3>两段式清理</h3>
          <ul className="sidebar-list">
            <li>第一次删除：进入回收站管理。</li>
            <li>第二次删除：从服务器彻底清除。</li>
            <li>批量操作只会弹出一个确认窗口。</li>
          </ul>
        </section>

        <section className="sidebar-card card">
          <p className="eyebrow">回收概览</p>
          <h3>当前回收情况</h3>
          <p className="sidebar-text">回收站文件数：{trashedNotes.length}</p>
          <p className="sidebar-text">常用文件数：{activeNotes.length}</p>
        </section>
      </>
    )
  }

  return (
    <>
      <section className="sidebar-card card">
        <p className="eyebrow">当前账号</p>
        <h3>{session.username}</h3>
        <p className="sidebar-text">常用文件：{activeNotes.length}</p>
        <p className="sidebar-text">回收站：{trashedNotes.length}</p>
        <p className="sidebar-text">项目数量：{projects.length}</p>
      </section>

      <section className="sidebar-card card">
        <p className="eyebrow">联系</p>
        <h3>联系信息</h3>
        <div className="link-list compact-links">
          {links.map((link) => (
            <a key={link.label} href={link.href}>
              <span>{link.label}</span>
              <span className="arrow">→</span>
            </a>
          ))}
        </div>
      </section>
    </>
  )
}

function WebsiteShell(props) {
  const {
    activeNotes,
    filteredNotes,
    trashedNotes,
    projects,
    articles,
    articleDraft,
    articleQuery,
    activeArticleId,
    articleAutoSaveLabel,
    selectedArticleIds,
    selectedNoteIds,
    selectedTrashIds,
    selectedProjectNoteIds,
    query,
    projectQuery,
    projectName,
    activeProjectId,
    isUploading,
    isUploadingProject,
    isSavingArticle,
    isUploadingArticleAssets,
    isDeleteWorking,
    serverMessage,
    session,
    activeNote,
    confirmConfig,
    activePage,
    onPageChange,
    onLogout,
    onQueryChange,
    onProjectQueryChange,
    onProjectNameChange,
    onCreateProject,
    onSelectProject,
    onUpload,
    onUploadFolder,
    onArticleQueryChange,
    onSelectArticle,
    onCreateArticle,
    onArticleFieldChange,
    onSaveArticle,
    onPublishArticle,
    onDeleteArticle,
    onToggleArticleSelect,
    onToggleAllArticles,
    onClearArticleSelection,
    onBatchDownloadArticles,
    onBatchDeleteArticles,
    onUploadCover,
    onUploadAttachments,
    onDeleteArticleAttachment,
    onUploadToProject,
    onUploadFolderToProject,
    onOpenNote,
    onDeleteProjectRequest,
    onCloseNote,
    onDeleteRequest,
    onRestoreRequest,
    onDeleteForeverRequest,
    onToggleNoteSelect,
    onToggleTrashSelect,
    onToggleProjectNoteSelect,
    onToggleAllNotes,
    onToggleAllTrash,
    onToggleAllProjectNotes,
    onClearNoteSelection,
    onClearTrashSelection,
    onClearProjectSelection,
    onBatchDownloadNotes,
    onBatchDeleteNotes,
    onBatchDownloadProjectNotes,
    onBatchDeleteProjectNotes,
    onBatchDownloadTrash,
    onBatchRestoreTrash,
    onBatchDeleteTrash,
    onCancelConfirm,
    onConfirmAction,
  } = props

  const heroStats = [
    { label: '常用文件', value: `${activeNotes.length} 份` },
    { label: '项目空间', value: `${projects.length} 个` },
    { label: '笔记内容', value: `${articles.length} 篇` },
  ]

  let mainView = (
    <NotesView
      activeNotes={activeNotes}
      filteredNotes={filteredNotes}
      selectedIds={selectedNoteIds}
      isUploading={isUploading}
      query={query}
      serverMessage={serverMessage}
      onQueryChange={onQueryChange}
      onUpload={onUpload}
      onUploadFolder={onUploadFolder}
      onOpenNote={onOpenNote}
      onDeleteRequest={onDeleteRequest}
      onToggleSelect={onToggleNoteSelect}
      onToggleSelectAll={onToggleAllNotes}
      onClearSelection={onClearNoteSelection}
      onBatchDownload={onBatchDownloadNotes}
      onBatchDelete={onBatchDeleteNotes}
    />
  )

  if (activePage === 'frontend') {
    mainView = <FrontendView notesCount={activeNotes.length} projectsCount={projects.length} articlesCount={articles.length} />
  }
  if (activePage === 'backend') {
    mainView = <BackendView notesCount={activeNotes.length} projectsCount={projects.length} articlesCount={articles.length} />
  }
  if (activePage === 'writing') {
    mainView = (
      <WritingView
        articles={articles}
        activeArticleId={activeArticleId}
        articleDraft={articleDraft}
        articleQuery={articleQuery}
        articleAutoSaveLabel={articleAutoSaveLabel}
        selectedArticleIds={selectedArticleIds}
        isSavingArticle={isSavingArticle}
        isUploadingArticleAssets={isUploadingArticleAssets}
        serverMessage={serverMessage}
        onArticleQueryChange={onArticleQueryChange}
        onSelectArticle={onSelectArticle}
        onCreateArticle={onCreateArticle}
        onArticleFieldChange={onArticleFieldChange}
        onSaveArticle={onSaveArticle}
        onPublishArticle={onPublishArticle}
        onDeleteArticle={onDeleteArticle}
        onToggleArticleSelect={onToggleArticleSelect}
        onToggleAllArticles={onToggleAllArticles}
        onClearArticleSelection={onClearArticleSelection}
        onBatchDownloadArticles={onBatchDownloadArticles}
        onBatchDeleteArticles={onBatchDeleteArticles}
        onUploadCover={onUploadCover}
        onUploadAttachments={onUploadAttachments}
        onOpenAttachment={onOpenNote}
        onDeleteAttachment={onDeleteArticleAttachment}
      />
    )
  }
  if (activePage === 'projects') {
    mainView = (
      <ProjectsView
        projects={projects}
        projectQuery={projectQuery}
        projectName={projectName}
        activeProjectId={activeProjectId}
        selectedIds={selectedProjectNoteIds}
        isUploadingProject={isUploadingProject}
        onProjectQueryChange={onProjectQueryChange}
        onProjectNameChange={onProjectNameChange}
        onCreateProject={onCreateProject}
        onSelectProject={onSelectProject}
        onUploadToProject={onUploadToProject}
        onUploadFolderToProject={onUploadFolderToProject}
        onOpenNote={onOpenNote}
        onDeleteProjectRequest={onDeleteProjectRequest}
        onToggleSelect={onToggleProjectNoteSelect}
        onToggleSelectAll={onToggleAllProjectNotes}
        onClearSelection={onClearProjectSelection}
        onBatchDownload={onBatchDownloadProjectNotes}
        onBatchDelete={onBatchDeleteProjectNotes}
      />
    )
  }
  if (activePage === 'trash') {
    mainView = (
      <TrashView
        activeNotes={activeNotes}
        trashedNotes={trashedNotes}
        selectedIds={selectedTrashIds}
        onOpenNote={onOpenNote}
        onRestoreRequest={onRestoreRequest}
        onDeleteForeverRequest={onDeleteForeverRequest}
        onToggleSelect={onToggleTrashSelect}
        onToggleSelectAll={onToggleAllTrash}
        onClearSelection={onClearTrashSelection}
        onBatchDownload={onBatchDownloadTrash}
        onBatchRestore={onBatchRestoreTrash}
        onBatchDeleteForever={onBatchDeleteTrash}
      />
    )
  }

  const currentMeta = pageMeta[activePage]

  return (
    <>
      <main className={`blog-shell page-${activePage}`}>
        <header className="blog-topbar card">
          <div className="topbar-brand">
            <p className="eyebrow">翎羽晨风</p>
            <h2>{profile.name}</h2>
            <p className="build-stamp">版本 {APP_VERSION} · 构建时间 {formatBeijingTime(APP_BUILD_TIME)}</p>
          </div>

          <nav className="topbar-nav" aria-label="主导航">
            {Object.entries(pageMeta).map(([key, item]) => (
              <button key={key} className={activePage === key ? 'nav-tab is-active' : 'nav-tab'} type="button" onClick={() => onPageChange(key)}>
                {item.title.replace('区', '')}
              </button>
            ))}
          </nav>

          <div className="topbar-user">
            <span>{session.username}</span>
            <button className="button button-secondary" type="button" onClick={onLogout}>
              退出登录
            </button>
          </div>
        </header>

        <section className="blog-hero card">
          <div className="hero-copy">
            <p className="eyebrow">{currentMeta.eyebrow}</p>
            <h1>{currentMeta.title}</h1>
            <p className="intro">{currentMeta.description}</p>
            <p className="hero-support">
              {profile.intro}
            </p>
          </div>

          <div className="hero-summary">
            <span className="status-pill status-pill-strong">当前账号：{session.username}</span>
            <span className="status-pill">数据文件：data/db.json</span>
            <span className="status-pill">当前模块：{currentMeta.title}</span>
          </div>

          <div className="hero-metrics">
            {heroStats.map((item) => (
              <article key={item.label} className="hero-metric-card">
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="blog-layout separated-layout">
          <div className="blog-main">{mainView}</div>
          <aside className="blog-sidebar">
            <SidebarPanel activePage={activePage} session={session} activeNotes={activeNotes} trashedNotes={trashedNotes} projects={projects} />
          </aside>
        </section>
      </main>

      <NoteModal note={activeNote} onClose={onCloseNote} />
      <ConfirmModal config={confirmConfig} isWorking={isDeleteWorking} onCancel={onCancelConfirm} onConfirm={onConfirmAction} />
    </>
  )
}

function App() {
  const [authMode, setAuthMode] = useState('login')
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [token, setToken] = useState('')
  const [session, setSession] = useState(null)
  const [notes, setNotes] = useState([])
  const [projects, setProjects] = useState([])
  const [articles, setArticles] = useState([])
  const [articleQuery, setArticleQuery] = useState('')
  const [activeArticleId, setActiveArticleId] = useState('')
  const [articleDraft, setArticleDraft] = useState(createEmptyArticle())
  const [isCreatingArticle, setIsCreatingArticle] = useState(false)
  const [articleAutoSaveLabel, setArticleAutoSaveLabel] = useState('未检测到新的编辑内容。')
  const [query, setQuery] = useState('')
  const [projectQuery, setProjectQuery] = useState('')
  const [projectName, setProjectName] = useState('')
  const [activeProjectId, setActiveProjectId] = useState('')
  const [activePage, setActivePage] = useState('notes')
  const [activeNote, setActiveNote] = useState(null)
  const [confirmConfig, setConfirmConfig] = useState(null)
  const [selectedNoteIds, setSelectedNoteIds] = useState([])
  const [selectedTrashIds, setSelectedTrashIds] = useState([])
  const [selectedProjectNoteIds, setSelectedProjectNoteIds] = useState([])
  const [selectedArticleIds, setSelectedArticleIds] = useState([])
  const [isBooting, setIsBooting] = useState(true)
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingProject, setIsUploadingProject] = useState(false)
  const [isSavingArticle, setIsSavingArticle] = useState(false)
  const [isUploadingArticleAssets, setIsUploadingArticleAssets] = useState(false)
  const [isDeleteWorking, setIsDeleteWorking] = useState(false)
  const [authMessage, setAuthMessage] = useState('注册后即可把内容永久保存到服务器。')
  const [serverMessage, setServerMessage] = useState('服务端存储已启用。')
  const articleDraftRef = useRef(articleDraft)
  const articleAutoSaveTimerRef = useRef(null)
  const articleAutoSaveReadyRef = useRef(false)
  const lastSavedArticleFingerprintRef = useRef(buildArticleDraftFingerprint(createEmptyArticle()))

  async function restoreSession(storedToken) {
    const data = await apiFetch('/api/auth/me', {}, storedToken)
    setToken(storedToken)
    setSession(data.user)
    setNotes(Array.isArray(data.notes) ? data.notes : [])
    const nextProjects = Array.isArray(data.projects) ? data.projects : []
    const nextArticles = Array.isArray(data.articles) ? data.articles : []
    setProjects(nextProjects)
    setArticles(nextArticles)
    setActiveArticleId(nextArticles[0]?.id || '')
    setArticleDraft(nextArticles[0] || createEmptyArticle())
    setActiveProjectId(nextProjects[0]?.id || '')
    setServerMessage('已从服务端加载你的常用文件和项目。')
  }

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY)
    if (!storedToken) {
      setIsBooting(false)
      return
    }

    restoreSession(storedToken)
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY)
        setAuthMessage('登录状态已过期，请重新登录。')
      })
      .finally(() => setIsBooting(false))
  }, [])

  const activeNotes = useMemo(() => notes.filter((note) => !note.deletedAt), [notes])
  const trashedNotes = useMemo(() => notes.filter((note) => note.deletedAt), [notes])

  const filteredNotes = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return activeNotes

    return activeNotes.filter((note) =>
      [note.title, note.content, note.type, note.createdAt, note.extension, note.mimeType, note.folderPath, note.relativePath]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    )
  }, [activeNotes, query])
  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) || projects[0] || null,
    [projects, activeProjectId],
  )
  const activeProjectNotes = useMemo(() => activeProject?.notes || [], [activeProject])
  const activeArticle = useMemo(
    () => articles.find((article) => article.id === activeArticleId) || articles[0] || null,
    [articles, activeArticleId],
  )

  useEffect(() => {
    setSelectedNoteIds((current) => current.filter((id) => filteredNotes.some((note) => note.id === id)))
  }, [filteredNotes])

  useEffect(() => {
    setSelectedTrashIds((current) => current.filter((id) => trashedNotes.some((note) => note.id === id)))
  }, [trashedNotes])

  useEffect(() => {
    setSelectedProjectNoteIds((current) => current.filter((id) => activeProjectNotes.some((note) => note.id === id)))
  }, [activeProjectNotes])

  useEffect(() => {
    setSelectedArticleIds((current) => current.filter((id) => articles.some((article) => article.id === id)))
  }, [articles])

  useEffect(() => {
    if (projects.length && !projects.some((project) => project.id === activeProjectId)) {
      setActiveProjectId(projects[0].id)
    }
    if (!projects.length) {
      setActiveProjectId('')
    }
  }, [projects, activeProjectId])

  useEffect(() => {
    if (activeArticleId && articles.length && !articles.some((article) => article.id === activeArticleId)) {
      setActiveArticleId(articles[0].id)
      setArticleDraft(articles[0])
      setIsCreatingArticle(false)
      return
    }

    if (!articles.length && activeArticleId) {
      setActiveArticleId('')
      setArticleDraft(createEmptyArticle())
      setIsCreatingArticle(true)
    }
  }, [articles, activeArticleId])

  useEffect(() => {
    if (activeArticleId && activeArticle) {
      setArticleDraft(activeArticle)
      setIsCreatingArticle(false)
    }
  }, [activeArticle, activeArticleId])

  useEffect(() => {
    articleDraftRef.current = articleDraft
  }, [articleDraft])

  useEffect(() => {
    const sourceArticle = activeArticleId && activeArticle ? activeArticle : createEmptyArticle()
    lastSavedArticleFingerprintRef.current = buildArticleDraftFingerprint(sourceArticle)
    articleAutoSaveReadyRef.current = false
    setArticleAutoSaveLabel(
      sourceArticle.id
        ? `最近保存时间：${formatBeijingTime(sourceArticle.updatedAt || sourceArticle.createdAt)}`
        : '新草稿尚未保存。',
    )
  }, [activeArticleId, activeArticle])

  useEffect(() => {
    return () => {
      if (articleAutoSaveTimerRef.current) {
        window.clearTimeout(articleAutoSaveTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!token || activePage !== 'writing' || isUploadingArticleAssets || isDeleteWorking) return

    const fingerprint = buildArticleDraftFingerprint(articleDraft)

    if (!articleAutoSaveReadyRef.current) {
      articleAutoSaveReadyRef.current = true
      return
    }

    if (fingerprint === lastSavedArticleFingerprintRef.current) return

    if (!hasMeaningfulArticleContent(articleDraft)) {
      setArticleAutoSaveLabel('新草稿尚未填写内容。')
      return
    }

    setArticleAutoSaveLabel('检测到未保存修改，等待自动保存...')

    if (articleAutoSaveTimerRef.current) {
      window.clearTimeout(articleAutoSaveTimerRef.current)
    }

    articleAutoSaveTimerRef.current = window.setTimeout(() => {
      const latestDraft = articleDraftRef.current
      const latestFingerprint = buildArticleDraftFingerprint(latestDraft)

      if (latestFingerprint === lastSavedArticleFingerprintRef.current) return
      if (!hasMeaningfulArticleContent(latestDraft)) return

      saveArticleWithStatus(latestDraft.status || 'draft', {
        article: latestDraft,
        silent: true,
      })
    }, ARTICLE_AUTO_SAVE_DELAY_MS)

    return () => {
      if (articleAutoSaveTimerRef.current) {
        window.clearTimeout(articleAutoSaveTimerRef.current)
      }
    }
  }, [activePage, articleDraft, isDeleteWorking, isUploadingArticleAssets, token])

  function updateCredential(key, value) {
    setCredentials((current) => ({ ...current, [key]: value }))
  }

  function toggleSelection(setter, id) {
    setter((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function toggleAllSelection(setter, collection, selectedIds) {
    const ids = collection.map((item) => item.id)
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id))
    setter(allSelected ? [] : ids)
  }

  function openBatchConfirm(action, ids, title, confirmText, description) {
    openScopedBatchConfirm('notes', action, ids, title, confirmText, description)
  }

  function openScopedBatchConfirm(scope, action, ids, title, confirmText, description, projectId = '') {
    if (!ids.length) return
    setConfirmConfig({
      scope,
      action,
      noteIds: ids,
      projectId,
      title,
      confirmText,
      description,
    })
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setIsSubmittingAuth(true)
    setAuthMessage(authMode === 'login' ? '正在登录...' : '正在创建账号...')

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const data = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(credentials),
      })

      setToken(data.token)
      setSession(data.user)
      setNotes(Array.isArray(data.notes) ? data.notes : [])
      const nextProjects = Array.isArray(data.projects) ? data.projects : []
      const nextArticles = Array.isArray(data.articles) ? data.articles : []
      setProjects(nextProjects)
      setArticles(nextArticles)
      setActiveArticleId(nextArticles[0]?.id || '')
      setArticleDraft(nextArticles[0] || createEmptyArticle())
      setSelectedProjectNoteIds([])
      setSelectedArticleIds([])
      setActiveProjectId(nextProjects[0]?.id || '')
      setSelectedNoteIds([])
      setSelectedTrashIds([])
      setSelectedProjectNoteIds([])
      setActivePage('notes')
      window.localStorage.setItem(TOKEN_KEY, data.token)
      setCredentials({ username: '', password: '' })
      setAuthMessage(authMode === 'login' ? '登录成功，正在进入主页。' : '注册成功，正在进入主页。')
      setServerMessage('服务端存储已启用，你的内容会跟账号一起保存。')
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : '登录失败，请稍后重试。')
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  async function handleLogout() {
    try {
      if (token) {
        await apiFetch('/api/auth/logout', { method: 'POST' }, token)
      }
    } catch {
      // Ignore logout failures.
    }

    window.localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setSession(null)
    setNotes([])
    setProjects([])
    setArticles([])
    setArticleQuery('')
    setActiveArticleId('')
    setArticleDraft(createEmptyArticle())
    setQuery('')
    setProjectQuery('')
    setProjectName('')
    setActiveProjectId('')
    setActivePage('notes')
    setActiveNote(null)
    setConfirmConfig(null)
    setSelectedNoteIds([])
    setSelectedTrashIds([])
    setSelectedProjectNoteIds([])
    setSelectedArticleIds([])
    setAuthMode('login')
    setAuthMessage('你已退出登录，请重新登录。')
    setServerMessage('服务端存储已启用。')
  }

  function handleCreateArticle() {
    setActiveArticleId('')
    setArticleDraft(createEmptyArticle())
    setIsCreatingArticle(true)
    setActivePage('writing')
    setServerMessage('新的笔记草稿已创建，可以开始编辑。')
  }

  function handleSelectArticle(articleId) {
    const nextArticle = articles.find((article) => article.id === articleId)
    if (!nextArticle) return
    setActiveArticleId(articleId)
    setArticleDraft(nextArticle)
    setIsCreatingArticle(false)
    setActivePage('writing')
  }

  function handleArticleFieldChange(field, value) {
    setArticleDraft((current) => ({ ...current, [field]: value }))
  }

  async function saveArticleWithStatus(status = 'draft', options = {}) {
    if (!token) return null
    const { article = articleDraftRef.current, silent = false } = options

    if (articleAutoSaveTimerRef.current) {
      window.clearTimeout(articleAutoSaveTimerRef.current)
      articleAutoSaveTimerRef.current = null
    }

    setIsSavingArticle(true)
    if (silent) {
      setArticleAutoSaveLabel('自动保存中...')
    }

    try {
      const data = await apiFetch(
        '/api/articles/save',
        {
          method: 'POST',
          body: JSON.stringify({
            article: {
              ...article,
              status,
            },
          }),
        },
        token,
      )

      const nextArticles = Array.isArray(data.articles) ? data.articles : articles
      const savedArticle = data.article || nextArticles.find((item) => item.id === article.id) || article
      lastSavedArticleFingerprintRef.current = buildArticleDraftFingerprint(savedArticle)
      setArticles(nextArticles)
      setActiveArticleId(savedArticle.id || '')
      setArticleDraft(savedArticle)
      setIsCreatingArticle(false)
      setActivePage('writing')
      setArticleAutoSaveLabel(
        silent ? `已自动保存：${formatBeijingTime(savedArticle.updatedAt || new Date().toISOString())}` : '当前内容已手动保存。',
      )
      if (!silent) {
        setServerMessage(status === 'published' ? '笔记已发布。' : '草稿已保存。')
      }
      return savedArticle
    } catch (error) {
      setArticleAutoSaveLabel(silent ? '自动保存失败，请稍后重试。' : '手动保存失败。')
      setServerMessage(error instanceof Error ? error.message : '保存笔记失败，请稍后重试。')
      return null
    } finally {
      setIsSavingArticle(false)
    }
  }

  async function handleDeleteArticle() {
    if (!articleDraft.id) return
    openScopedBatchConfirm(
      'articles',
      'remove',
      [articleDraft.id],
      '删除笔记',
      '确认删除',
      `确认删除“${articleDraft.title || '未命名笔记'}”吗？删除后无法恢复，附件也会一起删除。`,
    )
  }

  async function handleUploadArticleCover(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const coverImage = await readFileAsDataUrl(file)
      setArticleDraft((current) => ({ ...current, coverImage }))
      setServerMessage('封面图片已加载到编辑区。')
    } catch {
      setServerMessage('读取封面图片失败。')
    } finally {
      event.target.value = ''
    }
  }

  async function handleUploadArticleAttachments(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length || !token) return

    let articleId = articleDraft.id
    if (!articleId) {
      const savedArticle = await saveArticleWithStatus(articleDraft.status || 'draft')
      articleId = savedArticle?.id || ''
    }

    if (!articleId) {
      event.target.value = ''
      return
    }

    setIsUploadingArticleAssets(true)
    setServerMessage('正在上传笔记附件...')

    try {
      let nextArticles = articles
      let latestArticle = articleDraft

      for (let index = 0; index < files.length; index += 1) {
        const data = await apiFetch(
          '/api/articles/upload',
          {
            method: 'POST',
            body: buildUploadFormData(files[index], {
              articleId,
            }),
          },
          token,
        )

        nextArticles = Array.isArray(data.articles) ? data.articles : nextArticles
        latestArticle = data.article || latestArticle
      }

      setArticles(nextArticles)
      setActiveArticleId(articleId)
      setArticleDraft(latestArticle)
      setIsCreatingArticle(false)
      setServerMessage('笔记附件上传成功。')
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : '附件上传失败，请稍后重试。')
    } finally {
      setIsUploadingArticleAssets(false)
      event.target.value = ''
    }
  }

  async function handleDeleteArticleAttachment(attachment) {
    if (!token || !articleDraft.id || !attachment?.id) return
    const shouldDelete = window.confirm(`确认删除附件“${attachment.title || '未命名附件'}”吗？`)
    if (!shouldDelete) return

    try {
      const data = await apiFetch(
        '/api/articles/attachment/remove',
        {
          method: 'POST',
          body: JSON.stringify({
            articleId: articleDraft.id,
            attachmentId: attachment.id,
          }),
        },
        token,
      )

      const nextArticles = Array.isArray(data.articles) ? data.articles : articles
      const nextArticle = data.article || nextArticles.find((item) => item.id === articleDraft.id) || articleDraft
      setArticles(nextArticles)
      setArticleDraft(nextArticle)
      setActiveNote((current) => (current?.id === attachment.id ? null : current))
      setServerMessage('附件已删除。')
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : '删除附件失败，请稍后重试。')
    }
  }

  function handleBatchDownloadArticles(collection, ids, emptyMessage) {
    const selectedArticles = collection.filter((article) => ids.includes(article.id))
    if (!selectedArticles.length) {
      setServerMessage(emptyMessage)
      return
    }

    selectedArticles.forEach((article, index) => {
      window.setTimeout(() => downloadArticle(article), index * 150)
    })
    setServerMessage(`已开始下载 ${selectedArticles.length} 篇笔记。`)
  }

  async function uploadNotes(files, isFolderUpload = false) {
    if (!files.length || !token) return

    setIsUploading(true)
    setServerMessage(isFolderUpload ? '正在读取文件夹并同步到服务器...' : '正在读取文件并同步到服务器...')

    try {
      let latestNotes = notes

      for (let index = 0; index < files.length; index += 1) {
        if (files.length > 1) {
          setServerMessage(`正在上传文件 ${index + 1}/${files.length}...`)
        }

        const data = await apiFetch(
          '/api/notes/upload',
          {
            method: 'POST',
            body: buildUploadFormData(files[index]),
          },
          token,
        )

        latestNotes = Array.isArray(data.notes) ? data.notes : latestNotes
      }

      setNotes(latestNotes)
      setSelectedNoteIds([])
      setServerMessage(isFolderUpload ? '文件夹上传完成。' : '文件上传成功。')
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : '上传失败，请稍后重试。')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleUpload(event) {
    const files = Array.from(event.target.files || [])
    await uploadNotes(files, false)
    event.target.value = ''
  }

  async function handleUploadFolder(event) {
    const files = Array.from(event.target.files || [])
    await uploadNotes(files, true)
    event.target.value = ''
  }

  async function handleCreateProject(event) {
    event.preventDefault()
    if (!projectName.trim() || !token) return

    try {
      const data = await apiFetch(
        '/api/projects',
        {
          method: 'POST',
          body: JSON.stringify({ name: projectName.trim() }),
        },
        token,
      )

      const nextProjects = Array.isArray(data.projects) ? data.projects : projects
      setProjects(nextProjects)
      setActiveProjectId(data.project?.id || nextProjects[0]?.id || '')
      setProjectName('')
      setActivePage('projects')
      setServerMessage('项目创建成功。')
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : '项目创建失败，请稍后重试。')
    }
  }

  async function uploadProjectNotes(files, isFolderUpload = false) {
    if (!files.length || !token || !activeProjectId) return

    setIsUploadingProject(true)
    setServerMessage(isFolderUpload ? '正在上传项目文件夹...' : '正在上传项目文件...')

    try {
      let nextProjects = projects

      for (let index = 0; index < files.length; index += 1) {
        if (files.length > 1) {
          setServerMessage(`正在上传项目文件 ${index + 1}/${files.length}...`)
        }

        const data = await apiFetch(
          '/api/projects/upload',
          {
            method: 'POST',
            body: buildUploadFormData(files[index], {
              projectId: activeProjectId,
            }),
          },
          token,
        )

        nextProjects = Array.isArray(data.projects) ? data.projects : nextProjects
      }

      setProjects(nextProjects)
      setServerMessage(isFolderUpload ? '项目文件夹上传完成。' : '项目文件上传成功。')
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : '项目上传失败，请稍后重试。')
    } finally {
      setIsUploadingProject(false)
    }
  }

  async function handleProjectUpload(event) {
    const files = Array.from(event.target.files || [])
    await uploadProjectNotes(files, false)
    event.target.value = ''
  }

  async function handleProjectFolderUpload(event) {
    const files = Array.from(event.target.files || [])
    await uploadProjectNotes(files, true)
    event.target.value = ''
  }

  function requestMoveToTrash(note) {
    setConfirmConfig({
      action: 'trash',
      noteIds: [note.id],
      title: '移动到回收站',
      confirmText: '确认删除',
      description: `确认将“${note.title}”移入回收站吗？移入后不会立刻彻底删除。`,
    })
  }

  function requestRestore(note) {
    setConfirmConfig({
      action: 'restore',
      noteIds: [note.id],
      title: '恢复常用文件',
      confirmText: '确认恢复',
      description: `确认恢复“${note.title}”吗？恢复后会重新出现在常用文件区。`,
    })
  }

  function requestDeleteForever(note) {
    setConfirmConfig({
      action: 'remove',
      noteIds: [note.id],
      title: '彻底删除文件',
      confirmText: '彻底删除',
      description: `确认彻底删除“${note.title}”吗？这一步执行后将无法恢复。`,
    })
  }

  function requestDeleteProject(project) {
    setConfirmConfig({
      scope: 'project-root',
      action: 'remove',
      noteIds: [],
      projectId: project.id,
      requirePassword: true,
      title: '删除项目',
      confirmText: '确认删除项目',
      description: `确认删除“${project.name}”吗？项目中的文件也会一起删除，并且无法恢复。`,
    })
  }

  function handleBatchDownload(collection, ids, emptyMessage) {
    const selectedNotes = collection.filter((note) => ids.includes(note.id))
    if (!selectedNotes.length) {
      setServerMessage(emptyMessage)
      return
    }

    selectedNotes.forEach((note, index) => {
      window.setTimeout(() => downloadNote(note), index * 150)
    })
    setServerMessage(`已开始下载 ${selectedNotes.length} 个文件。`)
  }

  async function handleConfirmAction(payload = {}) {
    if (!confirmConfig || !token) return

    const currentAction = confirmConfig
    const ids = Array.isArray(currentAction.noteIds) ? currentAction.noteIds : []
    const scope = currentAction.scope || 'notes'
    const password = String(payload.password || '')
    setIsDeleteWorking(true)

    try {
      if (scope === 'project-root') {
        const data = await apiFetch(
          '/api/projects/remove',
          {
            method: 'POST',
            body: JSON.stringify({
              projectId: currentAction.projectId,
              password,
            }),
          },
          token,
        )

        const nextProjects = Array.isArray(data.projects) ? data.projects : []
        setProjects(nextProjects)
        setSelectedProjectNoteIds([])
        setActiveNote(null)
        setConfirmConfig(null)
        setServerMessage('项目已删除。')
        return
      }

      if (scope === 'project') {
        const data = await apiFetch(
          '/api/projects/batch',
          {
            method: 'POST',
            body: JSON.stringify({
              projectId: currentAction.projectId,
              action: currentAction.action,
              ids,
            }),
          },
          token,
        )

        const nextProjects = Array.isArray(data.projects) ? data.projects : []
        setProjects(nextProjects)
        setSelectedProjectNoteIds([])
        setActiveNote((current) => (current && ids.includes(current.id) ? null : current))
        setConfirmConfig(null)
        setServerMessage(ids.length > 1 ? `已从当前项目删除 ${ids.length} 个文件。` : '项目文件已删除。')
        return
      }

      if (scope === 'articles') {
        const data = await apiFetch(
          ids.length > 1 ? '/api/articles/batch' : '/api/articles/remove',
          {
            method: 'POST',
            body: JSON.stringify(
              ids.length > 1
                ? {
                    action: currentAction.action,
                    ids,
                  }
                : {
                    articleId: ids[0],
                  },
            ),
          },
          token,
        )

        const nextArticles = Array.isArray(data.articles) ? data.articles : []
        setArticles(nextArticles)
        setSelectedArticleIds([])
        setActiveArticleId((current) => (current && ids.includes(current) ? nextArticles[0]?.id || '' : current))
        setArticleDraft((current) => (current?.id && ids.includes(current.id) ? nextArticles[0] || createEmptyArticle() : current))
        setIsCreatingArticle(!nextArticles.length)
        setConfirmConfig(null)
        setServerMessage(ids.length > 1 ? `已删除 ${ids.length} 篇笔记。` : '笔记已删除。')
        return
      }

      await apiFetch(
        '/api/notes/batch',
        {
          method: 'POST',
          body: JSON.stringify({
            action: currentAction.action,
            ids,
          }),
        },
        token,
      )

      const refreshed = await apiFetch('/api/notes', { method: 'GET' }, token)
      setNotes(Array.isArray(refreshed.notes) ? refreshed.notes : [])
      setActiveNote((current) => (current && ids.includes(current.id) && currentAction.action !== 'restore' ? null : current))
      setConfirmConfig(null)

      if (currentAction.action === 'trash') {
        setSelectedNoteIds([])
        setServerMessage(ids.length > 1 ? `已将 ${ids.length} 个文件移入回收站。` : '文件已移入回收站。')
      } else if (currentAction.action === 'restore') {
        setSelectedTrashIds([])
        setServerMessage(ids.length > 1 ? `已恢复 ${ids.length} 个文件。` : '文件已恢复到常用文件区。')
      } else {
        setSelectedTrashIds([])
        setServerMessage(ids.length > 1 ? `已彻底删除 ${ids.length} 个文件。` : '文件已从回收站中彻底删除。')
      }
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : '操作失败，请稍后重试。')
    } finally {
      setIsDeleteWorking(false)
    }
  }

  if (!session) {
    return (
      <LoginScreen
        authMode={authMode}
        credentials={credentials}
        isBooting={isBooting}
        isSubmittingAuth={isSubmittingAuth}
        authMessage={authMessage}
        onModeChange={setAuthMode}
        onCredentialChange={updateCredential}
        onSubmit={handleAuthSubmit}
      />
    )
  }

  return (
    <WebsiteShell
      activeNotes={activeNotes}
      filteredNotes={filteredNotes}
      trashedNotes={trashedNotes}
      projects={projects}
      articles={articles}
      articleDraft={articleDraft}
      articleQuery={articleQuery}
      articleAutoSaveLabel={articleAutoSaveLabel}
      activeArticleId={activeArticleId}
      selectedArticleIds={selectedArticleIds}
      selectedNoteIds={selectedNoteIds}
      selectedTrashIds={selectedTrashIds}
      selectedProjectNoteIds={selectedProjectNoteIds}
      query={query}
      projectQuery={projectQuery}
      projectName={projectName}
      activeProjectId={activeProjectId}
      isUploading={isUploading}
      isUploadingProject={isUploadingProject}
      isSavingArticle={isSavingArticle}
      isUploadingArticleAssets={isUploadingArticleAssets}
      isDeleteWorking={isDeleteWorking}
      serverMessage={serverMessage}
      session={session}
      activeNote={activeNote}
      confirmConfig={confirmConfig}
      activePage={activePage}
      onPageChange={setActivePage}
      onLogout={handleLogout}
      onQueryChange={setQuery}
      onArticleQueryChange={setArticleQuery}
      onSelectArticle={handleSelectArticle}
      onCreateArticle={handleCreateArticle}
      onArticleFieldChange={handleArticleFieldChange}
      onSaveArticle={() => saveArticleWithStatus('draft')}
      onPublishArticle={() => saveArticleWithStatus('published')}
      onDeleteArticle={handleDeleteArticle}
      onToggleArticleSelect={(id) => toggleSelection(setSelectedArticleIds, id)}
      onToggleAllArticles={() => toggleAllSelection(setSelectedArticleIds, articles.filter((article) => {
        const keyword = articleQuery.trim().toLowerCase()
        if (!keyword) return true
        return [article.title, article.summary, article.content, (article.tags || []).join(' ')].join(' ').toLowerCase().includes(keyword)
      }), selectedArticleIds)}
      onClearArticleSelection={() => setSelectedArticleIds([])}
      onBatchDownloadArticles={() =>
        handleBatchDownloadArticles(
          articles.filter((article) => {
            const keyword = articleQuery.trim().toLowerCase()
            if (!keyword) return true
            return [article.title, article.summary, article.content, (article.tags || []).join(' ')].join(' ').toLowerCase().includes(keyword)
          }),
          selectedArticleIds,
          'Please select note articles to download first.',
        )
      }
      onBatchDeleteArticles={() =>
        openScopedBatchConfirm(
          'articles',
          'remove',
          selectedArticleIds,
          '批量删除笔记',
          '确认批量删除',
          `确认删除 ${selectedArticleIds.length} 篇已选择的笔记吗？删除后无法恢复，附件也会一起删除。`,
        )
      }
      onUploadCover={handleUploadArticleCover}
      onUploadAttachments={handleUploadArticleAttachments}
      onDeleteArticleAttachment={handleDeleteArticleAttachment}
      onProjectQueryChange={setProjectQuery}
      onProjectNameChange={setProjectName}
      onCreateProject={handleCreateProject}
      onSelectProject={setActiveProjectId}
      onUpload={handleUpload}
      onUploadFolder={handleUploadFolder}
      onUploadToProject={handleProjectUpload}
      onUploadFolderToProject={handleProjectFolderUpload}
      onOpenNote={setActiveNote}
      onDeleteProjectRequest={requestDeleteProject}
      onCloseNote={() => setActiveNote(null)}
      onDeleteRequest={requestMoveToTrash}
      onRestoreRequest={requestRestore}
      onDeleteForeverRequest={requestDeleteForever}
      onToggleNoteSelect={(id) => toggleSelection(setSelectedNoteIds, id)}
      onToggleTrashSelect={(id) => toggleSelection(setSelectedTrashIds, id)}
      onToggleProjectNoteSelect={(id) => toggleSelection(setSelectedProjectNoteIds, id)}
      onToggleAllNotes={() => toggleAllSelection(setSelectedNoteIds, filteredNotes, selectedNoteIds)}
      onToggleAllTrash={() => toggleAllSelection(setSelectedTrashIds, trashedNotes, selectedTrashIds)}
      onToggleAllProjectNotes={() => toggleAllSelection(setSelectedProjectNoteIds, activeProjectNotes, selectedProjectNoteIds)}
      onClearNoteSelection={() => setSelectedNoteIds([])}
      onClearTrashSelection={() => setSelectedTrashIds([])}
      onClearProjectSelection={() => setSelectedProjectNoteIds([])}
      onBatchDownloadNotes={() => handleBatchDownload(filteredNotes, selectedNoteIds, '请先选择要下载的常用文件。')}
      onBatchDeleteNotes={() =>
        openBatchConfirm('trash', selectedNoteIds, '批量移动到回收站', '确认批量删除', `确认删除 ${selectedNoteIds.length} 个已选择的常用文件吗？确认后会先移入回收站。`)
      }
      onBatchDownloadTrash={() => handleBatchDownload(trashedNotes, selectedTrashIds, '请先选择要下载的已删除文件。')}
      onBatchRestoreTrash={() =>
        openBatchConfirm('restore', selectedTrashIds, '批量恢复常用文件', '确认批量恢复', `确认恢复 ${selectedTrashIds.length} 个已选择的文件吗？`)
      }
      onBatchDeleteTrash={() =>
        openBatchConfirm('remove', selectedTrashIds, '批量彻底删除', '确认彻底删除', `确认彻底删除 ${selectedTrashIds.length} 个已选择的文件吗？这一步执行后将无法恢复。`)
      }
      onBatchDownloadProjectNotes={() => handleBatchDownload(activeProjectNotes, selectedProjectNoteIds, '请先选择要下载的项目文件。')}
      onBatchDeleteProjectNotes={() =>
        openScopedBatchConfirm(
          'project',
          'remove',
          selectedProjectNoteIds,
          '批量删除项目文件',
          '确认批量删除',
          `确认从当前项目中删除 ${selectedProjectNoteIds.length} 个已选择的文件吗？删除后将从该项目中移除。`,
          activeProjectId,
        )
      }
      onCancelConfirm={() => setConfirmConfig(null)}
      onConfirmAction={handleConfirmAction}
    />
  )
}

export default App
