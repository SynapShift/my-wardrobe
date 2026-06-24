# My Wardrobe

Language: [中文](README.md) | English

A mobile-first personal wardrobe web app. Add clothing photos, organize items by category, season, color, and tags, build outfits, track what you wore, and export your own data.

Live demo: [https://my-wardrobe-5l1.pages.dev](https://my-wardrobe-5l1.pages.dev)

## Features

- Add, edit, and delete clothing items with photo, custom category, season, color, price, brand, size, purchase date, purchase channel, tags, and notes
- Search and filter wardrobe items by custom category, color, season, and tags
- Create, edit, and delete outfits, with related outfits shown on item detail pages
- Generate lightweight outfit suggestions based on category, season, and color rules
- Log wear dates and notes for clothing items or outfits
- View wear history, a monthly calendar, wear counts, last worn dates, cost per wear, and wardrobe insights
- Export JSON backups, CSV files, and image ZIP archives
- Local-first storage: wardrobe metadata in `localStorage`, images as IndexedDB blobs
- PWA support for installable production deployments
- Optional Cloudflare cloud sync architecture with D1, R2, and Pages Functions, disabled by default

## Quick Start

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

Production build:

```bash
npm run build
npm run preview
```

## Data And Privacy

By default, all data stays in the browser. No account, database, backend service, or environment variable is required.

- Clothing items, outfits, and wear logs: `localStorage`
- Clothing images: IndexedDB blobs
- Legacy data URL images: automatically migrated into IndexedDB

This keeps the open source version easy to clone and run without cloud resources.

## Optional Cloud Sync

Cloud sync is an optional deployment capability, not a requirement. This repository already includes the Cloudflare-oriented API skeleton and database migration:

- D1 for structured wardrobe data
- R2 for clothing images
- Pages Functions for `/api/session`, `/api/sync`, and `/api/images/:itemId`

Related docs:

- [Cloud storage design](docs/cloud-storage.md)
- [Cloudflare binding example](wrangler.example.toml)
- [D1 migration](migrations/0001_cloud_schema.sql)

The default build does not show cloud sync UI. After authentication is added, cloud sync can become an enhancement for hosted deployments.

## Deployment

This is a static frontend app. Production assets are generated into `dist/`.

```bash
npm run build
```

### Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Root directory: project root

### Vercel

The project includes `vercel.json`. Import the repository and keep the default Vite settings.

### Netlify

The project includes `netlify.toml`. Use `npm run build` and `dist`.

## Project Structure

```txt
src/
  App.tsx            Main app UI and flows
  storage.ts         Local wardrobe data persistence
  imageStore.ts      IndexedDB image storage
  wardrobeStore.ts   Storage adapter boundary
  zip.ts             Lightweight ZIP export helper
functions/api/       Optional Cloudflare Pages Functions
migrations/          Optional D1 schema
docs/                Product and cloud storage design notes
public/              PWA manifest, icon, and service worker
```

## Roadmap

- Authentication and multi-user cloud sync
- Cloud image storage after R2 is enabled
- Import local data into a cloud account
- Tests for storage, CSV/ZIP export, and outfit suggestions
- Larger-screen UI polish

## License

[MIT](LICENSE)
