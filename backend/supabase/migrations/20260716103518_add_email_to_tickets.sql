alter table support_tickets add column email text;
create index idx_support_tickets_org_email on support_tickets(org_id, email);
create index idx_support_tickets_org_session on support_tickets(org_id, session_id);