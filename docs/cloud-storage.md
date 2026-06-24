# Cloud Storage Design

The open source app must run without accounts, databases, secrets, or paid services. Cloud sync is an optional deployment mode for hosted demos or teams that want cross-device storage.

## Modes

### Local Mode

Default for open source users.

- Metadata: `localStorage`
- Images: IndexedDB blobs
- Login: none
- Required environment variables: none

### Cloud Mode

Optional hosted mode.

- Metadata: Cloudflare D1
- Images: Cloudflare R2
- API: Cloudflare Pages Functions or Workers
- Login: pluggable, starting with magic links or OAuth
- Required environment variables: deployment-specific

If cloud mode is not configured, the app should hide login and sync UI and continue using local mode.

## Frontend Boundary

The app talks to a single storage boundary:

```txt
UI -> WardrobeStore -> Local implementation
                  -> Cloud implementation later
```

Current code exposes `wardrobeStore` from `src/wardrobeStore.ts`. It defaults to local storage. `VITE_WARDROBE_STORAGE=cloud` currently falls back to local storage until the cloud implementation is added.

## Cloudflare Resources

Recommended Cloudflare layout:

- D1 database: wardrobe metadata and wear logs
- R2 bucket: clothing images
- Pages Functions or Worker routes: `/api/*`

## D1 Schema Draft

```sql
create table users (
  id text primary key,
  email text unique,
  display_name text,
  created_at text not null,
  updated_at text not null
);

create table clothing_items (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  name text not null,
  image_key text,
  category text not null,
  season text not null,
  primary_color text not null,
  purchase_price real,
  brand text,
  size text,
  purchase_date text,
  purchase_channel text,
  tags_json text not null default '[]',
  notes text not null default '',
  created_at text not null,
  updated_at text not null
);

create table outfits (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  name text not null,
  item_ids_json text not null default '[]',
  scenario_tags_json text not null default '[]',
  notes text not null default '',
  created_at text not null,
  updated_at text not null
);

create table wear_logs (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  date text not null,
  item_ids_json text not null default '[]',
  outfit_id text,
  notes text not null default '',
  created_at text not null
);
```

## R2 Key Draft

```txt
users/{userId}/items/{itemId}/original
```

## API Draft

```txt
GET    /api/session
POST   /api/auth/start
POST   /api/auth/verify
GET    /api/sync
PUT    /api/sync/items
PUT    /api/sync/outfits
PUT    /api/sync/wear-logs
POST   /api/images/:itemId
GET    /api/images/:itemId
DELETE /api/images/:itemId
```

## Rollout Plan

1. Keep local mode as default and stable.
2. Add Cloudflare D1 migration files and R2 binding config.
3. Add Pages Functions for session and sync APIs.
4. Add `CloudWardrobeStore`.
5. Show login/sync UI only when cloud mode is configured.
6. Add import flow from local data into cloud account.

## Current Implementation Status

- Local mode remains the default open source mode.
- `WardrobeStore` boundary exists in the frontend.
- D1 migration exists in `migrations/0001_cloud_schema.sql`.
- Cloudflare Pages Functions exist for `/api/session`, `/api/sync`, and `/api/images/:itemId`.
- Hosted D1 has been created and the schema has been applied.
- `/api/sync` has been deployed and verified against D1.
- R2 still needs to be enabled in the Cloudflare Dashboard before image cloud storage can be bound.
