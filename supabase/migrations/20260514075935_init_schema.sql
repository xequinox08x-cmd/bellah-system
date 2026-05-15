create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  created_at timestamp default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null,
  stock int default 0
);