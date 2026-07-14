create table public.organization_members (
    id uuid primary key default gen_random_uuid(),

    org_id uuid not null,

    user_id uuid not null,

    role text not null
        check (role in ('owner', 'agent')),

    created_at timestamptz not null default now(),

    constraint organization_members_org_id_fkey
        foreign key (org_id)
        references public.organizations(id)
        on delete cascade,

    constraint organization_members_user_id_fkey
        foreign key (user_id)
        references auth.users(id)
        on delete cascade
);

create index idx_organization_members_org_id
    on public.organization_members(org_id);

create index idx_organization_members_user_id
    on public.organization_members(user_id);

create unique index idx_organization_members_org_user
    on public.organization_members(org_id, user_id);