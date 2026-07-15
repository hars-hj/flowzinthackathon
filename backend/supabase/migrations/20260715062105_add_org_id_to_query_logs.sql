-- Add org_id column to query_logs
ALTER TABLE public.query_logs
ADD COLUMN org_id uuid;

-- Add foreign key constraint
ALTER TABLE public.query_logs
ADD CONSTRAINT query_logs_org_id_fkey
FOREIGN KEY (org_id)
REFERENCES public.organizations(id)
ON DELETE CASCADE;

-- Create index for faster filtering by organization
CREATE INDEX idx_query_logs_org_id
ON public.query_logs(org_id);