-- Jalankan di Supabase: SQL Editor > New query > Run

create table if not exists orders (
  id            text primary key,
  game          text not null,
  game_name     text not null,
  sku           text not null,
  product_name  text not null,
  account_id    text not null,
  zone          text,
  customer_no   text not null,
  price         integer not null,
  cost          integer not null,
  pay_method    text not null,
  pay_ref       text,
  pay_url       text,
  email         text,
  status        text not null default 'pending_payment',
  sn            text,
  message       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  paid_at       timestamptz,
  done_at       timestamptz
);

create index if not exists orders_status_idx on orders (status, created_at desc);

create table if not exists kv (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- RLS aktif tanpa policy = hanya service_role (server kamu) yang bisa akses.
alter table orders enable row level security;
alter table kv enable row level security;
