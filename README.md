# 我的衣柜

语言：中文 | [English](README.en.md)

一个移动端优先的个人数字衣柜网页应用。你可以把衣服拍照收进衣柜，按分类、季节、颜色和标签整理，创建穿搭，记录每天穿了什么，并导出自己的数据。

在线体验：[https://my-wardrobe-5l1.pages.dev](https://my-wardrobe-5l1.pages.dev)

## 功能特性

- 添加、编辑、删除衣服，支持照片、自定义分类、季节、颜色、价格、品牌、尺码、购买日期、购买渠道、标签和备注
- 衣柜搜索、自定义分类筛选、颜色筛选、季节筛选、标签筛选和常用排序
- 创建、编辑、删除穿搭，并在衣服详情里查看关联穿搭
- 基于分类、季节和颜色规则生成轻量穿搭建议
- 记录衣服或穿搭的穿着日期和备注
- 查看穿着历史、月历视图、穿着次数、最近穿着、单次成本和衣柜洞察
- 支持 JSON 备份/恢复、CSV 导出、图片 ZIP 导出
- 本地优先存储：衣柜数据保存在 `localStorage`，图片保存在 IndexedDB Blob
- 支持 PWA：生产环境可添加到手机主屏幕
- 可选 Cloudflare 云同步架构：D1 + R2 + Pages Functions，默认关闭

## 快速开始

```bash
npm install
npm run dev
```

打开 Vite 输出的本地地址即可使用。

生产构建：

```bash
npm run build
npm run preview
npm test
```

## 数据与隐私

默认情况下，所有数据都保存在你的浏览器里，不需要账号、数据库、后端服务或环境变量。

- 衣服、穿搭、穿着记录：`localStorage`
- 衣服图片：IndexedDB Blob
- 旧版 data URL 图片：会自动迁移到 IndexedDB

这意味着开源用户 clone 仓库后可以直接运行，不需要配置任何云资源。

## 可选云同步

云同步是可选部署能力，不是运行项目的前提。当前仓库已经包含 Cloudflare 方向的接口骨架和数据库迁移：

- D1：衣服、穿搭、穿着记录等结构化数据
- R2：衣服图片
- Pages Functions：`/api/session`、`/api/sync`、`/api/images/:itemId`

相关文档：

- [云端存储设计](docs/cloud-storage.md)
- [Cloudflare 绑定示例](wrangler.example.toml)
- [D1 数据库迁移](migrations/0001_cloud_schema.sql)

默认构建不会启用云同步界面。后续接入登录后，可以把云同步作为托管版本的增强能力。

## 部署

这是一个纯前端静态应用，生产文件会输出到 `dist/`。

```bash
npm run build
```

### Cloudflare Pages

- 构建命令：`npm run build`
- 输出目录：`dist`
- 根目录：项目根目录

### Vercel

项目包含 `vercel.json`，导入仓库后保持默认 Vite 配置即可。

### Netlify

项目包含 `netlify.toml`，导入仓库后使用 `npm run build` 和 `dist`。

## 项目结构

```txt
src/
  App.tsx            应用主界面和核心流程
  storage.ts         本地衣柜数据持久化
  imageStore.ts      IndexedDB 图片存储
  wardrobeStore.ts   存储适配层边界
  zip.ts             轻量 ZIP 导出工具
functions/api/       可选 Cloudflare Pages Functions
migrations/          可选 D1 数据库结构
docs/                产品和云端存储设计文档
public/              PWA manifest、图标、service worker
```

## 路线图

- 登录和多用户云同步
- R2 启用后的云端图片存储
- 将本地数据导入云端账号
- 扩大表单、导入导出和云同步测试覆盖
- 大屏界面优化

## 许可证

[MIT](LICENSE)
