# Personal Website

一个带账号登录、笔记上传、搜索和服务器持久化保存的个人网站。

## 当前功能

- 用户注册、登录、退出登录
- 上传笔记文件
- 识别图片、文本、CSV/TSV 表格、JSON 等内容
- 搜索当前账号下已上传的笔记
- 将账号和笔记保存到服务器 `data/db.json`

## 技术结构

- 前端：React + Vite
- 后端：Node.js 原生 HTTP 服务
- 数据存储：项目目录下的 `data/db.json`

## 目录说明

```text
FireWebsite/
  src/            前端页面
  public/         静态资源
  data/db.json    账号和笔记数据
  server.mjs      后端服务
```

## 本地开发

先安装依赖：

```bash
npm install
```

然后分别启动后端和前端：

```bash
npm run dev:server
npm run dev
```

默认情况下：

- 前端开发地址是 `http://localhost:5173`
- 后端接口地址是 `http://localhost:3100`

Vite 已经配置了 `/api` 代理，所以前端开发时不需要手动改接口地址。

## 生产运行

先构建前端：

```bash
npm run build
```

再启动网站服务：

```bash
npm start
```

默认生产访问地址：

```text
http://localhost:3100
```

## 数据保存位置

所有账号、登录会话和笔记内容都保存在：

```text
data/db.json
```

这意味着：

- 只要服务器上的 `data/db.json` 还在，用户重新登录后就能继续看到自己的笔记
- 如果删除这个文件，账号和笔记数据会一起丢失
- 如果服务器磁盘不持久化，重启或重建环境后数据可能丢失

## 更换电脑怎么继续使用

分两种情况。

### 1. 只是你换了一台电脑，但网站服务器没换

这种情况最简单：

1. 在新电脑上打开同一个网站地址
2. 使用原来的用户名和密码登录
3. 登录成功后，服务器会自动返回你之前保存的笔记

只要服务器端的 `data/db.json` 没丢，换电脑不会影响笔记。

### 2. 不只是换电脑，连服务器也换了

这种情况下，必须把旧服务器的数据文件一起带走：

```text
data/db.json
```

迁移步骤：

1. 在旧服务器上备份 `data/db.json`
2. 在新电脑或新服务器上部署项目
3. 把备份的 `data/db.json` 放回项目里的 `data/` 目录
4. 重新启动服务 `npm start`

完成后，原来的账号和笔记就会一起恢复。

## 部署提醒

这个项目现在不是纯静态网站，不能再直接部署到 GitHub Pages 这类纯静态托管平台并保留登录与服务器保存功能。

需要部署到支持 Node.js 后端运行的环境，例如：

- 云服务器
- 支持 Node.js 的应用托管平台
- 本地常驻运行的家庭服务器

## 验证命令

```bash
npm run build
npm run lint
node --check server.mjs
```
