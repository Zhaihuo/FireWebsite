import { useEffect, useMemo, useState } from 'react'
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

const profile = {
  name: 'firefire',
  role: '产品 / 前端 / 后端 / 视觉设计',
  intro: '把常用文件、项目文件和服务端存储整理成一个更接近博客后台的知识工作台。',
  location: 'Remote · China',
  status: '当前站点支持登录、常用文件、项目管理、垃圾管理、文件夹上传和服务端永久保存。',
}

const frontendPosts = [
  {
    title: '前端展示页：多页面工作台',
    summary: '登录后进入前端、后端、常用文件、项目、垃圾管理等独立页面，不再是一个长页面堆叠。',
    tags: ['React', 'UI', 'Workspace'],
  },
  {
    title: '上传层：文件和文件夹并存',
    summary: '常用文件页和项目页都支持上传单个文件，也支持上传整个文件夹，并保留原始文件夹层级。',
    tags: ['Upload', 'Folder', 'Files'],
  },
]

const backendPosts = [
  {
    title: '后端服务层：账号与永久保存',
    summary: '所有账号、常用文件、项目和项目内文件统一保存在服务器，重新登录或更换电脑都能恢复。',
    tags: ['Auth', 'API', 'Storage'],
  },
  {
    title: '批量操作：一次确认，一次执行',
    summary: '批量删除、批量恢复和批量彻底删除都只弹出一次确认窗口，然后统一走后端批量接口。',
    tags: ['Batch', 'Confirm', 'Server'],
  },
]

