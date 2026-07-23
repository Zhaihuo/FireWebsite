# 网站使用与编译说明

项目目录：

```powershell
C:\Users\Administrator\Desktop\PersonalWebsite\FireWebsite
```

## 进入项目

```powershell
cd C:\Users\Administrator\Desktop\PersonalWebsite\FireWebsite
```

## 本地开发预览

启动开发服务器：

```powershell
npm.cmd run dev
```

然后在浏览器打开终端显示的地址，一般是：

```text
http://localhost:5173/
```

修改网站内容主要编辑：

```text
src\App.jsx
```

## 编译网站

生成可发布的网站文件：

```powershell
npm.cmd run build
```

编译完成后会生成：

```text
dist
```

如果要手动部署网站，上传 `dist` 文件夹里的内容，不是上传整个项目。

## 查看编译后的效果

```powershell
npm.cmd run preview
```

然后在浏览器打开终端显示的地址，一般是：

```text
http://localhost:4173/
```

## 常用命令

```powershell
npm.cmd run dev      # 开发时看效果
npm.cmd run build    # 编译生成 dist
npm.cmd run preview  # 查看编译后的效果
```
