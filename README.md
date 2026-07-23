# Personal Website

一个可以直接部署到 GitHub Pages 的静态个人网站。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 发布

仓库配置了 GitHub Actions，推送到 `main` 后会自动构建并发布到 GitHub Pages。

如果你的仓库名不是当前项目名，请保留 `vite.config.js` 里的相对路径 `base: './'`，这样静态资源路径仍然可用。
