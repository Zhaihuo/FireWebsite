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
  intro:
    '把个人网站、上传笔记和服务端存储整理成一个更接近技术博客的工作空间。登录后，内容会跟随账号永久保存到服务器。',
  location: 'Remote · China',
  status: '当前站点已经支持登录、上传、搜索、回收站、永久删除和批量操作。',
}

const frontendPosts = [
  {
    title: '前端展示页：博客首页与内容工作台',
    summary:
      '负责页面展示、内容切换、搜索交互、详情预览和独立登录入口，让网站从单页堆叠改成更接近博客站的分区结构。',
    tags: ['React', 'UI', 'Workspace'],
  },
  {
    title: '笔记预览层：图片、表格与文档识别',
    summary:
      '上传后自动识别图片、CSV/TSV 表格、Markdown、PDF、Excel、Word 与普通文本，并为不同类型生成适合阅读的预览方式。',
    tags: ['Preview', 'Parser', 'Upload'],
  },
]

const backendPosts = [
  {
    title: '后端服务层：账号登录与接口鉴权',
    summary:
      '负责注册、登录、退出登录和 Token 校验，让前端展示逻辑与数据存储职责分开，也支持重新进入网站时恢复账号内容。',
    tags: ['Auth', 'Token', 'API'],
  },
  {
    title: '数据存储层：服务端持久化保存',
    summary:
      '所有账号和笔记统一保存到服务器 `data/db.json`，更换电脑后只需要重新登录同一个账号，就能继续查看历史内容。',
    tags: ['Storage', 'Server', 'Persistence'],
  },
]

const links = [
  { label: 'GitHub', href: 'https://github.com/' },
  { label: '邮箱', href: 'mailto:2948756447@qq.com' },
  { label: '博客说明', href: '#' },
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
    description: '查看站点前端结构、页面定位和交互能力。',
  },
  backend: {
    eyebrow: 'Backend',
    title: '后端服务区',
    description: '查看账号、接口和服务端存储的设计说明。',
  },
  notes: {
    eyebrow: 'Notebook',
    title: '笔记管理区',
    description: '上传、搜索、批量管理并打开你自己的笔记内容。',
  },
  trash: {
    eyebrow: 'Trash',
    title: '垃圾管理区',
    description: '恢复已删除内容，或进行最终彻底删除。',
  },
}

