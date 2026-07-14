create table public.widget_settings (
    org_id uuid primary key,

    primary_color text,

    bot_name text,

    avatar_url text,

    welcome_message text,

    quick_questions jsonb default '[]'::jsonb,

    bubble_position text
        check (bubble_position in ('bottom-right', 'bottom-left'))
        default 'bottom-right',

    show_history_tab boolean not null default true,

    escalation_enabled boolean not null default false,

    updated_at timestamptz not null default now(),

    constraint widget_settings_org_id_fkey
        foreign key (org_id)
        references public.organizations(id)
        on delete cascade
);