const links = [
  { label: 'GitHub', href: 'https://github.com/' },
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

const pageMeta = {
  frontend: {
    eyebrow: 'Frontend',
    title: '前端展示区',
    description: '查看当前网站的页面组织、上传体验和界面说明。',
  },
  backend: {
    eyebrow: 'Backend',
    title: '后端服务区',
    description: '查看账号、项目、常用文件和服务端永久保存结构。',
  },
  notes: {
    eyebrow: 'Common Files',
    title: '常用文件区',
    description: '上传文件、上传文件夹、搜索内容并进行批量管理。',
  },
  projects: {
    eyebrow: 'Projects',
    title: '项目管理区',
    description: '创建项目、搜索项目名称，并在每个项目里单独上传文件或文件夹。',
  },
  trash: {
    eyebrow: 'Trash',
    title: '垃圾管理区',
    description: '恢复已删除常用文件，或进行最终彻底删除。',
  },
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
  const createdAt = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())

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

async function apiFetch(path, options = {}, token = null) {
  const headers = new Headers(options.headers || {})
  headers.set('Content-Type', 'application/json')
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
          <p className="eyebrow">Fire Notes</p>
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
        <p className="note-meta">{note.createdAt}</p>
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
        <p className="note-meta">删除时间：{note.deletedAt || '未知'}</p>
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
              {note.createdAt} · {note.size}
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

function FrontendView() {
  return (
    <section className="blog-section card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Frontend</p>
          <h2>前端展示区</h2>
        </div>
        <span>负责页面、导航和上传体验</span>
      </div>

      <div className="blog-post-list">
        {frontendPosts.map((post) => (
          <PostCard key={post.title} {...post} category="前端文章" />
        ))}
      </div>
    </section>
  )
}

function BackendView() {
  return (
    <section className="blog-section card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Backend</p>
          <h2>后端服务区</h2>
        </div>
        <span>负责登录、项目、文件和永久存储</span>
      </div>

      <div className="blog-post-list">
        {backendPosts.map((post) => (
          <PostCard key={post.title} {...post} category="后端文章" />
        ))}
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

  return (
    <section className="blog-section card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Common Files</p>
          <h2>常用文件区</h2>
        </div>
        <span>上传文件、上传文件夹、搜索和批量管理</span>
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

      <div className="notes-feed">
        {filteredNotes.map((note) => (
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

  return (
    <section className="blog-section card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Projects</p>
          <h2>项目管理区</h2>
        </div>
        <span>创建项目、搜索项目名、上传文件和文件夹</span>
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
                  <p className="eyebrow">Active Project</p>
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
                    small="支持 txt、excel、word、pdf、图片等格式"
                  />
                  <UploadFolderInput
                    disabled={isUploadingProject}
                    onChange={onUploadFolderToProject}
                    copy={isUploadingProject ? '上传中...' : '上传项目文件夹'}
                    small="会保留项目内的原始文件夹层级"
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

              <div className="notes-feed">
                {activeProjectNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isSelected={selectedIds.includes(note.id)}
                    selectable
                    onToggleSelect={onToggleSelect}
                    onOpen={onOpenNote}
                  />
                ))}
              </div>

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
    <section className="blog-section card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Trash</p>
          <h2>垃圾管理区</h2>
        </div>
        <span>恢复内容、批量下载、彻底删除</span>
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
  if (activePage === 'projects') {
    return (
      <>
        <section className="sidebar-card card">
          <p className="eyebrow">Projects</p>
          <h3>项目概览</h3>
          <p className="sidebar-text">项目数量：{projects.length}</p>
          <p className="sidebar-text">当前账号：{session.username}</p>
          <p className="sidebar-text">每个项目都有自己的文件和文件夹内容。</p>
        </section>

        <section className="sidebar-card card">
          <p className="eyebrow">支持格式</p>
          <h3>项目内可上传</h3>
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
          <p className="eyebrow">删除规则</p>
          <h3>两段式删除</h3>
          <ul className="sidebar-list">
            <li>第一次删除：进入垃圾管理。</li>
            <li>第二次删除：从服务器彻底清除。</li>
            <li>批量操作只会弹出一个确认窗口。</li>
          </ul>
        </section>

        <section className="sidebar-card card">
          <p className="eyebrow">统计</p>
          <h3>回收情况</h3>
          <p className="sidebar-text">垃圾管理文件数：{trashedNotes.length}</p>
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
        <p className="sidebar-text">垃圾管理：{trashedNotes.length}</p>
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
    selectedNoteIds,
    selectedTrashIds,
    selectedProjectNoteIds,
    query,
    projectQuery,
    projectName,
    activeProjectId,
    isUploading,
    isUploadingProject,
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

  if (activePage === 'frontend') mainView = <FrontendView />
  if (activePage === 'backend') mainView = <BackendView />
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
      <main className="blog-shell">
        <header className="blog-topbar card">
          <div className="topbar-brand">
            <p className="eyebrow">Fire Coder Blog</p>
            <h2>{profile.name}</h2>
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
          <div>
            <p className="eyebrow">{currentMeta.eyebrow}</p>
            <h1>{currentMeta.title}</h1>
            <p className="intro">{currentMeta.description}</p>
          </div>

          <div className="hero-summary">
            <span className="status-pill status-pill-strong">当前账号：{session.username}</span>
            <span className="status-pill">服务端文件：`data/db.json`</span>
            <span className="status-pill">当前模块：{currentMeta.title}</span>
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
  const [isBooting, setIsBooting] = useState(true)
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingProject, setIsUploadingProject] = useState(false)
  const [isDeleteWorking, setIsDeleteWorking] = useState(false)
  const [authMessage, setAuthMessage] = useState('注册后即可把内容永久保存到服务器。')
  const [serverMessage, setServerMessage] = useState('服务端存储已启用。')

  async function restoreSession(storedToken) {
    const data = await apiFetch('/api/auth/me', {}, storedToken)
    setToken(storedToken)
    setSession(data.user)
    setNotes(Array.isArray(data.notes) ? data.notes : [])
    const nextProjects = Array.isArray(data.projects) ? data.projects : []
    setProjects(nextProjects)
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
    if (projects.length && !projects.some((project) => project.id === activeProjectId)) {
      setActiveProjectId(projects[0].id)
    }
    if (!projects.length) {
      setActiveProjectId('')
    }
  }, [projects, activeProjectId])

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
      setProjects(nextProjects)
      setSelectedProjectNoteIds([])
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
    setAuthMode('login')
    setAuthMessage('你已退出登录，请重新登录。')
    setServerMessage('服务端存储已启用。')
  }

  async function uploadNotes(files, isFolderUpload = false) {
    if (!files.length || !token) return

    setIsUploading(true)
    setServerMessage(isFolderUpload ? '正在读取文件夹并同步到服务器...' : '正在读取文件并同步到服务器...')

    try {
      const uploadedNotes = await Promise.all(files.map((file) => createNoteFromFile(file)))
      const data = await apiFetch(
        '/api/notes/import',
        {
          method: 'POST',
          body: JSON.stringify({ notes: uploadedNotes }),
        },
        token,
      )

      setNotes(Array.isArray(data.notes) ? data.notes : [])
      setSelectedNoteIds([])
      setServerMessage(isFolderUpload ? '文件夹上传成功。' : '常用文件上传成功。')
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
      const uploadedNotes = await Promise.all(files.map((file) => createNoteFromFile(file)))
      const data = await apiFetch(
        '/api/projects/import',
        {
          method: 'POST',
          body: JSON.stringify({
            projectId: activeProjectId,
            notes: uploadedNotes,
          }),
        },
        token,
      )

      const nextProjects = Array.isArray(data.projects) ? data.projects : projects
      setProjects(nextProjects)
      setServerMessage(isFolderUpload ? '项目文件夹上传成功。' : '项目文件上传成功。')
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : '项目文件上传失败，请稍后重试。')
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
      title: '移动到垃圾管理',
      confirmText: '确认删除',
      description: `确认将“${note.title}”移入垃圾管理吗？移入后不会立刻彻底删除。`,
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
        setServerMessage(ids.length > 1 ? `已将 ${ids.length} 个文件移入垃圾管理。` : '文件已移入垃圾管理。')
      } else if (currentAction.action === 'restore') {
        setSelectedTrashIds([])
        setServerMessage(ids.length > 1 ? `已恢复 ${ids.length} 个文件。` : '文件已恢复到常用文件区。')
      } else {
        setSelectedTrashIds([])
        setServerMessage(ids.length > 1 ? `已彻底删除 ${ids.length} 个文件。` : '文件已从垃圾管理中彻底删除。')
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
      selectedNoteIds={selectedNoteIds}
      selectedTrashIds={selectedTrashIds}
      selectedProjectNoteIds={selectedProjectNoteIds}
      query={query}
      projectQuery={projectQuery}
      projectName={projectName}
      activeProjectId={activeProjectId}
      isUploading={isUploading}
      isUploadingProject={isUploadingProject}
      isDeleteWorking={isDeleteWorking}
      serverMessage={serverMessage}
      session={session}
      activeNote={activeNote}
      confirmConfig={confirmConfig}
      activePage={activePage}
      onPageChange={setActivePage}
      onLogout={handleLogout}
      onQueryChange={setQuery}
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
        openBatchConfirm('trash', selectedNoteIds, '批量移动到垃圾管理', '确认批量删除', `确认删除 ${selectedNoteIds.length} 个已选择的常用文件吗？确认后会先移入垃圾管理。`)
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
