-- ============================
-- support_tickets
-- ============================

ALTER TABLE public.support_tickets
ADD COLUMN org_id uuid;

ALTER TABLE public.support_tickets
ADD CONSTRAINT support_tickets_org_id_fkey
FOREIGN KEY (org_id)
REFERENCES public.organizations(id)
ON DELETE CASCADE;

CREATE INDEX idx_support_tickets_org_id
ON public.support_tickets(org_id);

-- ============================
-- ticket_messages
-- ============================

ALTER TABLE public.ticket_messages
ADD COLUMN org_id uuid;

ALTER TABLE public.ticket_messages
ADD CONSTRAINT ticket_messages_org_id_fkey
FOREIGN KEY (org_id)
REFERENCES public.organizations(id)
ON DELETE CASCADE;

CREATE INDEX idx_ticket_messages_org_id
ON public.ticket_messages(org_id);

