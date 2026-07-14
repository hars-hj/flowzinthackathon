create extension if not exists pgcrypto;

create table public.organizations (
    id uuid primary key default gen_random_uuid(),

    name text not null,

    widget_key text not null unique
        check (widget_key like 'wk_live_%'),

    plan text not null default 'free',

    created_at timestamptz not null default now()
);