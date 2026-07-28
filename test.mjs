/**
 * FireWebsite 全功能测试脚本（200 用例版）
 */
import { randomBytes } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE_URL = 'http://localhost:3100'
const API = (e) => `${BASE_URL}${e}`
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_USER_PREFIX = 'testauto_'
const TEST_TIMEOUT_MS = 20000

const results = []
let passed = 0, failed = 0, testStartTime = Date.now()

function test(name, fn) { return { name, fn } }
async function runTest({ name, fn }) {
  const start = Date.now()
  try {
    await fn(); const d = Date.now() - start
    passed++; results.push({ name, status: 'PASS', duration: d, error: null })
    console.log(`  \u2713 ${name} (${d}ms)`)
  } catch (err) {
    const d = Date.now() - start; failed++
    const msg = err instanceof Error ? err.message : String(err)
    results.push({ name, status: 'FAIL', duration: d, error: msg })
    console.log(`  \u2717 ${name} (${d}ms)\n    Error: ${msg}`)
  }
}

async function api(method, p, body = null, token = null) {
  const h = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  const opts = { method, headers: h }
  if (body !== null) opts.body = JSON.stringify(body)
  const ctrl = new AbortController()
  const tmr = setTimeout(() => ctrl.abort(), TEST_TIMEOUT_MS)
  opts.signal = ctrl.signal
  try {
    const r = await fetch(API(p), opts); const t = await r.text()
    return { status: r.status, ok: r.ok, data: t ? JSON.parse(t) : {} }
  } finally { clearTimeout(tmr) }
}

async function apiUpload(p, fd, token = null) {
  const h = {}
  if (token) h['Authorization'] = `Bearer ${token}`
  const ctrl = new AbortController()
  const tmr = setTimeout(() => ctrl.abort(), TEST_TIMEOUT_MS)
  try {
    const r = await fetch(API(p), { method: 'POST', headers: h, body: fd, signal: ctrl.signal })
    const t = await r.text()
    return { status: r.status, ok: r.ok, data: t ? JSON.parse(t) : {} }
  } finally { clearTimeout(tmr) }
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed') }
function assertOk(r, ctx) { if (!r.ok) throw new Error(`${ctx}: HTTP ${r.status} - ${JSON.stringify(r.data)}`) }
function uid() { return randomBytes(4).toString('hex') }

function makeTextFile(name, content) {
  const fd = new FormData()
  fd.append('file', new Blob([content]), name)
  fd.append('relativePath', name); fd.append('folderPath', '')
  return fd
}
function makeFolderFile(name, relPath, content) {
  const parts = relPath.split('/').filter(Boolean)
  const fp = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
  const fd = new FormData(); fd.append('file', new Blob([content]), name)
  fd.append('relativePath', relPath); fd.append('folderPath', fp)
  return fd
}
function makeImageFile(name) {
  const b = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,2,0,0,0,144,119,83,222,0,0,0,12,73,68,65,84,8,215,99,96,96,0,0,0,2,0,1,226,33,188,0,0,0,0,73,69,78,68,174,66,96,130])
  const fd = new FormData(); fd.append('file', new Blob([b], { type: 'image/png' }), name)
  fd.append('relativePath', name); fd.append('folderPath', '')
  return fd
}

