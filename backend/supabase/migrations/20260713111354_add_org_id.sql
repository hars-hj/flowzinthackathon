-- Add org_id to conversations
ALTER TABLE public.conversations
ADD COLUMN org_id UUID;

ALTER TABLE public.conversations
ADD CONSTRAINT conversations_org_id_fkey
FOREIGN KEY (org_id)
REFERENCES public.organizations(id)
ON DELETE CASCADE;

CREATE INDEX conversations_org_id_idx
ON public.conversations(org_id);


-- Add org_id to document_chunks
ALTER TABLE public.document_chunks
ADD COLUMN org_id UUID;

ALTER TABLE public.document_chunks
ADD CONSTRAINT document_chunks_org_id_fkey
FOREIGN KEY (org_id)
REFERENCES public.organizations(id)
ON DELETE CASCADE;

CREATE INDEX document_chunks_org_id_idx
ON public.document_chunks(org_id);

