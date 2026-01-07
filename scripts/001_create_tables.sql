-- Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_email TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  location TEXT NOT NULL CHECK (location IN ('office', 'remote')),
  hours_worked NUMERIC(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees table
-- Allow anyone to read employees (for admin dashboard)
CREATE POLICY "employees_select_all" 
  ON public.employees FOR SELECT 
  USING (true);

-- Allow anyone to insert new employees (for self-registration)
CREATE POLICY "employees_insert_all" 
  ON public.employees FOR INSERT 
  WITH CHECK (true);

-- RLS Policies for time_entries table
-- Allow anyone to read all time entries (for admin dashboard)
CREATE POLICY "time_entries_select_all" 
  ON public.time_entries FOR SELECT 
  USING (true);

-- Allow anyone to insert time entries (for clock in)
CREATE POLICY "time_entries_insert_all" 
  ON public.time_entries FOR INSERT 
  WITH CHECK (true);

-- Allow anyone to update time entries (for clock out)
CREATE POLICY "time_entries_update_all" 
  ON public.time_entries FOR UPDATE 
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON public.time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON public.time_entries(clock_in);
CREATE INDEX IF NOT EXISTS idx_time_entries_location ON public.time_entries(location);
