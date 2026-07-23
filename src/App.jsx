import { useEffect, useMemo, useState } from 'react'
import './App.css'

const TOKEN_KEY = 'firewebsite-auth-token'

const profile = {
  name: 'firefire',
  role: '产品 / 前端 / 视觉设计',
  intro: '把个人网站、上传笔记和服务器存储整理成一套更像技术博客的工作空间。',
  location: 'Remote · China',
  status: 'Frontend and backend are now separated into a blog-style workspace.',
}

const frontendPosts = [
  {
    title: '前端界面层：博客首页与笔记流',
    summary: '负责页面呈现、搜索交互、笔记卡片预览和独立登录页，重点是阅读体验与上传效率。',
    tags: ['React', 'UI', 'Search'],
  },
  {
    title: '笔记识别层：图片、表格与文本预览',
    summary: '上传后自动识别图片、CSV/TSV 表格、Markdown 与文本内容，并转换成适合浏览的预览块。',
    tags: ['Preview', 'Parser', 'Upload'],
  },
]

const backendPosts = [
  {
    title: '后端服务层：账号登录与会话校验',
    summary: '独立处理注册、登录、退出登录和 Token 校验，保证前端展示和账号系统职责分离。',
    tags: ['Auth', 'Token', 'API'],
  },
  {
    title: '数据存储层：服务器持久化保存',
    summary: '所有账号和笔记统一写入服务器 `data/db.json`，换电脑后只要重新登录即可恢复内容。',
    tags: ['Storage', 'Server', 'Persistence'],
  },
]

const links = [
  { label: 'GitHub', href: 'https://github.com/' },
  { label: '邮箱', href: 'mailto:2948756447@qq.com' },
  { label: '博客', href: '#' },
]

const formatLabels = {
  image: '图片',
  table: '表格',
  text: '文本',
  data: '数据',
  file: '文件',
}