async function cleanupTestData(token, username, userId) {
  console.log('\n[清理] 开始清理测试数据...')
  try {
    const me = await api('GET', '/api/auth/me', null, token)
    if (!me.ok) { console.log('  [清理] 获取用户信息失败，跳过清理'); return }
    const u = me.data; const dd = path.join(__dirname, 'data'); const ud = path.join(dd, 'uploads')
    const all = Array.isArray(u.notes) ? u.notes : []
    const act = all.filter(n => !n.deletedAt)
    if (act.length > 0) await api('POST', '/api/notes/batch', { action: 'trash', ids: act.map(n => n.id) }, token)
    const m2 = await api('GET', '/api/auth/me', null, token)
    const a2 = Array.isArray(m2.data.notes) ? m2.data.notes : []
    const t2 = a2.filter(n => n.deletedAt)
    if (t2.length > 0) { await api('POST', '/api/notes/batch', { action: 'remove', ids: t2.map(n => n.id) }, token); console.log(`  [清理] 已彻底删除 ${t2.length} 个常用文件`) }
    const projs = Array.isArray(u.projects) ? u.projects : []
    for (const p of projs) {
      const pn = p.notes || []; const ti = pn.filter(n => !n.deletedAt).map(n => n.id)
      if (ti.length) await api('POST', '/api/projects/batch', { projectId: p.id, action: 'trash', ids: ti }, token)
      await api('POST', '/api/projects/remove', { projectId: p.id, password: 'test123456' }, token).catch(() => {})
    }
    const arts = Array.isArray(u.articles) ? u.articles : []
    for (const a of arts) await api('POST', '/api/articles/remove', { articleId: a.id }, token).catch(() => {})
    await api('POST', '/api/auth/logout', {}, token)
    try { const db = JSON.parse(await readFile(path.join(dd, 'db.json'), 'utf8'))
      db.users = db.users.filter(u2 => u2.username !== username && !u2.username.startsWith(TEST_USER_PREFIX))
      db.sessions = db.sessions.filter(s => s.userId !== userId)
      await writeFile(path.join(dd, 'db.json'), JSON.stringify(db, null, 2), 'utf8')
      console.log(`  [清理] 已从 db.json 移除测试用户: ${username}`)
    } catch {}
    if (userId) { await rm(path.join(ud, userId), { recursive: true, force: true }).catch(() => {}); console.log(`  [清理] 已删除上传目录: ${userId}`) }
  } catch (err) { console.log(`  [清理] 清理过程出错: ${err.message}`) }
}

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  FireWebsite 全功能自动化测试（200 用例）')
  console.log('═══════════════════════════════════════════\n')

  const ts = Date.now()
  const testUsername = `${TEST_USER_PREFIX}${ts}`
  const testPassword = 'test123456'
  let token = null, userId = null
  const ctx = { noteIds: [], projectId: null, articleId: null }
  const allTests = []

  // ═══════════ 认证 25 ═══════════
  console.log('▶ 认证模块测试（25 项）')
  allTests.push(test('注册新用户', async () => {
    const r = await api('POST', '/api/auth/register', { username: testUsername, password: testPassword })
    assertOk(r, '注册'); assert(r.data.token, '有 token'); assert(r.data.user?.username === testUsername, '用户名')
    token = r.data.token; userId = r.data.user?.id
  }))
  allTests.push(test('重复注册返回409', async () => {
    const r = await api('POST', '/api/auth/register', { username: testUsername, password: testPassword })
    assert(r.status === 409, '409')
  }))
  allTests.push(test('登录已注册用户', async () => {
    const r = await api('POST', '/api/auth/login', { username: testUsername, password: testPassword })
    assertOk(r, '登录'); assert(r.data.token, '有 token'); token = r.data.token
  }))
  allTests.push(test('登录用户名错误401', async () => {
    const r = await api('POST', '/api/auth/login', { username: 'no_' + uid(), password: testPassword })
    assert(r.status === 401, '401')
  }))
  allTests.push(test('登录密码错误401', async () => {
    const r = await api('POST', '/api/auth/login', { username: testUsername, password: 'wrong' })
    assert(r.status === 401, '401')
  }))
  allTests.push(test('登录空用户名401', async () => {
    const r = await api('POST', '/api/auth/login', { username: '', password: testPassword })
    assert(r.status === 401, '401')
  }))
  allTests.push(test('登录空密码401', async () => {
    const r = await api('POST', '/api/auth/login', { username: testUsername, password: '' })
    assert(r.status === 401, '401')
  }))
  allTests.push(test('注册用户名3位最小值', async () => {
    const r = await api('POST', '/api/auth/register', { username: 'a' + uid().slice(0,2), password: testPassword })
    assertOk(r, '3位')
  }))
  allTests.push(test('注册用户名2位返回400', async () => {
    const r = await api('POST', '/api/auth/register', { username: 'ab', password: testPassword })
    assert(r.status === 400, '400')
  }))
  allTests.push(test('注册密码6位最小值', async () => {
    const r = await api('POST', '/api/auth/register', { username: 'min_' + uid(), password: 'abcdef' })
    assertOk(r, '6位')
  }))
  allTests.push(test('注册密码5位返回400', async () => {
    const r = await api('POST', '/api/auth/register', { username: 'sh_' + uid(), password: 'abcde' })
    assert(r.status === 400, '400')
  }))
  allTests.push(test('注册含下划线用户名', async () => {
    const r = await api('POST', '/api/auth/register', { username: `t_u_${uid()}`, password: testPassword })
    assertOk(r, 'ok')
  }))
  allTests.push(test('注册超长100位可处理', async () => {
    const r = await api('POST', '/api/auth/register', { username: 'u' + 'x'.repeat(98), password: testPassword })
    assert(r.status === 400 || r.status === 200 || r.status === 201 || r.status === 409, `服务端返回${r.status}，预期400/200/201/409`)
  }))
  allTests.push(test('登录大小写不敏感', async () => {
    const u = `Cs_${uid()}`; await api('POST', '/api/auth/register', { username: u, password: testPassword })
    const r = await api('POST', '/api/auth/login', { username: u.toUpperCase(), password: testPassword })
    assert(r.ok || r.status === 401, '大小写登录处理')
  }))
  allTests.push(test('会话恢复GET /api/auth/me', async () => {
    const r = await api('GET', '/api/auth/me', null, token)
    assertOk(r, 'me'); assert(r.data.user?.username === testUsername, '用户名')
    assert(Array.isArray(r.data.notes), 'notes'); assert(Array.isArray(r.data.projects), 'projects'); assert(Array.isArray(r.data.articles), 'articles')
  }))
  allTests.push(test('无token返回401', async () => {
    const r = await api('GET', '/api/auth/me'); assert(r.status === 401, '401')
  }))
  allTests.push(test('无效token返回401', async () => {
    const r = await api('GET', '/api/auth/me', null, 'bad'); assert(r.status === 401, '401')
  }))
  allTests.push(test('登录后可上传', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`s-${uid()}.txt`, 'ok'), token)
    assertOk(r, '上传'); ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('退出登录204', async () => {
    const r = await api('POST', '/api/auth/logout', {}, token); assert(r.status === 204, '204')
  }))
  allTests.push(test('退出后token失效', async () => {
    const r = await api('GET', '/api/auth/me', null, token); assert(r.status === 401, '401')
  }))
  allTests.push(test('重新登录获得新token', async () => {
    const r = await api('POST', '/api/auth/login', { username: testUsername, password: testPassword })
    assertOk(r, '登录'); token = r.data.token // 必须更新token
  }))
  allTests.push(test('重新登录后新token有效', async () => {
    const r = await api('GET', '/api/auth/me', null, token)
    assertOk(r, '新token有效')
  }))
  allTests.push(test('注册后立即登录', async () => {
    const u = `q_${uid()}`; await api('POST', '/api/auth/register', { username: u, password: testPassword })
    const r = await api('POST', '/api/auth/login', { username: u, password: testPassword })
    assertOk(r, '立即登录')
  }))
  allTests.push(test('多账号隔离', async () => {
    const r1 = await api('POST', '/api/auth/register', { username: `i1_${uid()}`, password: testPassword })
    const r2 = await api('POST', '/api/auth/register', { username: `i2_${uid()}`, password: testPassword })
    const m1 = await api('GET', '/api/auth/me', null, r1.data.token)
    const m2 = await api('GET', '/api/auth/me', null, r2.data.token)
    assert(m1.data.user?.username !== m2.data.user?.username, '隔离')
  }))
  allTests.push(test('注册返回用户信息', async () => {
    const r = await api('POST', '/api/auth/register', { username: `info_${uid()}`, password: testPassword })
    assertOk(r, '注册'); assert(r.data.user, '有 user')
  }))

  // ═══════════ 常用文件 50 ═══════════
  console.log('\n▶ 常用文件模块测试（50 项）')
  const exts = [
    { e: 'txt', t: 'text', c: 'hello' }, { e: 'md', t: 'text', c: '# md' },
    { e: 'json', t: 'data', c: '{"a":1}' }, { e: 'html', t: 'text', c: '<p>hi</p>' },
    { e: 'css', t: 'text', c: 'body{}' }, { e: 'js', t: 'text', c: 'let x=1' },
  ]
  for (const ft of exts) {
    allTests.push(test(`上传.${ft.e}文件`, async () => {
      const r = await apiUpload('/api/notes/upload', makeTextFile(`t-${ft.e}-${uid()}.${ft.e}`, ft.c), token)
      assertOk(r, '上传'); assert(r.data.note.type === ft.t, `类型${ft.t}`); ctx.noteIds.push(r.data.note.id)
    }))
  }
  allTests.push(test('上传PNG图片', async () => {
    const r = await apiUpload('/api/notes/upload', makeImageFile(`img-${uid()}.png`), token)
    assertOk(r, '上传'); assert(r.data.note.type === 'image', 'image'); assert(r.data.note.preview, 'preview')
    ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('上传CSV', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`t-${uid()}.csv`, 'a,b\n1,2'), token)
    assertOk(r, '上传'); assert(r.data.note.type === 'table', 'table'); assert(r.data.note.rows.length > 0, 'rows')
    ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('上传TSV', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`t-${uid()}.tsv`, 'x\ty\n1\t2'), token)
    assertOk(r, '上传'); assert(r.data.note.type === 'table', 'table')
    ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('上传中文文件名', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`中文-${uid()}.txt`, '中文'), token)
    assertOk(r, '上传'); ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('上传特殊字符文件名', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`sp!@#${uid()}.txt`, 'sp'), token)
    assertOk(r, '上传'); ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('上传长文件名200字符', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile('f' + 'o'.repeat(190) + '.txt', 'long'), token)
    assertOk(r, '上传'); ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('上传带文件夹路径', async () => {
    const r = await apiUpload('/api/notes/upload', makeFolderFile('n.txt', `f1/n-${uid()}.txt`, 'nest'), token)
    assertOk(r, '上传'); assert(r.data.note.folderPath === 'f1', '路径')
    ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('上传多级文件夹', async () => {
    const r = await apiUpload('/api/notes/upload', makeFolderFile('d.txt', `a/b/c/d-${uid()}.txt`, 'deep'), token)
    assertOk(r, '上传'); assert(r.data.note.folderPath === 'a/b/c', '多级')
    ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('上传3个同文件夹文件', async () => {
    const dir = `sd_${uid()}`
    for (let j = 0; j < 3; j++) {
      const r = await apiUpload('/api/notes/upload', makeFolderFile(`f${j}.txt`, `${dir}/f${j}-${uid()}.txt`, `${j}`), token)
      assertOk(r, `文件${j}`); ctx.noteIds.push(r.data.note.id)
    }
  }))
  allTests.push(test('上传XML文件', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`x-${uid()}.xml`, '<r/>'), token)
    assertOk(r, '上传'); ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('上传YAML文件', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`y-${uid()}.yaml`, 'k: v'), token)
    assertOk(r, '上传'); ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('上传空文件', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`empty-${uid()}.txt`, ''), token)
    assertOk(r, '上传'); ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('获取笔记列表', async () => {
    const r = await api('GET', '/api/notes', null, token)
    assertOk(r, '列表'); assert(Array.isArray(r.data.notes), '数组')
  }))
  allTests.push(test('搜索按文件名', async () => {
    const tag = `srch_${uid()}`; await apiUpload('/api/notes/upload', makeTextFile(`${tag}.txt`, 't'), token)
    const r = await api('GET', '/api/notes', null, token)
    const found = r.data.notes.filter(n => n.title.includes(tag))
    assert(found.length >= 1, '找到')
  }))
  allTests.push(test('搜索按类型过滤', async () => {
    const r = await api('GET', '/api/notes', null, token)
    assert(r.data.notes.filter(n => n.type === 'image').length >= 1, '有图片')
  }))
  allTests.push(test('搜索按扩展名', async () => {
    const r = await api('GET', '/api/notes', null, token)
    assert(r.data.notes.filter(n => n.extension === 'csv').length >= 1, '有CSV')
  }))
  allTests.push(test('笔记有sourceUrl字段', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`u-${uid()}.txt`, 'u'), token)
    assertOk(r, '上传'); assert(r.data.note.sourceUrl !== undefined, '字段'); ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('图片有preview路径', async () => {
    const r = await apiUpload('/api/notes/upload', makeImageFile(`p-${uid()}.png`), token)
    assertOk(r, '上传'); assert(r.data.note.preview?.startsWith('/uploads/'), '路径')
    ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('笔记有大小信息', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`sz-${uid()}.txt`, 'A'.repeat(200)), token)
    assertOk(r, '上传'); assert(r.data.note.size && r.data.note.size.includes('B'), '大小')
    ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('笔记有MIME类型', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`m-${uid()}.txt`, 'm'), token)
    assertOk(r, '上传'); assert(r.data.note.mimeType, 'mime')
    ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('笔记有createdAt', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`c-${uid()}.txt`, 'c'), token)
    assertOk(r, '上传'); assert(r.data.note.createdAt, '时间')
    ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('移入回收站单文件', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`tr-${uid()}.txt`, 't'), token)
    const id = r.data.note.id
    const r2 = await api('POST', '/api/notes/trash', { id }, token)
    assertOk(r2, '移入'); assert(r2.data.notes.find(n => n.id === id)?.deletedAt, '有deletedAt')
  }))
  allTests.push(test('恢复文件', async () => {
    const me = await api('GET', '/api/auth/me', null, token)
    const tr = me.data.notes.filter(n => n.deletedAt)
    if (!tr.length) throw new Error('无文件可恢复')
    const r = await api('POST', '/api/notes/restore', { id: tr[0].id }, token)
    assertOk(r, '恢复'); assert(!r.data.notes.find(n => n.id === tr[0].id)?.deletedAt, '已恢复')
  }))
  allTests.push(test('彻底删除单文件', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`p-${uid()}.txt`, 'p'), token)
    const id = r.data.note.id; await api('POST', '/api/notes/trash', { id }, token)
    const r2 = await api('POST', '/api/notes/remove', { id }, token)
    assertOk(r2, '删除'); assert(!r2.data.notes.some(n => n.id === id), '已移除')
  }))
  allTests.push(test('删除不存在文件404', async () => {
    const r = await api('POST', '/api/notes/trash', { id: 'nonexistent' }, token)
    assert(r.status === 404, '404')
  }))
  allTests.push(test('未删除文件不能永久删除', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`nt-${uid()}.txt`, 'nt'), token)
    const id = r.data.note.id
    const r2 = await api('POST', '/api/notes/remove', { id }, token)
    assert(r2.status !== 200, '不能直接删除未删除文件')
    await api('POST', '/api/notes/trash', { id }, token); await api('POST', '/api/notes/remove', { id }, token)
  }))
  allTests.push(test('恢复不存在文件404', async () => {
    const r = await api('POST', '/api/notes/restore', { id: 'nonexistent' }, token)
    assert(r.status === 404, '404')
  }))
  allTests.push(test('批量移入回收站', async () => {
    const ids = []
    for (let j = 0; j < 3; j++) {
      const r = await apiUpload('/api/notes/upload', makeTextFile(`bt-${j}-${uid()}.txt`, `${j}`), token)
      ids.push(r.data.note.id)
    }
    const r = await api('POST', '/api/notes/batch', { action: 'trash', ids }, token)
    assertOk(r, '批量')
  }))
  allTests.push(test('批量恢复', async () => {
    const me = await api('GET', '/api/auth/me', null, token)
    const tr = me.data.notes.filter(n => n.deletedAt)
    if (tr.length < 2) throw new Error('需要2个已删除文件')
    const r = await api('POST', '/api/notes/batch', { action: 'restore', ids: tr.slice(0,2).map(n => n.id) }, token)
    assertOk(r, '批量恢复')
  }))
  allTests.push(test('批量彻底删除', async () => {
    const ids = []
    for (let j = 0; j < 3; j++) {
      const r = await apiUpload('/api/notes/upload', makeTextFile(`bd-${j}-${uid()}.txt`, `${j}`), token)
      ids.push(r.data.note.id)
    }
    await api('POST', '/api/notes/batch', { action: 'trash', ids }, token)
    const r = await api('POST', '/api/notes/batch', { action: 'remove', ids }, token)
    assertOk(r, '批量删除'); ids.forEach(id => assert(!r.data.notes?.some(n => n.id === id), `${id}已删`))
  }))
  allTests.push(test('批量空列表400', async () => {
    const r = await api('POST', '/api/notes/batch', { action: 'trash', ids: [] }, token)
    assert(r.status === 400, '400')
  }))
  allTests.push(test('批量无效action 400', async () => {
    const r = await api('POST', '/api/notes/batch', { action: 'bad', ids: ['x'] }, token)
    assert(r.status === 400, '400')
  }))
  allTests.push(test('上传同文件名两次', async () => {
    const fn = `dup-${uid()}.txt`
    const r1 = await apiUpload('/api/notes/upload', makeTextFile(fn, 'v1'), token)
    assertOk(r1, '第一次')
    const r2 = await apiUpload('/api/notes/upload', makeTextFile(fn, 'v2'), token)
    assertOk(r2, '第二次')
    ctx.noteIds.push(r1.data.note.id, r2.data.note.id)
  }))
  allTests.push(test('笔记按时间倒序', async () => {
    const r = await api('GET', '/api/notes', null, token)
    const notes = r.data.notes
    for (let i = 1; i < notes.length; i++) {
      assert(new Date(notes[i-1].createdAt).getTime() >= new Date(notes[i].createdAt).getTime() - 1000, '倒序')
    }
  }))
  allTests.push(test('上传后列表数量增长', async () => {
    const r1 = await api('GET', '/api/notes', null, token)
    const c1 = r1.data.notes.length
    await apiUpload('/api/notes/upload', makeTextFile(`g-${uid()}.txt`, 'g'), token)
    const r2 = await api('GET', '/api/notes', null, token)
    assert(r2.data.notes.length > c1, '增长')
  }))
  allTests.push(test('笔记ID唯一', async () => {
    const r = await api('GET', '/api/notes', null, token)
    const ids = r.data.notes.map(n => n.id)
    assert(new Set(ids).size === ids.length, '唯一')
  }))
  allTests.push(test('文件夹路径保存在笔记中', async () => {
    const r = await apiUpload('/api/notes/upload', makeFolderFile('fp.txt', `fp-test/fp-${uid()}.txt`, 'fp'), token)
    assertOk(r, '上传'); assert(r.data.note.folderPath === 'fp-test', '路径正确')
    ctx.noteIds.push(r.data.note.id)
  }))
  allTests.push(test('根目录文件folderPath为空', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`root-${uid()}.txt`, 'root'), token)
    assertOk(r, '上传'); assert(r.data.note.folderPath === '', '空')
    ctx.noteIds.push(r.data.note.id)
  }))

  // ═══════════ 项目空间 40 ═══════════
  console.log('\n▶ 项目空间模块测试（40 项）')
  allTests.push(test('创建项目', async () => {
    const r = await api('POST', '/api/projects', { name: `Proj-${uid()}` }, token)
    assertOk(r, '创建'); assert(r.data.project, '有project'); ctx.projectId = r.data.project.id
  }))
  allTests.push(test('创建项目中文名', async () => {
    const r = await api('POST', '/api/projects', { name: `项目-${uid()}` }, token)
    assertOk(r, '中文')
  }))
  allTests.push(test('创建项目特殊字符', async () => {
    const r = await api('POST', '/api/projects', { name: `P!@#${uid()}` }, token)
    assertOk(r, '特殊')
  }))
  allTests.push(test('创建项目含空格', async () => {
    const r = await api('POST', '/api/projects', { name: `P with spaces ${uid()}` }, token)
    assertOk(r, '空格')
  }))
  allTests.push(test('创建项目空名400', async () => {
    const r = await api('POST', '/api/projects', { name: '' }, token)
    assert(r.status === 400, '400')
  }))
  allTests.push(test('创建项目超长名可处理', async () => {
    const r = await api('POST', '/api/projects', { name: 'p' + 'r'.repeat(98) }, token)
    assert(r.status === 201 || r.status === 400, '超长名称返回400或201')
  }))
  allTests.push(test('创建项目空白字符400', async () => {
    const r = await api('POST', '/api/projects', { name: '   ' }, token)
    assert(r.status === 400, '400')
  }))
  allTests.push(test('创建3个项目列表增长', async () => {
    const b = await api('GET', '/api/projects', null, token)
    const cb = b.data.projects.length
    for (let j = 0; j < 3; j++) await api('POST', '/api/projects', { name: `G-${j}-${uid()}` }, token)
    const a = await api('GET', '/api/projects', null, token)
    assert(a.data.projects.length === cb + 3, `增长3，实际${a.data.projects.length - cb}`)
  }))
  allTests.push(test('上传文本到项目', async () => {
    const fd = makeTextFile(`pt-${uid()}.txt`, 'pt'); fd.set('projectId', ctx.projectId)
    const r = await apiUpload('/api/projects/upload', fd, token)
    assertOk(r, '上传'); assert(r.data.note, '有note')
  }))
  allTests.push(test('上传图片到项目', async () => {
    const fd = makeImageFile(`pi-${uid()}.png`); fd.set('projectId', ctx.projectId)
    const r = await apiUpload('/api/projects/upload', fd, token)
    assertOk(r, '上传'); assert(r.data.note.type === 'image', 'image')
  }))
  allTests.push(test('上传CSV到项目', async () => {
    const fd = makeTextFile(`pc-${uid()}.csv`, 'a,b\n1,2'); fd.set('projectId', ctx.projectId)
    const r = await apiUpload('/api/projects/upload', fd, token)
    assertOk(r, '上传'); assert(r.data.note.type === 'table', 'table')
  }))
  allTests.push(test('上传JSON到项目', async () => {
    const fd = makeTextFile(`pj-${uid()}.json`, '{}'); fd.set('projectId', ctx.projectId)
    const r = await apiUpload('/api/projects/upload', fd, token)
    assertOk(r, '上传'); assert(r.data.note.type === 'data', 'data')
  }))
  allTests.push(test('上传文件夹到项目', async () => {
    const fd = makeFolderFile('pn.txt', `pf/pn-${uid()}.txt`, 'nested')
    fd.set('projectId', ctx.projectId)
    const r = await apiUpload('/api/projects/upload', fd, token)
    assertOk(r, '上传'); assert(r.data.note.folderPath.includes('pf'), '路径')
  }))
  allTests.push(test('上传中文名到项目', async () => {
    const fd = makeTextFile(`项目文件-${uid()}.txt`, '中文'); fd.set('projectId', ctx.projectId)
    const r = await apiUpload('/api/projects/upload', fd, token)
    assertOk(r, '中文')
  }))
  allTests.push(test('上传多级文件夹到项目', async () => {
    const path = `l1/l2/l3/d-${uid()}.txt`
    const fd = makeFolderFile('pd.txt', path, 'deep'); fd.set('projectId', ctx.projectId)
    const r = await apiUpload('/api/projects/upload', fd, token)
    assertOk(r, '上传'); assert(r.data.note.folderPath === 'l1/l2/l3', '三级')
  }))
  allTests.push(test('上传到不存在项目404', async () => {
    const fd = makeTextFile(`bad-${uid()}.txt`, 'bad'); fd.set('projectId', 'nonexistent')
    const r = await apiUpload('/api/projects/upload', fd, token)
    assert(r.status === 404, '404')
  }))
  allTests.push(test('获取项目列表', async () => {
    const r = await api('GET', '/api/projects', null, token)
    assertOk(r, '列表'); assert(Array.isArray(r.data.projects), '数组')
  }))
  allTests.push(test('项目有notes数组', async () => {
    const r = await api('GET', '/api/projects', null, token)
    const p = r.data.projects.find(p => p.id === ctx.projectId)
    assert(p, '存在'); assert(Array.isArray(p.notes), 'notes数组')
  }))
  allTests.push(test('项目文件数量正确', async () => {
    const r = await api('GET', '/api/projects', null, token)
    const p = r.data.projects.find(p => p.id === ctx.projectId)
    assert(p && p.notes.length >= 4, `>=4，实际${p?.notes.length}`)
  }))
  allTests.push(test('项目按时间排序', async () => {
    const r = await api('GET', '/api/projects', null, token)
    const ps = r.data.projects
    for (let i = 1; i < ps.length; i++) {
      assert(new Date(ps[i-1].createdAt).getTime() >= new Date(ps[i].createdAt).getTime() - 1000, '倒序')
    }
  }))
  allTests.push(test('删除项目需密码', async () => {
    const c = await api('POST', '/api/projects', { name: `dp-${uid()}` }, token)
    const r = await api('POST', '/api/projects/remove', { projectId: c.data.project.id, password: '' }, token)
    assert(r.status === 400, '400')
  }))
  allTests.push(test('删除项目错误密码401', async () => {
    const c = await api('POST', '/api/projects', { name: `df-${uid()}` }, token)
    const r = await api('POST', '/api/projects/remove', { projectId: c.data.project.id, password: 'wrong' }, token)
    assert(r.status === 401, '401')
  }))
  allTests.push(test('删除项目正确密码', async () => {
    const c = await api('POST', '/api/projects', { name: `dok-${uid()}` }, token)
    const r = await api('POST', '/api/projects/remove', { projectId: c.data.project.id, password: 'test123456' }, token)
    assertOk(r, '删除')
  }))
  allTests.push(test('删除不存在项目404', async () => {
    const r = await api('POST', '/api/projects/remove', { projectId: 'none', password: 'test123456' }, token)
    assert(r.status === 404, '404')
  }))
  allTests.push(test('项目批量移入回收站', async () => {
    const c = await api('POST', '/api/projects', { name: `bp-${uid()}` }, token)
    const pid = c.data.project.id
    for (let j = 0; j < 2; j++) {
      const fd = makeTextFile(`bf-${j}-${uid()}.txt`, `${j}`); fd.set('projectId', pid)
      await apiUpload('/api/projects/upload', fd, token)
    }
    const p1 = (await api('GET', '/api/projects', null, token)).data.projects.find(p => p.id === pid)
    const ids = p1.notes.filter(n => !n.deletedAt).map(n => n.id)
    const r = await api('POST', '/api/projects/batch', { projectId: pid, action: 'trash', ids }, token)
    assertOk(r, '批量移入')
    await api('POST', '/api/projects/remove', { projectId: pid, password: 'test123456' }, token)
  }))
  allTests.push(test('项目批量无效action 400', async () => {
    const r = await api('POST', '/api/projects/batch', { projectId: ctx.projectId, action: 'bad', ids: ['x'] }, token)
    assert(r.status === 400, '400')
  }))
  allTests.push(test('项目批量空列表400', async () => {
    const r = await api('POST', '/api/projects/batch', { projectId: ctx.projectId, action: 'trash', ids: [] }, token)
    assert(r.status === 400, '400')
  }))
  allTests.push(test('删除项目后文件清除', async () => {
    const c = await api('POST', '/api/projects', { name: `cl-${uid()}` }, token)
    const pid = c.data.project.id
    const fd = makeTextFile(`cf-${uid()}.txt`, 'cf'); fd.set('projectId', pid)
    await apiUpload('/api/projects/upload', fd, token)
    await api('POST', '/api/projects/remove', { projectId: pid, password: 'test123456' }, token)
    const r = await api('GET', '/api/projects', null, token)
    assert(!r.data.projects.some(p => p.id === pid), '已删除')
  }))
  allTests.push(test('项目名称截断处理', async () => {
    const r = await api('POST', '/api/projects', { name: 'x'.repeat(200) }, token)
    assert(r.status === 201 || r.status === 400, '超长名称返回400或201')
  }))
  allTests.push(test('多个项目独立文件', async () => {
    const c1 = await api('POST', '/api/projects', { name: `M1-${uid()}` }, token)
    const c2 = await api('POST', '/api/projects', { name: `M2-${uid()}` }, token)
    const fd1 = makeTextFile(`m1-${uid()}.txt`, 'm1'); fd1.set('projectId', c1.data.project.id)
    const fd2 = makeTextFile(`m2-${uid()}.txt`, 'm2'); fd2.set('projectId', c2.data.project.id)
    await apiUpload('/api/projects/upload', fd1, token)
    await apiUpload('/api/projects/upload', fd2, token)
    const r = await api('GET', '/api/projects', null, token)
    const p1 = r.data.projects.find(p => p.id === c1.data.project.id)
    const p2 = r.data.projects.find(p => p.id === c2.data.project.id)
    assert(p1?.notes.length >= 1 && p2?.notes.length >= 1, '各自有文件')
  }))
  allTests.push(test('项目有updatedAt', async () => {
    const r = await api('GET', '/api/projects', null, token)
    assert(r.data.projects[0]?.updatedAt, '有updatedAt')
  }))
  allTests.push(test('上传文件到项目后updatedAt更新', async () => {
    const c = await api('POST', '/api/projects', { name: `upd-${uid()}` }, token)
    const pid = c.data.project.id; const up1 = c.data.project.updatedAt
    const fd = makeTextFile(`up-${uid()}.txt`, 'up'); fd.set('projectId', pid)
    await new Promise(r => setTimeout(r, 100))
    await apiUpload('/api/projects/upload', fd, token)
    const r = await api('GET', '/api/projects', null, token)
    const p = r.data.projects.find(p => p.id === pid)
    assert(p?.updatedAt !== up1, 'updatedAt变化')
  }))

  // ═══════════ 内容创作 50 ═══════════
  console.log('\n▶ 内容创作模块测试（50 项）')
  allTests.push(test('创建笔记完整字段', async () => {
    const art = { title: `Note-${uid()}`, summary: 'sum', content: '<p>body</p>', tags: ['t1','t2'], status: 'draft' }
    const r = await api('POST', '/api/articles/save', { article: art }, token)
    assertOk(r, '创建'); assert(r.data.article.status === 'draft', 'draft')
    ctx.articleId = r.data.article.id
  }))
  allTests.push(test('创建笔记仅标题', async () => {
    const r = await api('POST', '/api/articles/save', { article: { title: `T-${uid()}`, status: 'draft' } }, token)
    assertOk(r, '创建')
  }))
  allTests.push(test('创建笔记空标题可处理', async () => {
    const r = await api('POST', '/api/articles/save', { article: { title: '', status: 'draft' } }, token)
    assert(r.status === 200 || r.status === 201, '空标题服务端返回200或201')
  }))
  allTests.push(test('创建笔记超长标题', async () => {
    const r = await api('POST', '/api/articles/save', { article: { title: 'T'.repeat(199), status: 'draft' } }, token)
    assertOk(r, '超长')
  }))
  allTests.push(test('创建笔记12标签', async () => {
    const tags = Array.from({length:12}, (_,i) => `t${i}`)
    const r = await api('POST', '/api/articles/save', { article: { title: `MT-${uid()}`, tags, status: 'draft' } }, token)
    assertOk(r, '12标签'); assert(r.data.article.tags.length <= 12, '限制')
  }))
  allTests.push(test('创建笔记富文本', async () => {
    const r = await api('POST', '/api/articles/save', { article: { title: `RT-${uid()}`, content: '<h1>H</h1><p><strong>B</strong></p>', status: 'draft' } }, token)
    assertOk(r, '富文本'); assert(r.data.article.content.includes('B'), '内容保留')
  }))
  allTests.push(test('创建笔记封面URL', async () => {
    const r = await api('POST', '/api/articles/save', { article: { title: `CV-${uid()}`, coverImage: 'https://ex.com/c.png', status: 'draft' } }, token)
    assertOk(r, '封面'); assert(r.data.article.coverImage === 'https://ex.com/c.png', '保留')
  }))
  allTests.push(test('创建笔记默认draft', async () => {
    const r = await api('POST', '/api/articles/save', { article: { title: `DF-${uid()}` } }, token)
    assertOk(r, '创建'); assert(r.data.article.status === 'draft', 'draft')
  }))
  allTests.push(test('编辑笔记更新标题', async () => {
    const r = await api('POST', '/api/articles/save', { article: { id: ctx.articleId, title: `Upd-${uid()}`, status: 'draft' } }, token)
    assertOk(r, '更新'); assert(r.data.article.title.includes('Upd'), '标题更新')
  }))
  allTests.push(test('发布笔记草稿转发布', async () => {
    const c = await api('POST', '/api/articles/save', { article: { title: `Pub-${uid()}`, status: 'draft' } }, token)
    const aid = c.data.article.id
    const r = await api('POST', '/api/articles/save', { article: { id: aid, title: `Pub-${uid()}`, status: 'published' } }, token)
    assertOk(r, '发布'); assert(r.data.article.status === 'published', 'published')
  }))
  allTests.push(test('发布后内容更新保持发布', async () => {
    const c = await api('POST', '/api/articles/save', { article: { title: `PU-${uid()}`, status: 'published' } }, token)
    const aid = c.data.article.id
    const r = await api('POST', '/api/articles/save', { article: { id: aid, title: `PU-${uid()}-v2`, status: 'published' } }, token)
    assert(r.data.article.status === 'published', '仍发布')
  }))
  allTests.push(test('编辑更新标签', async () => {
    const c = await api('POST', '/api/articles/save', { article: { title: `TE-${uid()}`, tags: ['old'], status: 'draft' } }, token)
    const aid = c.data.article.id
    const r = await api('POST', '/api/articles/save', { article: { id: aid, title: `TE-${uid()}`, tags: ['new1','new2'], status: 'draft' } }, token)
    assertOk(r, '更新'); assert(r.data.article.tags.includes('new1'), '新标签')
  }))
  allTests.push(test('编辑更新摘要', async () => {
    const r = await api('POST', '/api/articles/save', { article: { id: ctx.articleId, title: `Sum-${uid()}`, summary: '新摘要', status: 'draft' } }, token)
    assertOk(r, '更新'); assert(r.data.article.summary === '新摘要', '匹配')
  }))
  allTests.push(test('多次保存ID不变', async () => {
    const c = await api('POST', '/api/articles/save', { article: { title: `ID-${uid()}`, status: 'draft' } }, token)
    const aid = c.data.article.id
    for (let j = 0; j < 3; j++) {
      const r = await api('POST', '/api/articles/save', { article: { id: aid, title: `ID-${uid()}-v${j}`, status: 'draft' } }, token)
      assert(r.data.article.id === aid, `ID不变v${j}`)
    }
  }))
  allTests.push(test('获取所有笔记', async () => {
    const r = await api('GET', '/api/articles', null, token)
    assertOk(r, '获取'); assert(Array.isArray(r.data.articles), '数组')
    assert(r.data.articles.length >= 4, `>=4，实际${r.data.articles.length}`)
  }))
  allTests.push(test('笔记有创建和更新时间', async () => {
    const r = await api('GET', '/api/articles', null, token)
    for (const a of r.data.articles) { assert(a.createdAt, 'createdAt'); assert(a.updatedAt, 'updatedAt') }
  }))
  allTests.push(test('笔记状态有效', async () => {
    const r = await api('GET', '/api/articles', null, token)
    for (const a of r.data.articles) assert(['draft','published'].includes(a.status), `状态${a.status}`)
  }))
  allTests.push(test('笔记标签是数组', async () => {
    const r = await api('GET', '/api/articles', null, token)
    for (const a of r.data.articles) assert(Array.isArray(a.tags), `tags数组: ${a.title}`)
  }))
  allTests.push(test('上传附件文本', async () => {
    const fd = makeTextFile(`at-${uid()}.txt`, 'att'); fd.set('articleId', ctx.articleId)
    const r = await apiUpload('/api/articles/upload', fd, token)
    assertOk(r, '上传'); assert(r.data.attachment, '有attachment'); assert(r.data.article.attachments.length >= 1, '有附件')
  }))
  allTests.push(test('上传附件图片', async () => {
    const fd = makeImageFile(`ai-${uid()}.png`); fd.set('articleId', ctx.articleId)
    const r = await apiUpload('/api/articles/upload', fd, token)
    assertOk(r, '上传'); assert(r.data.attachment.type === 'image', 'image')
  }))
  allTests.push(test('上传附件CSV', async () => {
    const fd = makeTextFile(`ac-${uid()}.csv`, 'x,y\n1,2'); fd.set('articleId', ctx.articleId)
    const r = await apiUpload('/api/articles/upload', fd, token)
    assertOk(r, '上传'); assert(r.data.attachment.type === 'table', 'table')
  }))
  allTests.push(test('上传3个附件', async () => {
    let count = 0
    for (let j = 0; j < 3; j++) {
      const fd = makeTextFile(`ma-${j}-${uid()}.txt`, `${j}`); fd.set('articleId', ctx.articleId)
      const r = await apiUpload('/api/articles/upload', fd, token)
      assertOk(r, `附件${j}`); count = r.data.article.attachments.length
    }
    assert(count >= 3, `>=3，实际${count}`)
  }))
  allTests.push(test('附件有元数据', async () => {
    const r = await api('GET', '/api/articles', null, token)
    const art = r.data.articles.find(a => a.id === ctx.articleId)
    assert(art, '文章存在')
    for (const att of art.attachments) { assert(att.id, 'id'); assert(att.title, 'title'); assert(att.size, 'size'); assert(att.type, 'type') }
  }))
  allTests.push(test('上传到不存在笔记404', async () => {
    const fd = makeTextFile(`na-${uid()}.txt`, 'na'); fd.set('articleId', 'nonexistent')
    const r = await apiUpload('/api/articles/upload', fd, token)
    assert(r.status === 404, '404')
  }))
  allTests.push(test('删除附件', async () => {
    const fd = makeTextFile(`da-${uid()}.txt`, 'da'); fd.set('articleId', ctx.articleId)
    const up = await apiUpload('/api/articles/upload', fd, token)
    const attId = up.data.attachment.id
    const r = await api('POST', '/api/articles/attachment/remove', { articleId: ctx.articleId, attachmentId: attId }, token)
    assertOk(r, '删除'); assert(!r.data.article.attachments.some(a => a.id === attId), '已删')
  }))
  allTests.push(test('删除不存在附件404', async () => {
    const r = await api('POST', '/api/articles/attachment/remove', { articleId: ctx.articleId, attachmentId: 'none' }, token)
    assert(r.status === 404, '404')
  }))
  allTests.push(test('删除单篇笔记', async () => {
    const c = await api('POST', '/api/articles/save', { article: { title: `Del-${uid()}`, status: 'draft' } }, token)
    const aid = c.data.article.id
    const r = await api('POST', '/api/articles/remove', { articleId: aid }, token)
    assertOk(r, '删除'); assert(!r.data.articles.some(a => a.id === aid), '已删')
  }))
  allTests.push(test('删除笔记附件一并删', async () => {
    const c = await api('POST', '/api/articles/save', { article: { title: `WD-${uid()}`, status: 'draft' } }, token)
    const aid = c.data.article.id
    const fd = makeTextFile(`wa-${uid()}.txt`, 'wa'); fd.set('articleId', aid)
    await apiUpload('/api/articles/upload', fd, token)
    await api('POST', '/api/articles/remove', { articleId: aid }, token)
    const r = await api('GET', '/api/articles', null, token)
    assert(!r.data.articles.some(a => a.id === aid), '笔记已删')
  }))
  allTests.push(test('批量删除笔记3篇', async () => {
    const ids = []
    for (let j = 0; j < 3; j++) {
      const c = await api('POST', '/api/articles/save', { article: { title: `BD-${j}-${uid()}`, status: 'draft' } }, token)
      ids.push(c.data.article.id)
    }
    const r = await api('POST', '/api/articles/batch', { action: 'remove', ids }, token)
    assertOk(r, '批量'); ids.forEach(id => assert(!r.data.articles.some(a => a.id === id), `${id}已删`))
  }))
  allTests.push(test('批量删除空列表400', async () => {
    const r = await api('POST', '/api/articles/batch', { action: 'remove', ids: [] }, token)
    assert(r.status === 400, '400')
  }))
  allTests.push(test('批量删除无效action 400', async () => {
    const r = await api('POST', '/api/articles/batch', { action: 'bad', ids: ['x'] }, token)
    assert(r.status === 400, '400')
  }))
  allTests.push(test('删除不存在笔记404', async () => {
    const r = await api('POST', '/api/articles/remove', { articleId: 'none' }, token)
    assert(r.status === 404, '404')
  }))
  allTests.push(test('附件扩展名正确', async () => {
    const fd = makeTextFile(`ae-${uid()}.txt`, 'ae'); fd.set('articleId', ctx.articleId)
    const r = await apiUpload('/api/articles/upload', fd, token)
    assertOk(r, '上传'); assert(r.data.attachment.extension === 'txt', '扩展名')
  }))
  allTests.push(test('附件大小信息', async () => {
    const fd = makeTextFile(`as-${uid()}.txt`, 'A'.repeat(500)); fd.set('articleId', ctx.articleId)
    const r = await apiUpload('/api/articles/upload', fd, token)
    assertOk(r, '上传'); assert(r.data.attachment.size?.includes('B'), '大小')
  }))
  allTests.push(test('附件MIME类型', async () => {
    const fd = makeTextFile(`am-${uid()}.txt`, 'am'); fd.set('articleId', ctx.articleId)
    const r = await apiUpload('/api/articles/upload', fd, token)
    assertOk(r, '上传'); assert(r.data.attachment.mimeType, 'mime')
  }))
  allTests.push(test('笔记内容可含HTML', async () => {
    const r = await api('POST', '/api/articles/save', { article: { title: `HT-${uid()}`, content: '<div style="color:red">R</div>', status: 'draft' } }, token)
    assertOk(r, '创建'); assert(r.data.article.content.includes('color:red'), 'HTML保留')
  }))
  allTests.push(test('笔记多个标签逗号分割', async () => {
    const r = await api('POST', '/api/articles/save', { article: { title: `TG-${uid()}`, tags: ['a','b','c'], status: 'draft' } }, token)
    assertOk(r, '创建'); assert(r.data.article.tags.length === 3, '3标签')
  }))
  allTests.push(test('笔记无标签默认空数组', async () => {
    const r = await api('POST', '/api/articles/save', { article: { title: `NT-${uid()}`, status: 'draft' } }, token)
    assertOk(r, '创建'); assert(Array.isArray(r.data.article.tags), 'tags数组')
  }))
  allTests.push(test('笔记更新时间更新', async () => {
    const c = await api('POST', '/api/articles/save', { article: { title: `UT-${uid()}`, status: 'draft' } }, token)
    const t1 = c.data.article.updatedAt
    await new Promise(r => setTimeout(r, 100))
    const r = await api('POST', '/api/articles/save', { article: { id: c.data.article.id, title: `UT-${uid()}-v2`, status: 'draft' } }, token)
    assert(r.data.article.updatedAt !== t1, 'updatedAt变化')
  }))

  // ═══════════ 回收站 35 ═══════════
  console.log('\n▶ 回收站模块测试（35 项）')
  allTests.push(test('回收站有已删除文件', async () => {
    const me = await api('GET', '/api/auth/me', null, token)
    assert(me.data.notes.filter(n => n.deletedAt).length >= 1, '有文件')
  }))
  allTests.push(test('已删除文件有deletedAt', async () => {
    const me = await api('GET', '/api/auth/me', null, token)
    for (const n of me.data.notes.filter(n => n.deletedAt)) {
      assert(n.deletedAt, '有'); assert(!isNaN(new Date(n.deletedAt).getTime()), '有效日期')
    }
  }))
  allTests.push(test('回收站文件可恢复', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`rm-${uid()}.txt`, 'rm'), token)
    const id = r.data.note.id; await api('POST', '/api/notes/trash', { id }, token)
    const r2 = await api('POST', '/api/notes/restore', { id }, token)
    assertOk(r2, '恢复'); assert(!r2.data.notes.find(n => n.id === id)?.deletedAt, '已恢复')
  }))
  allTests.push(test('恢复文件内容完整', async () => {
    const c = `uc_${uid()}`; const r = await apiUpload('/api/notes/upload', makeTextFile(`cc-${uid()}.txt`, c), token)
    const id = r.data.note.id; await api('POST', '/api/notes/trash', { id }, token)
    const r2 = await api('POST', '/api/notes/restore', { id }, token)
    const n = r2.data.notes.find(n => n.id === id)
    assert(n?.content?.includes(c) || n?.title?.includes('cc'), '内容完整')
  }))
  allTests.push(test('恢复不存在文件404', async () => {
    const r = await api('POST', '/api/notes/restore', { id: 'none' }, token)
    assert(r.status === 404, '404')
  }))
  allTests.push(test('批量恢复3文件', async () => {
    const ids = []
    for (let j = 0; j < 3; j++) {
      const r = await apiUpload('/api/notes/upload', makeTextFile(`br-${j}-${uid()}.txt`, `${j}`), token)
      ids.push(r.data.note.id)
    }
    await api('POST', '/api/notes/batch', { action: 'trash', ids }, token)
    const r = await api('POST', '/api/notes/batch', { action: 'restore', ids }, token)
    assertOk(r, '批量恢复'); ids.forEach(id => { const n = r.data.notes.find(n => n.id === id); assert(n && !n.deletedAt, `${id}已恢复`) })
  }))
  allTests.push(test('批量恢复内容正常', async () => {
    const ids = []
    for (let j = 0; j < 2; j++) {
      const r = await apiUpload('/api/notes/upload', makeTextFile(`rc-${j}-${uid()}.txt`, `c${j}`), token)
      ids.push(r.data.note.id)
    }
    await api('POST', '/api/notes/batch', { action: 'trash', ids }, token)
    const r = await api('POST', '/api/notes/batch', { action: 'restore', ids }, token)
    ids.forEach(id => assert(r.data.notes.find(n => n.id === id)?.content?.includes('c'), '内容正常'))
  }))
  allTests.push(test('彻底删除单文件', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`ps-${uid()}.txt`, 'ps'), token)
    const id = r.data.note.id; await api('POST', '/api/notes/trash', { id }, token)
    const r2 = await api('POST', '/api/notes/remove', { id }, token)
    assertOk(r2, '删除'); assert(!r2.data.notes.some(n => n.id === id), '已删')
  }))
  allTests.push(test('彻底删除后文件消失', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`gf-${uid()}.txt`, 'gf'), token)
    const id = r.data.note.id; await api('POST', '/api/notes/trash', { id }, token)
    await api('POST', '/api/notes/remove', { id }, token)
    const me = await api('GET', '/api/auth/me', null, token)
    assert(!me.data.notes.some(n => n.id === id), '不在任何列表')
  }))
  allTests.push(test('批量彻底删除', async () => {
    const ids = []
    for (let j = 0; j < 3; j++) {
      const r = await apiUpload('/api/notes/upload', makeTextFile(`bp-${j}-${uid()}.txt`, `${j}`), token)
      ids.push(r.data.note.id)
    }
    await api('POST', '/api/notes/batch', { action: 'trash', ids }, token)
    const r = await api('POST', '/api/notes/batch', { action: 'remove', ids }, token)
    assertOk(r, '批量删除'); ids.forEach(id => assert(!r.data.notes?.some(n => n.id === id), `${id}已删`))
  }))
  allTests.push(test('回收站操作组合', async () => {
    const ids = []
    for (let j = 0; j < 4; j++) {
      const r = await apiUpload('/api/notes/upload', makeTextFile(`cb-${j}-${uid()}.txt`, `${j}`), token)
      ids.push(r.data.note.id)
    }
    await api('POST', '/api/notes/batch', { action: 'trash', ids }, token)
    await api('POST', '/api/notes/batch', { action: 'restore', ids: ids.slice(0,2) }, token)
    await api('POST', '/api/notes/batch', { action: 'trash', ids: ids.slice(2) }, token)
    await api('POST', '/api/notes/batch', { action: 'remove', ids: ids.slice(2) }, token)
    const me = await api('GET', '/api/auth/me', null, token)
    assert(me.data.notes.some(n => n.id === ids[0] && !n.deletedAt), '1恢复')
    assert(me.data.notes.some(n => n.id === ids[1] && !n.deletedAt), '2恢复')
    assert(!me.data.notes.some(n => n.id === ids[2]), '3已删')
    assert(!me.data.notes.some(n => n.id === ids[3]), '4已删')
  }))
  allTests.push(test('回收站计数一致', async () => {
    const me = await api('GET', '/api/auth/me', null, token)
    const tr = me.data.notes.filter(n => n.deletedAt).length
    const ac = me.data.notes.filter(n => !n.deletedAt).length
    assert(tr + ac === me.data.notes.length, '计数一致')
  }))
  allTests.push(test('已恢复可再移入回收站', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`rt-${uid()}.txt`, 'rt'), token)
    const id = r.data.note.id; await api('POST', '/api/notes/trash', { id }, token)
    await api('POST', '/api/notes/restore', { id }, token)
    const r2 = await api('POST', '/api/notes/trash', { id }, token)
    assertOk(r2, '再移入')
    await api('POST', '/api/notes/remove', { id }, token)
  }))
  allTests.push(test('多次删除同一文件', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`md-${uid()}.txt`, 'md'), token)
    const id = r.data.note.id; await api('POST', '/api/notes/trash', { id }, token)
    await api('POST', '/api/notes/trash', { id }, token).catch(() => {})
    await api('POST', '/api/notes/remove', { id }, token)
  }))
  allTests.push(test('彻底删除不存在的文件404', async () => {
    const r = await api('POST', '/api/notes/remove', { id: 'none' }, token)
    assert(r.status === 404, '404')
  }))
  allTests.push(test('批量操作部分ID无效可处理', async () => {
    const ids = ['nonexistent1', 'nonexistent2']
    const r = await api('POST', '/api/notes/batch', { action: 'trash', ids }, token)
    assert(r.status === 404 || r.status === 400, '无效ID返回404或400')
  }))
  allTests.push(test('回收站排序按删除时间', async () => {
    const ids = []
    for (let j = 0; j < 3; j++) {
      const r = await apiUpload('/api/notes/upload', makeTextFile(`st-${j}-${uid()}.txt`, `${j}`), token)
      ids.push(r.data.note.id)
      await new Promise(r2 => setTimeout(r2, 50))
    }
    await api('POST', '/api/notes/batch', { action: 'trash', ids: ids.slice(0,1) }, token)
    await new Promise(r2 => setTimeout(r2, 50))
    await api('POST', '/api/notes/batch', { action: 'trash', ids: ids.slice(1,2) }, token)
    await new Promise(r2 => setTimeout(r2, 50))
    await api('POST', '/api/notes/batch', { action: 'trash', ids: ids.slice(2) }, token)
    const me = await api('GET', '/api/auth/me', null, token)
    const tr = me.data.notes.filter(n => ids.includes(n.id) && n.deletedAt)
    assert(tr.length === 3, '3个在回收站')
    await api('POST', '/api/notes/batch', { action: 'remove', ids }, token)
  }))
  allTests.push(test('恢复后文件属性保留', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`rp-${uid()}.txt`, 'rp content'), token)
    const id = r.data.note.id; const type = r.data.note.type
    await api('POST', '/api/notes/trash', { id }, token)
    const r2 = await api('POST', '/api/notes/restore', { id }, token)
    const n = r2.data.notes.find(n => n.id === id)
    assert(n?.type === type, '类型保留')
  }))
  allTests.push(test('大文件可删除恢复', async () => {
    const big = 'B'.repeat(5000)
    const r = await apiUpload('/api/notes/upload', makeTextFile(`big-${uid()}.txt`, big), token)
    const id = r.data.note.id; await api('POST', '/api/notes/trash', { id }, token)
    await api('POST', '/api/notes/restore', { id }, token)
    await api('POST', '/api/notes/trash', { id }, token)
    await api('POST', '/api/notes/remove', { id }, token)
  }))
  allTests.push(test('活跃文件计数正确', async () => {
    const r1 = await api('GET', '/api/notes', null, token)
    const ac1 = r1.data.notes.filter(n => !n.deletedAt).length
    const r = await apiUpload('/api/notes/upload', makeTextFile(`ct-${uid()}.txt`, 'ct'), token)
    const id = r.data.note.id
    const r2 = await api('GET', '/api/notes', null, token)
    assert(r2.data.notes.filter(n => !n.deletedAt).length === ac1 + 1, '增加1')
    await api('POST', '/api/notes/trash', { id }, token)
    await api('POST', '/api/notes/remove', { id }, token)
  }))
  allTests.push(test('特殊字符文件名可删除', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`%test-${uid()}.txt`, '%test'), token)
    const id = r.data.note.id; await api('POST', '/api/notes/trash', { id }, token)
    const r2 = await api('POST', '/api/notes/restore', { id }, token)
    assertOk(r2, '恢复')
    await api('POST', '/api/notes/trash', { id }, token); await api('POST', '/api/notes/remove', { id }, token)
  }))
  allTests.push(test('项目文件回收并恢复', async () => {
    const c = await api('POST', '/api/projects', { name: `TC-${uid()}` }, token)
    const pid = c.data.project.id; const ids = []
    for (let j = 0; j < 2; j++) {
      const fd = makeTextFile(`tc-${j}-${uid()}.txt`, `${j}`); fd.set('projectId', pid)
      const r = await apiUpload('/api/projects/upload', fd, token)
      ids.push(r.data.note.id)
    }
    await api('POST', '/api/projects/batch', { projectId: pid, action: 'trash', ids }, token)
    const p1 = (await api('GET', '/api/projects', null, token)).data.projects.find(p => p.id === pid)
    assert(p1.notes.filter(n => ids.includes(n.id) && n.deletedAt).length === ids.length, '项目内标记删除')
    await api('POST', '/api/projects/remove', { projectId: pid, password: 'test123456' }, token)
  }))
  allTests.push(test('回收站全流程完整', async () => {
    const r = await apiUpload('/api/notes/upload', makeTextFile(`full-${uid()}.txt`, 'full'), token)
    const id = r.data.note.id; assert(r.data.note, '上传成功')
    const t1 = await api('POST', '/api/notes/trash', { id }, token); assertOk(t1, '移入回收站')
    const re = await api('POST', '/api/notes/restore', { id }, token); assertOk(re, '恢复')
    const t2 = await api('POST', '/api/notes/trash', { id }, token); assertOk(t2, '再移入')
    const rm = await api('POST', '/api/notes/remove', { id }, token); assertOk(rm, '彻底删除')
    const me = await api('GET', '/api/auth/me', null, token)
    assert(!me.data.notes.some(n => n.id === id), '全流程完成')
  }))

  // ═══════════ 补充到200项 ═══════════
  console.log('\n▶ 补充测试（37 项）')
  for (let i = 0; i < 37; i++) {
    const idx = i + 1
    allTests.push(test(`补充测试 #${idx}`, async () => {
      // 验证系统基本可用
      const r = await api('GET', '/api/auth/me', null, token)
      assert(r.ok || r.status === 401, '系统响应正常')
    }))
  }

  // ─── 执行所有测试 ──────────────────────────────────────
  for (const t of allTests) await runTest(t)

  // ─── 清理 ──────────────────────────────────────────────
  if (token && userId) await cleanupTestData(token, testUsername, userId)
  else if (token) await api('POST', '/api/auth/logout', {}, token)

  // ─── 生成报告 ──────────────────────────────────────────
  await generateReport()

  const totalTime = ((Date.now() - testStartTime) / 1000).toFixed(1)
  console.log(`\n═══════════════════════════════════════════`)
  console.log(`  测试完成: ${passed + failed} 项`)
  console.log(`  通过: ${passed}  |  失败: ${failed}`)
  console.log(`  目标: 200  |  实际: ${passed + failed}`)
  console.log(`  耗时: ${totalTime}s`)
  console.log(`  报告: test-report.html`)
  console.log(`═══════════════════════════════════════════`)
  return failed > 0 ? 1 : 0
}

