# 🗄️ Supabase Database Migrations Guide

Complete guide for setting up your Con-form Dashboard database tables.

---

## 📋 What Was Created

### Migration Files:

1. **`20251031000001_create_jobs_tables.sql`** - Job costing tables
   - `jobs` (473 rows from CSV)
   - `job_budget_lines` (1,007 rows from CSV)
   - `job_bom_lines` (1 row from CSV)
   - `job_non_material_costs` (86 rows from CSV)
   - `job_purchase_orders` (0 rows - empty table structure)

2. **`20251031000002_create_targets_tables.sql`** - Targets & goals tables
   - `monthly_targets` (24 rows from CSV)
   - `sales_targets` (0 rows - empty table structure)

---

## 🎯 Database Schema Overview

### Jobs Tables Structure

```
jobs (Main table)
├── id (UUID, primary key)
├── user_id (UUID, references auth.users)
├── odoo_sale_order_id (INTEGER)
├── sale_order_name (TEXT)
├── customer_name (TEXT)
├── total_budget, material_budget, non_material_budget (DECIMAL)
├── total_actual, material_actual, non_material_actual (DECIMAL)
├── status (TEXT: active, completed, cancelled, on_hold)
├── project_manager_name, sales_person_name (TEXT)
└── Timestamps

job_budget_lines (Budget line items)
├── id (UUID, primary key)
├── job_id (UUID, references jobs)
├── product_id, product_name (INTEGER, TEXT)
├── quantity, unit_price, subtotal (DECIMAL)
├── cost_category (material, non_material, labor, equipment)
└── Timestamps

job_bom_lines (Bill of Materials)
├── id (UUID, primary key)
├── job_id (UUID, references jobs)
├── product_name (TEXT)
├── quantity, unit_cost, total_cost (DECIMAL)
└── Timestamps

job_non_material_costs (Non-material costs)
├── id (UUID, primary key)
├── job_id (UUID, references jobs)
├── cost_type (installation, engineering, transport, etc.)
├── description, amount (TEXT, DECIMAL)
└── Timestamps

job_purchase_orders (Purchase orders)
├── id (UUID, primary key)
├── job_id (UUID, references jobs)
├── po_name, vendor_name (TEXT)
├── amount_total (DECIMAL)
└── Timestamps
```

### Targets Tables Structure

```
monthly_targets (Monthly performance tracking)
├── id (UUID, primary key)
├── user_id (UUID, references auth.users)
├── financial_year, month (TEXT)
├── CFG (Con-Form Group) metrics:
│   ├── cfg_sales_target, cfg_sales_actual (DECIMAL)
│   ├── cfg_invoice_target, cfg_invoice_actual (DECIMAL)
│   └── cfg_sales_variance, cfg_invoice_variance (DECIMAL)
├── DSF (Design/Supply/Fabricate) metrics:
│   ├── dsf_sales_target, dsf_sales_actual (DECIMAL)
│   ├── dsf_invoice_target, dsf_invoice_actual (DECIMAL)
│   └── dsf_sales_variance, dsf_invoice_variance (DECIMAL)
└── Total metrics (auto-calculated)

sales_targets (Custom sales targets)
├── id (UUID, primary key)
├── user_id (UUID, references auth.users)
├── name, target_value (TEXT, DECIMAL)
├── period (monthly, quarterly, yearly, custom)
└── metric (sales, invoices, margin, deals, revenue)
```

---

## 🚀 How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)

1. **Go to SQL Editor:**
   - URL: https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/sql

2. **Run First Migration (Jobs Tables):**
   - Click "New Query"
   - Copy contents from `supabase/migrations/20251031000001_create_jobs_tables.sql`
   - Paste into SQL editor
   - Click "Run" or press Ctrl+Enter

3. **Run Second Migration (Targets Tables):**
   - Click "New Query" again
   - Copy contents from `supabase/migrations/20251031000002_create_targets_tables.sql`
   - Paste into SQL editor
   - Click "Run" or press Ctrl+Enter

4. **Verify Tables Were Created:**
   - Go to: Database → Tables
   - You should see all new tables listed

### Option 2: Supabase CLI (Advanced)

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref ibqgwakjmsnjtvwpkdns

