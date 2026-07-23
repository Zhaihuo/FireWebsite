import './App.css'

const profile = {
  name: 'firefire',
  role: '产品 / 前端 / 视觉设计',
  intro:
    '做一个简洁、稳定、随时能打开的个人网站，用来记录作品、想法。',
  location: 'Remote · China',
  status: 'Currently building calm, useful web experiences.',
}

const projects = [
  {
    title: '个人主页重构',
    description: '把零散信息整理成一个干净的展示页，便于随时更新和分享。',
    tags: ['React', 'Vite', 'Static Hosting'],
  },
  {
    title: '轻量笔记系统',
    description: '记录想法、待办和灵感，优先保证打开快、维护轻。',
    tags: ['UI Design', 'Workflow', 'Minimal'],
  },
  {
    title: '可复用组件库',
    description: '沉淀按钮、卡片和布局模块，让后续页面扩展更省心。',
    tags: ['Components', 'Design System', 'Reusable'],
  },
]

const links = [
  { label: 'GitHub', href: 'https://github.com/' },
  { label: '邮箱', href: '2948756447@qq.com' },
  { label: '博客', href: '#' },
]

function App() {
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
          <a className="button button-primary" href="#projects">
            看作品
          </a>
          <a className="button button-secondary" href="#contact">
            联系我
          </a>
        </div>
      </section>

      <section className="card section" id="about">
        <h2>个人简介</h2>
        <p>
          我喜欢把复杂事情整理得更简单，让页面看起来安静、清楚、好维护。
          这个网站会持续放最新项目和联系方式，换电脑也能直接打开。
        </p>
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
              <span className="arrow">↗</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