function getFileType(file) {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (file.type.startsWith('image/')) return 'image'
  if (['csv', 'tsv'].includes(extension)) return 'table'

  if (
    file.type.startsWith('text/') ||
    ['md', 'txt', 'json', 'html', 'css', 'js', 'jsx'].includes(extension)
  ) {
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
          <h1>先登录，再进入你的技术笔记空间</h1>
          <p className="intro">
            登录页保持独立。登录成功后进入博客首页，前端展示与后端存储分栏呈现，笔记随账号保存在服务器中。
          </p>
          <div className="status-strip">
            <span className="status-pill status-pill-strong">独立登录页</span>
            <span className="status-pill">博客式首页</span>
            <span className="status-pill">服务器持久保存</span>
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

function NoteCard({ note, onOpen, onDelete }) {
  return (
    <article className="note-card">
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
        ) : (
          <p className="note-excerpt">
            {note.content?.slice(0, 170)}
            {note.content?.length > 170 ? '...' : ''}
          </p>
        )}
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

function TrashCard({ note, onOpen, onRestore, onDeleteForever }) {
  return (
    <article className="trash-card">
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

function NoteModal({ note, onClose }) {
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    setZoom(1)
  }, [note])

  if (!note) return null

  const zoomPercent = Math.round(zoom * 100)

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

          {!note.preview && !note.rows?.length ? (
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

function WebsiteShell({
  activeNotes,
  trashedNotes,
  filteredNotes,
  query,
  isUploading,
  isDeleteWorking,
  serverMessage,
  session,
  activeNote,
  confirmConfig,
  onLogout,
  onQueryChange,
  onUpload,
  onOpenNote,
  onCloseNote,
  onDeleteRequest,
  onRestoreRequest,
  onDeleteForeverRequest,
  onCancelConfirm,
  onConfirmAction,
}) {
  return (
    <>
      <main className="blog-shell">
        <header className="blog-topbar card">
          <div className="topbar-brand">
            <p className="eyebrow">Fire Coder Blog</p>
            <h2>{profile.name}</h2>
          </div>

          <nav className="topbar-nav">
            <a href="#frontend">前端</a>
            <a href="#backend">后端</a>
            <a href="#notes">笔记</a>
            <a href="#trash">已删除</a>
            <a href="#contact">联系</a>
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
            <p className="eyebrow">Tech Notebook</p>
            <h1>把前端页面、后端服务和个人笔记，整理成一个更像博客的知识入口</h1>
            <p className="intro">{profile.intro}</p>
          </div>

          <div className="hero-summary">
            <span className="status-pill status-pill-strong">当前账号：{session.username}</span>
            <span className="status-pill">服务器文件：`data/db.json`</span>
            <span className="status-pill">删除分为垃圾箱删除和彻底删除</span>
          </div>
        </section>

        <section className="blog-layout">
          <div className="blog-main">
            <section className="blog-section card" id="frontend">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Frontend</p>
                  <h2>前端展示层</h2>
                </div>
                <span>负责界面、交互、预览</span>
              </div>

              <div className="blog-post-list">
                {frontendPosts.map((post) => (
                  <PostCard key={post.title} {...post} category="前端文章" />
                ))}
              </div>
            </section>

            <section className="blog-section card" id="backend">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Backend</p>
                  <h2>后端服务层</h2>
                </div>
                <span>负责登录、接口、存储</span>
              </div>

              <div className="blog-post-list">
                {backendPosts.map((post) => (
                  <PostCard key={post.title} {...post} category="后端文章" />
                ))}
              </div>
            </section>

            <section className="blog-section card" id="notes">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Notebook</p>
                  <h2>已上传笔记</h2>
                </div>
                <span>搜索、预览、归档</span>
              </div>

              <div className="notes-toolbar">
                <label className="upload-zone">
                  <input
                    type="file"
                    multiple
                    disabled={isUploading}
                    accept="image/*,.txt,.md,.csv,.tsv,.json,.html,.css,.js,.jsx"
                    onChange={onUpload}
                  />
                  <span className="upload-icon">+</span>
                  <span className="upload-copy">
                    <strong>{isUploading ? '正在读取并上传...' : '上传自己的笔记'}</strong>
                    <small>支持图片、Markdown、文本、CSV/TSV 表格和 JSON</small>
                  </span>
                </label>

                <label className="search-box">
                  <span>搜索</span>
                  <input
                    type="search"
                    value={query}
                    placeholder="输入标题、正文或格式..."
                    onChange={(event) => onQueryChange(event.target.value)}
                  />
                </label>
              </div>

              <div className="note-stats">
                <span>{activeNotes.length} 份正常资料</span>
                <span>{filteredNotes.length} 条匹配</span>
                <span>{serverMessage}</span>
              </div>

              <div className="notes-feed">
                {filteredNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onOpen={onOpenNote}
                    onDelete={onDeleteRequest}
                  />
                ))}
              </div>

              {!filteredNotes.length ? <div className="empty-state">当前没有匹配的笔记，先上传一份试试。</div> : null}
            </section>

            <section className="blog-section card" id="trash">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Trash</p>
                  <h2>垃圾管理</h2>
                </div>
                <span>恢复或彻底删除</span>
              </div>

              <div className="note-stats">
                <span>{trashedNotes.length} 份已删除资料</span>
                <span>只有这里再次删除才会彻底消失</span>
              </div>

              <div className="trash-grid">
                {trashedNotes.map((note) => (
                  <TrashCard
                    key={note.id}
                    note={note}
                    onOpen={onOpenNote}
                    onRestore={onRestoreRequest}
                    onDeleteForever={onDeleteForeverRequest}
                  />
                ))}
              </div>

              {!trashedNotes.length ? <div className="empty-state">垃圾箱目前是空的。</div> : null}
            </section>
          </div>

          <aside className="blog-sidebar">
            <section className="sidebar-card card">
              <p className="eyebrow">Author</p>
              <h3>{profile.name}</h3>
              <p className="sidebar-text">{profile.role}</p>
              <p className="sidebar-text">{profile.location}</p>
              <p className="sidebar-text">{profile.status}</p>
            </section>

            <section className="sidebar-card card">
              <p className="eyebrow">删除规则</p>
              <h3>两段式删除</h3>
              <ul className="sidebar-list">
                <li>第一次删除：弹出确认窗口，确认后进入垃圾管理</li>
                <li>垃圾管理中再次删除：才会从服务器彻底清除</li>
                <li>已删除笔记支持恢复回正常笔记区</li>
              </ul>
            </section>

            <section className="sidebar-card card" id="contact">
              <p className="eyebrow">Contact</p>
              <h3>联系方式</h3>
              <div className="link-list compact-links">
                {links.map((link) => (
                  <a key={link.label} href={link.href}>
                    <span>{link.label}</span>
                    <span className="arrow">→</span>
                  </a>
                ))}
              </div>
            </section>
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
  const [activeNote, setActiveNote] = useState(null)
  const [confirmConfig, setConfirmConfig] = useState(null)
  const [isBooting, setIsBooting] = useState(true)
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleteWorking, setIsDeleteWorking] = useState(false)
  const [authMessage, setAuthMessage] = useState('注册后即可把笔记永久保存到服务器。')
  const [serverMessage, setServerMessage] = useState('服务器存储已启用。')

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
        setServerMessage('已从服务器加载你的笔记。')
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
      [note.title, note.content, note.type, note.createdAt]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [activeNotes, query])

  function updateCredential(key, value) {
    setCredentials((current) => ({ ...current, [key]: value }))
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
      window.localStorage.setItem(TOKEN_KEY, data.token)
      setCredentials({ username: '', password: '' })
      setAuthMessage(authMode === 'login' ? '登录成功，正在进入主页。' : '注册成功，正在进入主页。')
      setServerMessage('服务器存储已启用，你的笔记会跟账号一起保存。')
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
    setActiveNote(null)
    setConfirmConfig(null)
    setAuthMode('login')
    setAuthMessage('你已退出登录，请重新登录。')
    setServerMessage('服务器存储已启用。')
  }

  async function handleUpload(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length || !token) return

    setIsUploading(true)
    setServerMessage('正在读取文件并同步到服务器...')

    try {
      const uploadedNotes = await Promise.all(
        files.map(async (file) => {
          const type = getFileType(file)
          const createdAt = new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date())

          if (type === 'image') {
            const preview = await readFileAsDataUrl(file)
            return {
              id: `${file.name}-${file.lastModified}`,
              title: file.name,
              type,
              size: getFileSize(file.size),
              content: `${file.name} ${file.type} 图片 照片 视觉素材`,
              preview,
              rows: [],
              createdAt,
            }
          }

          if (['table', 'text', 'data'].includes(type)) {
            const content = await readFileAsText(file)
            return {
              id: `${file.name}-${file.lastModified}`,
              title: file.name,
              type,
              size: getFileSize(file.size),
              content,
              preview: null,
              rows: type === 'table' ? parseTable(content, file.name) : [],
              createdAt,
            }
          }

          return {
            id: `${file.name}-${file.lastModified}`,
            title: file.name,
            type,
            size: getFileSize(file.size),
            content: `${file.name} 暂未读取正文，可通过文件名搜索。`,
            preview: null,
            rows: [],
            createdAt,
          }
        }),
      )

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
      description: `确认将「${note.title}」移入垃圾管理吗？移入后不会立刻彻底删除。`,
      noteId: note.id,
      noteTitle: note.title,
      title: '移动到垃圾管理',
    })
  }

  function requestRestore(note) {
    setConfirmConfig({
      action: 'restore',
      confirmText: '确认恢复',
      description: `确认恢复「${note.title}」吗？恢复后它会重新出现在正常笔记区。`,
      noteId: note.id,
      noteTitle: note.title,
      title: '恢复笔记',
    })
  }

  function requestDeleteForever(note) {
    setConfirmConfig({
      action: 'remove',
      confirmText: '彻底删除',
      description: `确认彻底删除「${note.title}」吗？这一步执行后将无法恢复。`,
      noteId: note.id,
      noteTitle: note.title,
      title: '彻底删除文件',
    })
  }

  async function handleConfirmAction() {
    if (!confirmConfig || !token) return

    const currentAction = confirmConfig
    setIsDeleteWorking(true)
    setConfirmConfig(null)

    try {
      const endpointMap = {
        remove: '/api/notes/remove',
        restore: '/api/notes/restore',
        trash: '/api/notes/trash',
      }

      await apiFetch(
        endpointMap[currentAction.action],
        {
          method: 'POST',
          body: JSON.stringify({ id: currentAction.noteId }),
        },
        token,
      )

      await refreshNotes(token)
      setActiveNote((current) =>
        current?.id === currentAction.noteId && currentAction.action !== 'restore' ? null : current,
      )

      if (currentAction.action === 'trash') {
        setServerMessage('文件已移入垃圾管理。')
      } else if (currentAction.action === 'restore') {
        setServerMessage('文件已恢复到正常笔记区。')
      } else {
        setServerMessage('文件已从垃圾管理中彻底删除。')
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
      query={query}
      isUploading={isUploading}
      isDeleteWorking={isDeleteWorking}
      serverMessage={serverMessage}
      session={session}
      activeNote={activeNote}
      confirmConfig={confirmConfig}
      onLogout={handleLogout}
      onQueryChange={setQuery}
      onUpload={handleUpload}
      onOpenNote={setActiveNote}
      onCloseNote={() => setActiveNote(null)}
      onDeleteRequest={requestMoveToTrash}
      onRestoreRequest={requestRestore}
      onDeleteForeverRequest={requestDeleteForever}
      onCancelConfirm={() => setConfirmConfig(null)}
      onConfirmAction={handleConfirmAction}
    />
  )
}

export default App