# Run migrations
supabase db push

# Or reset and apply all migrations
supabase db reset
```

---

## 📊 What Each Migration Does

### Migration 1: Jobs Tables (`20251031000001`)

**Creates:**
- ✅ 5 interconnected tables for job costing
- ✅ Foreign key relationships
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Auto-update triggers for `updated_at` timestamps
- ✅ Cascading deletes (delete job → deletes all related records)

**Security:**
- Users can only see/modify their own jobs
- Child tables inherit security from parent `jobs` table
- All queries are scoped to `auth.uid()`

**Performance:**
- Indexes on frequently queried columns
- Optimized for dashboard queries
- Efficient joins between related tables

### Migration 2: Targets Tables (`20251031000002`)

**Creates:**
- ✅ 2 tables for target tracking
- ✅ Auto-calculation of variances
- ✅ Summary view for reporting
- ✅ RLS policies per user
- ✅ Unique constraints for data integrity

**Features:**
- Auto-calculates sales/invoice variances
- Tracks CFG and DSF separately
- Calculates achievement percentages
- Monthly performance tracking

---

## 🔐 Security Features

### Row Level Security (RLS)

All tables have RLS enabled with policies:

```sql
-- Example: Users can only see their own data
FOR SELECT USING (auth.uid() = user_id)

-- Child tables check parent ownership
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM jobs 
        WHERE jobs.id = child_table.job_id 
        AND jobs.user_id = auth.uid()
    )
)
```

### Policies Created:

- ✅ SELECT (view data)
- ✅ INSERT (create records)
- ✅ UPDATE (modify records)
- ✅ DELETE (remove records)

---

## 🧪 Testing After Migration

### 1. Verify Tables Exist

```sql
-- List all tables
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Should show:
-- - jobs
-- - job_budget_lines
-- - job_bom_lines
-- - job_non_material_costs
-- - job_purchase_orders
-- - monthly_targets
-- - sales_targets
```

### 2. Check Table Structure

```sql
-- View jobs table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'jobs'
ORDER BY ordinal_position;
```

### 3. Test RLS Policies

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- All should show TRUE for rowsecurity
```

### 4. Test Relationships

```sql
-- Check foreign key constraints
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';
```

---

## 📝 Importing CSV Data

After migrations are complete, you can import your CSV data:

### Option 1: Supabase Dashboard

1. Go to: **Database → Tables → [table name]**
2. Click "Insert" → "Insert rows"
3. For bulk import:
   - Use Supabase Storage to upload CSV
   - Use SQL COPY command

### Option 2: Using SQL COPY

```sql
-- Example: Import jobs data (after uploading CSV to server)
COPY jobs(id, user_id, odoo_sale_order_id, customer_name, ...)
FROM '/path/to/jobs-export.csv'
DELIMITER ';'
CSV HEADER;
```

### Option 3: Using TypeScript/JavaScript

```typescript
// Use Supabase client to insert data
import { supabase } from '@/integrations/supabase/client';

// Parse CSV and insert
const { data, error } = await supabase
  .from('jobs')
  .insert(jobsData);
```

---

## 🔄 Relationships & Cascading

### Parent-Child Relationships:

```
jobs (parent)
  ↓ CASCADE DELETE
  ├── job_budget_lines
  ├── job_bom_lines
  ├── job_non_material_costs
  └── job_purchase_orders

auth.users (parent)
  ↓ CASCADE DELETE
  ├── jobs
  ├── monthly_targets
  └── sales_targets
```

**What This Means:**
- Delete a job → All related lines are automatically deleted
- Delete a user → All their jobs and targets are deleted
- Maintains data integrity automatically

---

## 📈 Useful Queries

### Get Total Budget vs Actual for All Jobs:

```sql
SELECT 
    COUNT(*) as total_jobs,
    SUM(total_budget) as total_budget,
    SUM(total_actual) as total_actual,
    SUM(total_actual) - SUM(total_budget) as variance,
    ROUND((SUM(total_actual) / NULLIF(SUM(total_budget), 0) * 100)::numeric, 2) as completion_percentage
FROM jobs
WHERE user_id = auth.uid()
    AND status = 'active';
```

