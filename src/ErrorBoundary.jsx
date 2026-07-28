import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '40px 24px',
          color: '#17212f',
          fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei UI", sans-serif',
          background: 'linear-gradient(180deg, #f4f7fb 0%, #edf3f8 100%)',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '2rem', margin: '0 0 12px' }}>页面遇到了意外问题</h1>
          <p style={{ fontSize: '1.1rem', color: '#627084', maxWidth: 480, lineHeight: 1.6 }}>
            请刷新页面重试。如果问题持续出现，可以检查控制台输出。
          </p>
          <code style={{
            display: 'block',
            marginTop: 20,
            padding: '12px 20px',
            background: '#fff1ec',
            borderRadius: 10,
            color: '#c03221',
            fontSize: '0.85rem',
            maxWidth: '100%',
            overflowX: 'auto',
          }}>
            {String(this.state.error.message || '')}
          </code>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 24,
              padding: '10px 28px',
              background: '#db5a36',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            刷新页面
          </button>
        </div>
      )
    }

    return this.props.children
  }
}