function getExtension(fileName) {
  return fileName.split('.').pop()?.toLowerCase() || ''
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
  const extension = getExtension(file.name).toUpperCase()
  const typeNameMap = {
    pdf: 'PDF 文档',
    excel: 'Excel 表格',
    word: 'Word 文档',
    file: '文件',
  }

  return `${file.name} 已上传并保存。类型：${typeNameMap[type] || '文件'}，扩展名：${extension || '未知'}。可在详情页中打开或下载原文件。`
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
      content: `${file.name} ${file.type} 图片 照片 视觉素材`,
      preview,
      sourceUrl: preview,
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

  if (['pdf', 'excel', 'word', 'file'].includes(type)) {
    const sourceUrl = await readFileAsDataUrl(file)
    return {
      ...baseNote,
      content: buildDocumentSummary(file, type),
      sourceUrl,
    }
  }

  return {
    ...baseNote,
    content: `${file.name} 暂未读取正文，可通过文件名进行搜索。`,
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
  const blobUrl = URL.createObjectURL(blob)
  triggerFileDownload(note.title || `note-${note.id}.txt`, blobUrl)
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
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
          <h1>先登录，再进入你的笔记空间</h1>
          <p className="intro">
            登录页独立存在。登录成功后进入博客式工作台，笔记会随账号永久保存到服务器，再次进入或更换电脑后也能恢复。
          </p>
          <div className="status-strip">
            <span className="status-pill status-pill-strong">独立登录页</span>
            <span className="status-pill">博客式主站</span>
            <span className="status-pill">服务端永久保存</span>
          </div>
        </div>

        <div className="login-card">
          <div className="auth-tabs">
            <button
              className={authMode === 'login' ? 'is-active' : ''}
              type="button"
              onClick={() => onModeChange('login')}
            >
              登录
            </button>
            <button
              className={authMode === 'register' ? 'is-active' : ''}
              type="button"
              onClick={() => onModeChange('register')}
            >
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

function SelectionCheckbox({ checked, onChange, label }) {
  return (
    <label className="select-toggle" onClick={(event) => event.stopPropagation()}>
      <input type="checkbox" checked={checked} onChange={onChange} aria-label={label} />
      <span>选择</span>
    </label>
  )
}

function NoteCard({ note, isSelected, onToggleSelect, onOpen, onDelete }) {
  const showDocumentTeaser = ['pdf', 'excel', 'word', 'file'].includes(note.type)

  return (
    <article className={isSelected ? 'note-card is-selected' : 'note-card'}>
      <div className="card-select-row">
        <SelectionCheckbox
          checked={isSelected}
          onChange={() => onToggleSelect(note.id)}
          label={`选择笔记 ${note.title}`}
        />
      </div>

      <button className="note-card-main" type="button" onClick={() => onOpen(note)}>
        <div className="note-card-head">
          <span className={`format-pill format-${note.type}`}>{formatLabels[note.type]}</span>
          <span>{note.size}</span>
        </div>

        <h3>{note.title}</h3>
        <p className="note-meta">{note.createdAt}</p>

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
        <button className="danger-link" type="button" onClick={() => onDelete(note)}>
          删除
        </button>
      </div>
    </article>
  )
}

function TrashCard({ note, isSelected, onToggleSelect, onOpen, onRestore, onDeleteForever }) {
  return (
    <article className={isSelected ? 'trash-card is-selected' : 'trash-card'}>
      <div className="card-select-row">
        <SelectionCheckbox
          checked={isSelected}
          onChange={() => onToggleSelect(note.id)}
          label={`选择已删除笔记 ${note.title}`}
        />
      </div>

      <button className="trash-card-main" type="button" onClick={() => onOpen(note)}>
        <div className="note-card-head">
          <span className={`format-pill format-${note.type}`}>{formatLabels[note.type]}</span>
          <span>{note.size}</span>
        </div>
        <h3>{note.title}</h3>
        <p className="note-meta">删除时间：{note.deletedAt || '未知'}</p>
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
          </div>
          <div className="modal-actions">
            {!isDocument ? (
              <div className="zoom-controls">
                <button
                  className="modal-control"
                  type="button"
                  onClick={() => setZoom((current) => Math.max(0.6, Number((current - 0.1).toFixed(2))))}
                >
                  -
                </button>
                <button className="modal-control zoom-readout" type="button" onClick={() => setZoom(1)}>
                  {zoomPercent}%
                </button>
                <button
                  className="modal-control"
                  type="button"
                  onClick={() => setZoom((current) => Math.min(2, Number((current + 0.1).toFixed(2))))}
                >
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

function ConfirmModal({ config, onCancel, onConfirm, isWorking }) {
  if (!config) return null

  return (
    <div className="confirm-backdrop" role="presentation" onClick={onCancel}>
      <div className="confirm-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h3>{config.title}</h3>
        <p>{config.description}</p>
        <div className="confirm-actions">
          <button className="small-action" type="button" onClick={onCancel} disabled={isWorking}>
            取消
          </button>
          <button className="small-action danger-action" type="button" onClick={onConfirm} disabled={isWorking}>
            {isWorking ? '处理中...' : config.confirmText}
          </button>
        </div>
      </div>
    </div>
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
        <span>负责界面、交互和预览体验</span>
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
        <span>负责登录、接口和服务端存储</span>
      </div>

      <div className="blog-post-list">
        {backendPosts.map((post) => (
          <PostCard key={post.title} {...post} category="后端文章" />
        ))}
      </div>
    </section>
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
        <SelectionCheckbox
          checked={allSelected && totalCount > 0}
          onChange={onSelectAllToggle}
          label="全选当前列表"
        />
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

function NotesView({
  activeNotes,
  filteredNotes,
  selectedIds,
  isUploading,
  query,
  serverMessage,
  onQueryChange,
  onUpload,
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
          <p className="eyebrow">Notebook</p>
          <h2>笔记管理区</h2>
        </div>
        <span>上传、搜索、批量下载、批量删除</span>
      </div>

      <div className="notes-toolbar">
        <label className="upload-zone">
          <input type="file" multiple disabled={isUploading} accept={SUPPORTED_ACCEPT} onChange={onUpload} />
          <span className="upload-icon">+</span>
          <span className="upload-copy">
            <strong>{isUploading ? '正在读取并上传...' : '上传自己的笔记'}</strong>
            <small>支持图片、PDF、Excel、Word、TXT、Markdown、CSV/TSV 和 JSON</small>
          </span>
        </label>

        <label className="search-box">
          <span>搜索内容</span>
          <input
            type="search"
            value={query}
            placeholder="输入标题、正文、扩展名或格式关键词..."
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
            onToggleSelect={onToggleSelect}
            onOpen={onOpenNote}
            onDelete={onDeleteRequest}
          />
        ))}
      </div>

      {!filteredNotes.length ? <div className="empty-state">当前没有匹配的笔记，先上传一份试试。</div> : null}
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
        <span>正常笔记 {activeNotes.length} 份</span>
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

      {!trashedNotes.length ? <div className="empty-state">垃圾管理目前是空的。</div> : null}
    </section>
  )
}

function SidebarPanel({ activePage, session, activeNotes, trashedNotes }) {
  if (activePage === 'frontend') {
    return (
      <>
        <section className="sidebar-card card">
          <p className="eyebrow">Author</p>
          <h3>{profile.name}</h3>
          <p className="sidebar-text">{profile.role}</p>
          <p className="sidebar-text">{profile.location}</p>
          <p className="sidebar-text">{profile.status}</p>
        </section>

        <section className="sidebar-card card">
          <p className="eyebrow">特点</p>
          <h3>当前前端改造</h3>
          <ul className="sidebar-list">
            <li>登录页与主站分离，不再把登录放到内容页中。</li>
            <li>前端、后端、笔记、垃圾管理分别进入独立内容区。</li>
            <li>现在支持 PDF、Excel、Word、TXT 的上传，以及批量下载和批量删除。</li>
          </ul>
        </section>
      </>
    )
  }

  if (activePage === 'backend') {
    return (
      <>
        <section className="sidebar-card card">
          <p className="eyebrow">Server</p>
          <h3>账号与存储</h3>
          <p className="sidebar-text">当前账号：{session.username}</p>
          <p className="sidebar-text">数据文件：`data/db.json`</p>
          <p className="sidebar-text">重新打开网站后会根据登录态恢复服务端内容。</p>
        </section>

        <section className="sidebar-card card">
          <p className="eyebrow">能力</p>
          <h3>后端职责</h3>
          <ul className="sidebar-list">
            <li>注册、登录、退出登录。</li>
            <li>笔记导入、读取、移入垃圾管理、恢复、彻底删除。</li>
            <li>按用户隔离存储，换电脑后重新登录即可继续使用。</li>
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
            <li>第一次删除：弹出确认窗口，确认后进入垃圾管理。</li>
            <li>在垃圾管理中再次删除：才会从服务器彻底清除。</li>
            <li>已删除内容支持单个恢复，也支持批量恢复。</li>
          </ul>
        </section>

        <section className="sidebar-card card">
          <p className="eyebrow">统计</p>
          <h3>当前回收情况</h3>
          <p className="sidebar-text">垃圾管理文件数：{trashedNotes.length}</p>
          <p className="sidebar-text">正常笔记文件数：{activeNotes.length}</p>
        </section>
      </>
    )
  }

  return (
    <>
      <section className="sidebar-card card">
        <p className="eyebrow">当前账号</p>
        <h3>{session.username}</h3>
        <p className="sidebar-text">正常笔记：{activeNotes.length}</p>
        <p className="sidebar-text">垃圾管理：{trashedNotes.length}</p>
        <p className="sidebar-text">上传后的内容会自动保存到服务器。</p>
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

function WebsiteShell({
  activeNotes,
  trashedNotes,
  filteredNotes,
  selectedNoteIds,
  selectedTrashIds,
  query,
  isUploading,
  isDeleteWorking,
  serverMessage,
  session,
  activeNote,
  confirmConfig,
  activePage,
  onPageChange,
  onLogout,
  onQueryChange,
  onUpload,
  onOpenNote,
  onCloseNote,
  onDeleteRequest,
  onRestoreRequest,
  onDeleteForeverRequest,
  onToggleNoteSelect,
  onToggleTrashSelect,
  onToggleAllNotes,
  onToggleAllTrash,
  onClearNoteSelection,
  onClearTrashSelection,
  onBatchDownloadNotes,
  onBatchDeleteNotes,
  onBatchDownloadTrash,
  onBatchRestoreTrash,
  onBatchDeleteTrash,
  onCancelConfirm,
  onConfirmAction,
}) {
  const currentMeta = pageMeta[activePage]

  function renderMainView() {
    if (activePage === 'frontend') return <FrontendView />
    if (activePage === 'backend') return <BackendView />
    if (activePage === 'trash') {
      return (
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

    return (
      <NotesView
        activeNotes={activeNotes}
        filteredNotes={filteredNotes}
        selectedIds={selectedNoteIds}
        isUploading={isUploading}
        query={query}
        serverMessage={serverMessage}
        onQueryChange={onQueryChange}
        onUpload={onUpload}
        onOpenNote={onOpenNote}
        onDeleteRequest={onDeleteRequest}
        onToggleSelect={onToggleNoteSelect}
        onToggleSelectAll={onToggleAllNotes}
        onClearSelection={onClearNoteSelection}
        onBatchDownload={onBatchDownloadNotes}
        onBatchDelete={onBatchDeleteNotes}
      />
    )
  }

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
              <button
                key={key}
                className={activePage === key ? 'nav-tab is-active' : 'nav-tab'}
                type="button"
                onClick={() => onPageChange(key)}
              >
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
          <div className="blog-main">{renderMainView()}</div>
          <aside className="blog-sidebar">
            <SidebarPanel
              activePage={activePage}
              session={session}
              activeNotes={activeNotes}
              trashedNotes={trashedNotes}
            />
          </aside>
        </section>
      </main>

      <NoteModal note={activeNote} onClose={onCloseNote} />
      <ConfirmModal
        config={confirmConfig}
        onCancel={onCancelConfirm}
        onConfirm={onConfirmAction}
        isWorking={isDeleteWorking}
      />
    </>
  )
}

function App() {
  const [authMode, setAuthMode] = useState('login')
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [token, setToken] = useState('')
  const [session, setSession] = useState(null)
  const [notes, setNotes] = useState([])
  const [query, setQuery] = useState('')
  const [activePage, setActivePage] = useState('notes')
  const [activeNote, setActiveNote] = useState(null)
  const [confirmConfig, setConfirmConfig] = useState(null)
  const [selectedNoteIds, setSelectedNoteIds] = useState([])
  const [selectedTrashIds, setSelectedTrashIds] = useState([])
  const [isBooting, setIsBooting] = useState(true)
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleteWorking, setIsDeleteWorking] = useState(false)
  const [authMessage, setAuthMessage] = useState('注册后即可把笔记永久保存到服务器。')
  const [serverMessage, setServerMessage] = useState('服务端存储已启用。')

  async function refreshNotes(authToken) {
    const data = await apiFetch('/api/notes', { method: 'GET' }, authToken)
    const nextNotes = Array.isArray(data.notes) ? data.notes : []
    setNotes(nextNotes)
    return nextNotes
  }

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY)

    if (!storedToken) {
      setIsBooting(false)
      return
    }

    async function restoreSession() {
      try {
        const data = await apiFetch('/api/auth/me', {}, storedToken)
        setToken(storedToken)
        setSession(data.user)
        setNotes(Array.isArray(data.notes) ? data.notes : [])
        setServerMessage('已从服务端加载你的笔记。')
      } catch {
        window.localStorage.removeItem(TOKEN_KEY)
        setAuthMessage('登录状态已过期，请重新登录。')
      } finally {
        setIsBooting(false)
      }
    }

    restoreSession()
  }, [])

  const activeNotes = useMemo(() => notes.filter((note) => !note.deletedAt), [notes])
  const trashedNotes = useMemo(() => notes.filter((note) => note.deletedAt), [notes])

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return activeNotes

    return activeNotes.filter((note) =>
      [note.title, note.content, note.type, note.createdAt, note.extension, note.mimeType]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [activeNotes, query])

  useEffect(() => {
    setSelectedNoteIds((current) => current.filter((id) => filteredNotes.some((note) => note.id === id)))
  }, [filteredNotes])

  useEffect(() => {
    setSelectedTrashIds((current) => current.filter((id) => trashedNotes.some((note) => note.id === id)))
  }, [trashedNotes])

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

  function buildSelectionDescription(count, label, extra = '') {
    return `确认要${label}${count}个已选择的内容吗？${extra}`
  }

  function requestBatchAction(action, noteIds, title, confirmText, description, onSuccessPage = null) {
    if (!noteIds.length) return

    setConfirmConfig({
      action,
      noteIds,
      title,
      confirmText,
      description,
      onSuccessPage,
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
      setActivePage('notes')
      setSelectedNoteIds([])
      setSelectedTrashIds([])
      window.localStorage.setItem(TOKEN_KEY, data.token)
      setCredentials({ username: '', password: '' })
      setAuthMessage(authMode === 'login' ? '登录成功，正在进入主页。' : '注册成功，正在进入主页。')
      setServerMessage('服务端存储已启用，你的笔记会跟账号一起保存。')
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
      // Ignore logout API failures and clear local session anyway.
    }

    window.localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setSession(null)
    setNotes([])
    setQuery('')
    setActivePage('notes')
    setActiveNote(null)
    setConfirmConfig(null)
    setSelectedNoteIds([])
    setSelectedTrashIds([])
    setAuthMode('login')
    setAuthMessage('你已退出登录，请重新登录。')
    setServerMessage('服务端存储已启用。')
  }

  async function handleUpload(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length || !token) return

    setIsUploading(true)
    setServerMessage('正在读取文件并同步到服务器...')

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

      const nextNotes = Array.isArray(data.notes) ? data.notes : []
      setNotes(nextNotes)
      setActivePage('notes')
      setSelectedNoteIds([])
      setServerMessage(`上传成功，服务器中已保存 ${nextNotes.filter((note) => !note.deletedAt).length} 份正常资料。`)
      event.target.value = ''
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : '上传失败，请稍后重试。')
    } finally {
      setIsUploading(false)
    }
  }

  function requestMoveToTrash(note) {
    setConfirmConfig({
      action: 'trash',
      confirmText: '确认删除',
      description: `确认将“${note.title}”移入垃圾管理吗？移入后不会立刻彻底删除。`,
      noteIds: [note.id],
      title: '移动到垃圾管理',
    })
  }

  function requestRestore(note) {
    setConfirmConfig({
      action: 'restore',
      confirmText: '确认恢复',
      description: `确认恢复“${note.title}”吗？恢复后它会重新出现在正常笔记区。`,
      noteIds: [note.id],
      title: '恢复笔记',
    })
  }

  function requestDeleteForever(note) {
    setConfirmConfig({
      action: 'remove',
      confirmText: '彻底删除',
      description: `确认彻底删除“${note.title}”吗？这一步执行后将无法恢复。`,
      noteIds: [note.id],
      title: '彻底删除文件',
    })
  }

  function handleBatchDownload(collection, selectedIds, emptyMessage) {
    const selectedNotes = collection.filter((note) => selectedIds.includes(note.id))
    if (!selectedNotes.length) {
      setServerMessage(emptyMessage)
      return
    }

    selectedNotes.forEach((note, index) => {
      window.setTimeout(() => downloadNote(note), index * 180)
    })
    setServerMessage(`已开始下载 ${selectedNotes.length} 个文件。`)
  }

  async function handleConfirmAction() {
    if (!confirmConfig || !token) return

    const currentAction = confirmConfig
    const noteIds = Array.isArray(currentAction.noteIds) ? currentAction.noteIds : []
    setIsDeleteWorking(true)
    setConfirmConfig(null)

    try {
      const endpointMap = {
        remove: '/api/notes/remove',
        restore: '/api/notes/restore',
        trash: '/api/notes/trash',
      }

      for (const id of noteIds) {
        await apiFetch(
          endpointMap[currentAction.action],
          {
            method: 'POST',
            body: JSON.stringify({ id }),
          },
          token,
        )
      }

      await refreshNotes(token)
      setActiveNote((current) =>
        current && noteIds.includes(current.id) && currentAction.action !== 'restore' ? null : current,
      )

      if (currentAction.action === 'trash') {
        setSelectedNoteIds([])
        setServerMessage(noteIds.length > 1 ? `已将 ${noteIds.length} 个文件移入垃圾管理。` : '文件已移入垃圾管理。')
      } else if (currentAction.action === 'restore') {
        setSelectedTrashIds([])
        setServerMessage(noteIds.length > 1 ? `已恢复 ${noteIds.length} 个文件到正常笔记区。` : '文件已恢复到正常笔记区。')
      } else {
        setSelectedTrashIds([])
        setServerMessage(noteIds.length > 1 ? `已彻底删除 ${noteIds.length} 个文件。` : '文件已从垃圾管理中彻底删除。')
      }
    } catch (error) {
      setConfirmConfig(currentAction)
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
      trashedNotes={trashedNotes}
      filteredNotes={filteredNotes}
      selectedNoteIds={selectedNoteIds}
      selectedTrashIds={selectedTrashIds}
      query={query}
      isUploading={isUploading}
      isDeleteWorking={isDeleteWorking}
      serverMessage={serverMessage}
      session={session}
      activeNote={activeNote}
      confirmConfig={confirmConfig}
      activePage={activePage}
      onPageChange={setActivePage}
      onLogout={handleLogout}
      onQueryChange={setQuery}
      onUpload={handleUpload}
      onOpenNote={setActiveNote}
      onCloseNote={() => setActiveNote(null)}
      onDeleteRequest={requestMoveToTrash}
      onRestoreRequest={requestRestore}
      onDeleteForeverRequest={requestDeleteForever}
      onToggleNoteSelect={(id) => toggleSelection(setSelectedNoteIds, id)}
      onToggleTrashSelect={(id) => toggleSelection(setSelectedTrashIds, id)}
      onToggleAllNotes={() => toggleAllSelection(setSelectedNoteIds, filteredNotes, selectedNoteIds)}
      onToggleAllTrash={() => toggleAllSelection(setSelectedTrashIds, trashedNotes, selectedTrashIds)}
      onClearNoteSelection={() => setSelectedNoteIds([])}
      onClearTrashSelection={() => setSelectedTrashIds([])}
      onBatchDownloadNotes={() => handleBatchDownload(filteredNotes, selectedNoteIds, '请先选择要下载的笔记。')}
      onBatchDeleteNotes={() =>
        requestBatchAction(
          'trash',
          selectedNoteIds,
          '批量移动到垃圾管理',
          '确认批量删除',
          buildSelectionDescription(selectedNoteIds.length, '删除', '确认后会先移入垃圾管理。'),
        )
      }
      onBatchDownloadTrash={() => handleBatchDownload(trashedNotes, selectedTrashIds, '请先选择要下载的已删除文件。')}
      onBatchRestoreTrash={() =>
        requestBatchAction(
          'restore',
          selectedTrashIds,
          '批量恢复笔记',
          '确认批量恢复',
          buildSelectionDescription(selectedTrashIds.length, '恢复', '恢复后会重新出现在正常笔记区。'),
        )
      }
      onBatchDeleteTrash={() =>
        requestBatchAction(
          'remove',
          selectedTrashIds,
          '批量彻底删除',
          '确认彻底删除',
          buildSelectionDescription(selectedTrashIds.length, '彻底删除', '这一步执行后将无法恢复。'),
        )
      }
      onCancelConfirm={() => setConfirmConfig(null)}
      onConfirmAction={handleConfirmAction}
    />
  )
}

export default App
