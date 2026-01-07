-- Add IP address and geolocation fields to time_entries
ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Create audit_logs table for tracking all system actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL CHECK (action_type IN ('clock_in', 'clock_out', 'employee_registered', 'employee_added', 'admin_login', 'employee_login')),
  employee_email TEXT,
  employee_name TEXT,
  ip_address TEXT,
  location_data JSONB,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for audit_logs (read-only for everyone)
CREATE POLICY "audit_logs_select_all" 
  ON public.audit_logs FOR SELECT 
  USING (true);

-- Allow inserts for audit logging
CREATE POLICY "audit_logs_insert_all" 
  ON public.audit_logs FOR INSERT 
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_employee_email ON public.audit_logs(employee_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_ip_address ON public.time_entries(ip_address);
