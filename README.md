# 我的衣柜

一个移动端优先的个人数字衣柜网页应用。支持添加衣服、分类整理、搜索筛选、穿搭组合、穿着记录、JSON/CSV/图片 ZIP 导出和 PWA 安装。

## 本地运行

```bash
npm install
npm run dev
```

打开 Vite 输出的本地地址即可使用。

## 当前范围

- P0: 本地衣柜 MVP
- P1: 穿搭组合与关联穿搭
- P2: 穿着记录和统计
- P3: 规则版穿搭推荐、分享图、导入导出、PWA 和可选云同步

图片会以 Blob 形式保存在 IndexedDB，衣服 metadata 保存在 localStorage。旧版 data URL 图片会在本地自动迁移。

## 存储模式

默认是本地模式，不需要数据库、账号或环境变量，适合开源用户直接运行。

云端同步会作为可选部署模式接入：计划使用 Cloudflare D1 保存衣柜 metadata、R2 保存图片、Pages Functions/Workers 提供 API。相关设计见 [docs/cloud-storage.md](docs/cloud-storage.md)，Cloudflare binding 样板见 [wrangler.example.toml](wrangler.example.toml)。

## PWA

生产构建会注册 service worker，并提供 `manifest.webmanifest`。部署到 HTTPS 后，可以在手机浏览器里使用“添加到主屏幕”安装。

```bash
npm run build
npm run preview
```

## 部署

这是一个纯前端静态应用，生产文件会输出到 `dist/`。

```bash
npm run build
```

- Vercel: 导入仓库后保持默认 Vite 配置即可，项目已包含 `vercel.json`。
- Netlify: 导入仓库后使用 `npm run build` 和 `dist`，项目已包含 `netlify.toml`。
- 静态服务器: 上传 `dist/` 目录，并把未知路径回退到 `index.html`。

详细规划见 [docs/product-plan.md](docs/product-plan.md)。
