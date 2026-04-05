-- Add student name and email columns to the appointments table for guests and leads
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS student_email TEXT;
