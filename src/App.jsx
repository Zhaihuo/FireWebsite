import { useEffect, useMemo, useState } from 'react'
import './App.css'

const TOKEN_KEY = 'firewebsite-auth-token'

const profile = {
  name: 'firefire',
  role: '产品 / 前端 / 视觉设计',
  intro: '做一个简洁、稳定、随时能打开的个人网站，用来记录作品、想法和学习笔记。',
  location: 'Remote · China',
  status: 'Now shipping a login-based note library with cloud persistence.',
}

const projects = [
  {
    title: '个人主页重构',
    description: '把零散信息整理成一个干净的展示页，便于随时更新和分享。',
    tags: ['React', 'Vite', 'Static Hosting'],
  },
  {
    title: '账号笔记库',
    description: '用户注册登录后把笔记保存在服务器上，重新登录即可继续查看。',
    tags: ['Auth', 'Server Storage', 'Search'],
  },
  {
    title: '可复用组件库',
    description: '沉淀按钮、卡片和布局模块，让后续页面扩展更省心。',
    tags: ['Components', 'Design System', 'Reusable'],
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

function App() {
  const [authMode, setAuthMode] = useState('login')
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [token, setToken] = useState('')
  const [session, setSession] = useState(null)
  const [notes, setNotes] = useState([])
  const [query, setQuery] = useState('')
  const [isBooting, setIsBooting] = useState(true)
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [authMessage, setAuthMessage] = useState('注册后即可把笔记永久保存到服务器。')
  const [serverMessage, setServerMessage] = useState('请先登录，再上传自己的笔记。')

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
        setServerMessage('登录状态已过期，请重新登录。')
      } finally {
        setIsBooting(false)
      }
    }

    restoreSession()
  }, [])

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return notes

    return notes.filter((note) =>
      [note.title, note.content, note.type, note.createdAt]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [notes, query])

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
      setAuthMessage(authMode === 'login' ? '登录成功，笔记已连接到服务器。' : '注册成功，现在可以开始上传。')
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
    setServerMessage('你已退出登录。重新登录后可继续查看服务器中的笔记。')
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

      setNotes(Array.isArray(data.notes) ? data.notes : [])
      setServerMessage(`上传成功，服务器中已保存 ${Array.isArray(data.notes) ? data.notes.length : 0} 份资料。`)
      event.target.value = ''
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : '上传失败，请稍后重试。')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="hero card">
        <p className="eyebrow">Personal Website</p>
        <h1>{profile.name}</h1>
        <p className="role">{profile.role}</p>
        <p className="intro">{profile.intro}</p>

        <div className="hero-meta">
          <span>{profile.location}</span>
          <span>{profile.status}</span>
        </div>

        <div className="hero-actions">
          <a className="button button-primary" href="#auth">
            {session ? '管理账号' : '注册 / 登录'}
          </a>
          <a className="button button-secondary" href="#notes">
            查看笔记库
          </a>
        </div>

        <div className="status-strip">
          <span className="status-pill status-pill-strong">{session ? `当前账号：${session.username}` : '未登录'}</span>
          <span className="status-pill">数据保存位置：服务器 `data/db.json`</span>
          <span className="status-pill">再次登录后可恢复笔记</span>
        </div>
      </section>

      <section className="card section" id="about">
        <h2>个人简介</h2>
        <p>
          我喜欢把复杂事情整理得更简单，让页面看起来安静、清楚、好维护。
          现在这套网站已经从纯静态页面升级成了带账号系统的个人知识库。
        </p>
      </section>

      <section className="card section" id="auth">
        <div className="section-head">
          <div>
            <p className="eyebrow">Account</p>
            <h2>账号与同步</h2>
          </div>
          <span>注册、登录、服务器保存</span>
        </div>

        <div className="auth-grid">
          <div className="auth-card">
            <div className="auth-tabs">
              <button
                className={authMode === 'login' ? 'is-active' : ''}
                type="button"
                onClick={() => setAuthMode('login')}
              >
                登录
              </button>
              <button
                className={authMode === 'register' ? 'is-active' : ''}
                type="button"
                onClick={() => setAuthMode('register')}
              >
                注册
              </button>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <label>
                <span>用户名</span>
                <input
                  value={credentials.username}
                  onChange={(event) => updateCredential('username', event.target.value)}
                  placeholder="至少 3 位"
                  autoComplete="username"
                />
              </label>

              <label>
                <span>密码</span>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(event) => updateCredential('password', event.target.value)}
                  placeholder="至少 6 位"
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                />
              </label>

              <div className="auth-actions">
                <button className="button button-primary" type="submit" disabled={isSubmittingAuth || isBooting}>
                  {isSubmittingAuth ? '提交中...' : authMode === 'login' ? '登录账号' : '创建账号'}
                </button>

                {session ? (
                  <button className="button button-ghost" type="button" onClick={handleLogout}>
                    退出登录
                  </button>
                ) : null}
              </div>
            </form>

            <div className="auth-message">{isBooting ? '正在恢复登录状态...' : authMessage}</div>
          </div>

          <div className="auth-side">
            <h3>服务器保存方式</h3>
            <p className="server-hint">
              登录后，上传的笔记会通过 API 写入服务器文件，再次访问时只要重新登录同一账号就能读回。
              这一步不再依赖浏览器本地缓存。
            </p>

            <div className="auth-user">
              <div>
                <p className="auth-hint">当前状态</p>
                <h4>{session ? session.username : '尚未登录'}</h4>
              </div>
              <div>
                <p className="auth-hint">同步结果</p>
                <h4>{notes.length} 份笔记</h4>
              </div>
            </div>

            <div className="auth-message">{serverMessage}</div>
          </div>
        </div>
      </section>

      <section className="card section notes-section" id="notes">
        <div className="section-head">
          <div>
            <p className="eyebrow">Notebook</p>
            <h2>我的笔记库</h2>
          </div>
          <span>上传、识别、搜索</span>
        </div>

        <div className="notes-toolbar">
          <label className={`upload-zone ${session ? '' : 'is-disabled'}`}>
            <input
              type="file"
              multiple
              disabled={!session || isUploading}
              accept="image/*,.txt,.md,.csv,.tsv,.json,.html,.css,.js,.jsx"
              onChange={handleUpload}
            />
            <span className="upload-icon">+</span>
            <span className="upload-copy">
              <strong>{isUploading ? '正在读取并上传...' : session ? '上传自己的笔记' : '登录后才能上传'}</strong>
              <small>支持图片、Markdown、文本、CSV/TSV 表格和 JSON</small>
            </span>
          </label>

          <label className="search-box">
            <span>搜索</span>
            <input
              type="search"
              value={query}
              placeholder="输入标题、正文或格式..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="note-stats">
          <span>{notes.length} 份资料</span>
          <span>{filteredNotes.length} 条匹配</span>
          <span>{session ? '搜索范围为当前账号的服务器笔记' : '登录后显示你的服务器笔记'}</span>
        </div>

        <div className="notes-grid">
          {filteredNotes.map((note) => (
            <article className="note-card" key={note.id}>
              <div className="note-card-head">
                <span className={`format-pill format-${note.type}`}>{formatLabels[note.type]}</span>
                <span>{note.size}</span>
              </div>

              <h3>{note.title}</h3>
              <p className="note-meta">{note.createdAt}</p>

              {note.preview ? <img className="note-image" src={note.preview} alt={note.title} /> : null}

              {note.rows?.length ? (
                <div className="table-preview">
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
                  {note.content?.slice(0, 140)}
                  {note.content?.length > 140 ? '...' : ''}
                </p>
              )}
            </article>
          ))}
        </div>

        {!filteredNotes.length ? (
          <div className="empty-state">
            {session ? '当前账号还没有匹配的笔记，先上传一份试试。' : '请先登录，然后上传并搜索你的服务器笔记。'}
          </div>
        ) : null}
      </section>

      <section className="card section" id="projects">
        <div className="section-head">
          <h2>项目 / 作品</h2>
          <span>精选展示</span>
        </div>

        <div className="project-grid">
          {projects.map((project) => (
            <article className="project-card" key={project.title}>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <div className="tag-list">
                {project.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card section" id="contact">
        <div className="section-head">
          <h2>联系方式</h2>
          <span>随时可达</span>
        </div>

        <div className="link-list">
          {links.map((link) => (
            <a key={link.label} href={link.href}>
              <span>{link.label}</span>
              <span className="arrow">→</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
