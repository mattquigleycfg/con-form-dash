-- Add search fields to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS opportunity_name text,
ADD COLUMN IF NOT EXISTS project_manager_name text,
ADD COLUMN IF NOT EXISTS sales_person_name text;