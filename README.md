# 我的衣柜

移动端优先的个人数字衣柜 Web App。你可以把衣服拍照收进衣柜，按分类、季节、颜色、标签整理，创建穿搭，记录每天穿了什么，并导出自己的数据。

在线体验：[https://my-wardrobe-5l1.pages.dev](https://my-wardrobe-5l1.pages.dev)

## Features

- 添加、编辑、删除衣服，支持照片、分类、季节、颜色、价格、品牌、尺码、购买日期、购买渠道、标签和备注
- 衣柜搜索、分类筛选、颜色筛选、季节筛选、标签筛选和常用排序
- 创建、编辑、删除穿搭，并在衣服详情里查看关联穿搭
- 基于分类、季节和颜色规则生成轻量穿搭建议
- 记录衣服或穿搭的穿着日期和备注
- 穿着历史、月历视图、穿着次数、最近穿着、单次成本和衣柜洞察
- JSON 备份/恢复、CSV 导出、图片 ZIP 导出
- 本地优先存储：metadata 使用 `localStorage`，图片使用 IndexedDB Blob
- PWA 支持：生产环境可添加到手机主屏幕
- 可选 Cloudflare 云同步架构：D1 + R2 + Pages Functions，默认关闭

## Quick Start

```bash
npm install
npm run dev
```

打开 Vite 输出的本地地址即可使用。

生产构建：

```bash
npm run build
npm run preview
```

## Data And Privacy

默认情况下，所有数据都保存在你的浏览器里，不需要账号、数据库、后端服务或环境变量。

- 衣服、穿搭、穿着记录：`localStorage`
- 衣服图片：IndexedDB Blob
- 旧版 data URL 图片：会自动迁移到 IndexedDB

这意味着开源用户 clone 仓库后可以直接运行，不需要配置任何云资源。

## Optional Cloud Sync

云同步是可选部署能力，不是运行项目的前提。当前仓库已经包含 Cloudflare 方向的接口骨架和数据库迁移：

- D1：衣服、穿搭、穿着记录等结构化数据
- R2：衣服图片
- Pages Functions：`/api/session`、`/api/sync`、`/api/images/:itemId`

相关文档：

- [Cloud storage design](docs/cloud-storage.md)
- [Cloudflare binding example](wrangler.example.toml)
- [D1 migration](migrations/0001_cloud_schema.sql)

默认构建不会启用云同步 UI。后续接入登录后，可以把云同步作为托管版本的增强能力。

## Deployment

这是一个纯前端静态应用，生产文件会输出到 `dist/`。

```bash
npm run build
```

### Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Root directory: project root

### Vercel

项目包含 `vercel.json`，导入仓库后保持默认 Vite 配置即可。

### Netlify

项目包含 `netlify.toml`，导入仓库后使用 `npm run build` 和 `dist`。

## Project Structure

```txt
src/
  App.tsx            Main app UI and flows
  storage.ts         Local metadata persistence
  imageStore.ts      IndexedDB image blob storage
  wardrobeStore.ts   Storage adapter boundary
  zip.ts             Lightweight ZIP export helper
functions/api/       Optional Cloudflare Pages Functions
migrations/          Optional D1 schema
docs/                Product and cloud storage notes
public/              PWA manifest, icon, service worker
```

## Roadmap

- Auth and multi-user cloud sync
- Cloud image storage with R2 after R2 is enabled
- Import local data into a cloud account
- Tag/category management
- Better test coverage for storage, CSV/ZIP export, and outfit suggestions
- UI polish for larger screens

## License

[MIT](LICENSE)