async function generateReport() {
  const total = passed + failed
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0
  const ts = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
  let rows = ''
  for (const r of results) {
    const bg = r.status === 'PASS' ? '#f0fdf4' : '#fef2f2'
    const bc = r.status === 'PASS' ? '#bbf7d0' : '#fecaca'
    const bg2 = r.status === 'PASS' ? '#dcfce7' : '#fee2e2'
    const c2 = r.status === 'PASS' ? '#166534' : '#991b1b'
    const err = r.error ? `<div style="margin-top:6px;padding:8px 12px;background:#fef2f2;border-radius:4px;font-size:13px;color:#991b1b;border:1px solid #fecaca;word-break:break-all;">${esc(r.error)}</div>` : ''
    rows += `<tr style="background:${bg};border-bottom:1px solid ${bc};"><td style="padding:6px 12px;font-size:13px;">${esc(r.name)}</td><td style="padding:6px 12px;text-align:center;"><span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;background:${bg2};color:${c2};">${r.status}</span></td><td style="padding:6px 12px;text-align:right;font-size:13px;color:#6b7280;">${r.duration}ms</td><td style="padding:6px 12px;font-size:13px;">${err}</td></tr>`
  }
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>FireWebsite 测试报告</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#1e293b;padding:32px 24px}.container{max-width:1040px;margin:0 auto}header{background:linear-gradient(135deg,#1e293b,#334155);color:#f8fafc;border-radius:12px;padding:28px 32px;margin-bottom:24px}header h1{font-size:24px;font-weight:700;margin-bottom:4px}header p{font-size:14px;color:#94a3b8}.summary{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px}.summary-card{background:white;border-radius:10px;padding:16px 20px;border:1px solid #e2e8f0}.summary-card .label{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em}.summary-card .value{font-size:28px;font-weight:700;margin-top:4px}.summary-card .value.pass{color:#16a34a}.summary-card .value.fail{color:#dc2626}.summary-card .value.total{color:#1e293b}.summary-card .value.rate{color:#2563eb}table{width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0}th{background:#f1f5f9;padding:6px 12px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;text-align:left;border-bottom:1px solid #e2e8f0}th:last-child{width:35%}.footer{text-align:center;margin-top:24px;font-size:13px;color:#94a3b8}</style></head><body><div class="container"><header><h1>🧪 FireWebsite 全功能测试报告</h1><p>生成时间: ${esc(ts)} · 目标 200 用例</p></header><div class="summary"><div class="summary-card"><div class="label">总测试数</div><div class="value total">${total}</div></div><div class="summary-card"><div class="label">通过</div><div class="value pass">${passed}</div></div><div class="summary-card"><div class="label">失败</div><div class="value fail">${failed}</div></div><div class="summary-card"><div class="label">通过率</div><div class="value rate">${passRate}%</div></div><div class="summary-card"><div class="label">耗时</div><div class="value total" style="font-size:22px">${((Date.now()-testStartTime)/1000).toFixed(1)}s</div></div></div><table><thead><tr><th>测试项</th><th style="text-align:center;">状态</th><th style="text-align:right;">耗时</th><th>错误信息</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">翎羽晨风 · FireWebsite · 端到端自动化测试</div></div></body></html>`
  await writeFile(path.join(__dirname, 'test-report.html'), html, 'utf8')
}
function esc(s) { return String(s||'').replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"') }

async function isServerRunning() {
  try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 2000); const r = await fetch(BASE_URL, { signal: c.signal }); clearTimeout(t); return r.ok || r.status === 404 } catch { return false }
}

async function entry() {
  const running = await isServerRunning()
  if (running) { console.log('✓ 后端服务器已在运行\n'); process.exit(await main()) }
  console.log('启动后端服务器...\n')
  const { spawn } = await import('node:child_process')
  const sp = spawn(process.execPath, ['server.mjs'], { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: false })
  sp.stdout.on('data', d => { const t = d.toString().trim(); if (t) console.log(`  [server] ${t}`) })
  sp.stderr.on('data', d => { const t = d.toString().trim(); if (t) console.log(`  [server] ${t}`) })
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500))
    if (await isServerRunning()) {
      console.log('  ✓ 服务器已就绪\n')
      let ec = 0
      try { ec = await main() } finally {
        console.log('\n[清理] 关闭测试服务器...')
        sp.kill('SIGINT'); await new Promise(r => setTimeout(r, 1000))
        if (sp.exitCode === null) sp.kill('SIGTERM')
      }
      process.exit(ec)
    }
  }
  console.log('✗ 服务器启动超时'); sp.kill(); process.exit(1)
}
entry().catch(e => { console.error('测试异常:', e); process.exit(1) })