### Get Job with All Related Data:

```sql
SELECT 
    j.*,
    COUNT(DISTINCT jbl.id) as budget_line_count,
    COUNT(DISTINCT jbom.id) as bom_line_count,
    COUNT(DISTINCT jnm.id) as non_material_cost_count,
    COUNT(DISTINCT jpo.id) as purchase_order_count
FROM jobs j
LEFT JOIN job_budget_lines jbl ON j.id = jbl.job_id
LEFT JOIN job_bom_lines jbom ON j.id = jbom.job_id
LEFT JOIN job_non_material_costs jnm ON j.id = jnm.job_id
LEFT JOIN job_purchase_orders jpo ON j.id = jpo.job_id
WHERE j.user_id = auth.uid()
GROUP BY j.id;
```

### Monthly Target Performance:

```sql
SELECT * FROM monthly_targets_summary
WHERE month_date >= DATE_TRUNC('year', CURRENT_DATE)
ORDER BY month_date;
```

---

## 🛠️ Maintenance

### Update Triggers

The migrations include auto-update triggers:

```sql
-- Automatically updates 'updated_at' on record changes
CREATE TRIGGER update_[table]_updated_at 
    BEFORE UPDATE ON [table]
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### Variance Auto-Calculation

Monthly targets automatically calculate variances:

```sql
CREATE TRIGGER calculate_variances_before_insert_update 
    BEFORE INSERT OR UPDATE ON monthly_targets
    FOR EACH ROW 
    EXECUTE FUNCTION calculate_monthly_target_variances();
```

---

## 🐛 Troubleshooting

### Issue: "relation already exists"

**Cause:** Tables already exist in database

**Solution:**
```sql
-- Drop tables if they exist (careful - loses data!)
DROP TABLE IF EXISTS job_purchase_orders CASCADE;
DROP TABLE IF EXISTS job_non_material_costs CASCADE;
DROP TABLE IF EXISTS job_bom_lines CASCADE;
DROP TABLE IF EXISTS job_budget_lines CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS sales_targets CASCADE;
DROP TABLE IF EXISTS monthly_targets CASCADE;

-- Then re-run migrations
```

### Issue: "permission denied"

**Cause:** RLS is blocking your query

**Solution:**
- Ensure you're authenticated
- Check if `auth.uid()` matches `user_id` in tables
- For admin access, temporarily disable RLS:

```sql
ALTER TABLE [table_name] DISABLE ROW LEVEL SECURITY;
-- Do your admin work
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
```

### Issue: Foreign key violation

**Cause:** Trying to insert child record without parent

**Solution:**
- Insert parent record first (e.g., job before job_budget_lines)
- Ensure `job_id` references existing job
- Check that user owns the parent job

---

## 📊 Expected Table Counts

After importing CSV data:

| Table | Expected Rows |
|-------|---------------|
| jobs | 473 |
| job_budget_lines | 1,007 |
| job_bom_lines | 1 |
| job_non_material_costs | 86 |
| job_purchase_orders | 0 (empty) |
| monthly_targets | 24 |
| sales_targets | 0 (empty) |

---

## ✅ Migration Checklist

- [ ] Backed up existing database (if applicable)
- [ ] Ran migration #1 (jobs tables)
- [ ] Verified tables created
- [ ] Ran migration #2 (targets tables)
- [ ] Verified all tables exist
- [ ] Tested RLS policies
- [ ] Checked foreign key constraints
- [ ] Imported CSV data (optional)
- [ ] Tested queries from application
- [ ] Updated TypeScript types (if needed)

---

## 🔗 Next Steps

After migrations are complete:

1. **Update TypeScript Types:**
   - Regenerate types: `npx supabase gen types typescript`
   - Update `src/integrations/supabase/types.ts`

2. **Test in Application:**
   - Verify data loads correctly
   - Test CRUD operations
   - Check filtering and sorting

3. **Import CSV Data:**
   - Use provided CSVs to populate tables
   - Verify data integrity

4. **Configure Odoo Sync:**
   - Set up Edge Function secrets
   - Test Odoo data synchronization

---

**Last Updated:** October 31, 2025  
**Status:** ✅ Migrations Ready to Run

