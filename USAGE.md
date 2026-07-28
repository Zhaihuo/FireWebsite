# 网站使用与维护说明

项目目录：

```powershell
C:\Users\Administrator\Desktop\PersonalWebsite\FireWebsite
```

## 进入项目

```powershell
cd C:\Users\Administrator\Desktop\PersonalWebsite\FireWebsite
```

## 第一次使用

安装依赖：

```powershell
npm.cmd install
```

## 本地开发预览

现在网站包含前端和后端，所以开发时建议开两个终端。

终端 1：启动后端服务：

```powershell
npm.cmd run dev:server
```

终端 2：启动前端开发服务：

```powershell
npm.cmd run dev
```

然后在浏览器打开：

```text
http://localhost:5173/
```

## 正式运行网站

先编译前端：

```powershell
npm.cmd run build
```

再启动正式服务：

```powershell
npm.cmd start
```

然后打开：

```text
http://localhost:3100/
```

## 一键启动方式

如果你不想自己手动输入命令，可以直接双击项目根目录里的：

```text
start_fire_website.bat
```

这个脚本会自动完成：

1. 检查 Node.js
2. 检查并安装依赖（如果还没安装）
3. 编译前端
4. 启动后端服务
5. 自动打开浏览器到网站地址

默认打开地址：

```text
http://localhost:3100/
```

## 使用账号和笔记

1. 打开网站
2. 点击“注册 / 登录”
3. 第一次使用时先注册账号
4. 登录后上传笔记、图片或表格
5. 上传成功后，内容会保存到服务器
6. 下次打开网站，登录同一个账号即可恢复笔记

## 支持上传的内容

- 图片：`png`、`jpg`、`jpeg`、`webp` 等浏览器支持的图片
- 文本：`txt`、`md`、`html`、`css`、`js`、`jsx`
- 表格：`csv`、`tsv`
- 数据：`json`

## 搜索笔记

登录后，在“我的笔记库”里的搜索框输入关键词即可。

搜索范围包括：

- 文件名
- 文本正文
- 表格内容
- 文件类型
- 上传时间

## 数据保存在哪里

账号、密码哈希、登录会话和笔记都保存在项目里的：

```text
data\db.json
```

请不要随便删除这个文件。

## 更换电脑时怎么使用

### 情况一：网站还在同一台服务器上

如果只是你换了一台电脑，网站服务器没有变，不需要拷贝任何文件。

操作方法：

1. 在新电脑浏览器打开原来的网站地址
2. 输入原来的用户名和密码
3. 登录后即可看到之前上传的笔记

原因是笔记保存在服务器，不保存在电脑浏览器里。

### 情况二：网站也要搬到新电脑或新服务器

这种情况需要迁移数据文件。

旧电脑或旧服务器上要备份：

```text
data\db.json
```

新电脑或新服务器上操作：

1. 安装 Node.js
2. 拷贝整个项目到新电脑
3. 执行 `npm.cmd install`
4. 把旧的 `data\db.json` 覆盖到新项目的 `data` 目录
5. 执行 `npm.cmd run build`
6. 执行 `npm.cmd start`
7. 打开 `http://localhost:3100/`
8. 用原账号登录

只要 `data\db.json` 已经迁移，原账号和笔记都会保留。

## 备份建议

建议定期备份：

```text
data\db.json
```

可以复制到：

- U 盘
- 移动硬盘
- 云盘
- 服务器备份目录

备份频率建议：

- 只是偶尔上传笔记：每周备份一次
- 经常上传重要资料：每天备份一次
- 上传后特别重要：上传完立刻备份一次

## 常用命令

```powershell
npm.cmd run dev:server  # 启动后端接口
npm.cmd run dev         # 启动前端开发预览
npm.cmd run build       # 编译前端
npm.cmd start           # 启动正式网站
npm.cmd run lint        # 检查代码
```

## 注意事项

- 现在网站有后端，不能只上传 `dist` 文件夹来保存账号笔记功能
- 如果部署到云服务器，要确保 `data` 目录不会在重启或重新部署时被清空
- `data\db.json` 里有账号和笔记数据，不建议公开到互联网上
- 当前版本适合个人使用；如果要多人长期正式使用，建议后续升级到数据库和更完整的权限系统


用户名：FireFire
密码：Fire20260723

执行测试用例
node test.mjs
