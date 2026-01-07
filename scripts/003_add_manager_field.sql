-- Add manager column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS manager TEXT;

-- Create index for better performance when filtering by manager
CREATE INDEX IF NOT EXISTS idx_employees_manager ON public.employees(manager);
