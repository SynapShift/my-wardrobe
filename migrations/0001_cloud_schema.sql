create table if not exists users (
  id text primary key,
  email text unique,
  display_name text,
  created_at text not null,
  updated_at text not null
);

create table if not exists clothing_items (
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

create index if not exists clothing_items_user_id_idx on clothing_items(user_id);

create table if not exists outfits (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  name text not null,
  item_ids_json text not null default '[]',
  scenario_tags_json text not null default '[]',
  notes text not null default '',
  created_at text not null,
  updated_at text not null
);

create index if not exists outfits_user_id_idx on outfits(user_id);

create table if not exists wear_logs (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  date text not null,
  item_ids_json text not null default '[]',
  outfit_id text,
  notes text not null default '',
  created_at text not null
);

create index if not exists wear_logs_user_id_date_idx on wear_logs(user_id, date);
