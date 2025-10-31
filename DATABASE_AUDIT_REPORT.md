# 🔍 Database Audit Report
**Generated:** October 31, 2025  
**Project:** Con-form Dashboard  
**Supabase Project:** ibqgwakjmsnjtvwpkdns

---

## ✅ Migration Files Status

### Existing Migrations (Chronological Order):

1. **`20251008044255_` - Creates `sales_targets` table**
   - ✅ Status: ACTIVE - Should keep
   - Creates: `sales_targets` table
   - Creates: `update_updated_at_column()` function
   - RLS: Enabled with user-scoped policies

2. **`20251022224631_` - Creates `monthly_targets` table**
   - ✅ Status: ACTIVE - Should keep
   - Creates: `monthly_targets` with GENERATED columns for variances
   - Uses: COALESCE for null handling
   - RLS: Enabled with user-scoped policies

3. **`20251028062240_` - Creates all 5 job tables**
   - ✅ Status: ACTIVE - Should keep
   - Creates: `jobs`, `job_budget_lines`, `job_bom_lines`, `job_non_material_costs`, `job_purchase_orders`
   - Uses: Proper foreign keys and RLS

4. **`20251028083705_` - Adds search fields to jobs**
   - ✅ Status: ACTIVE - Should keep
   - Adds: `opportunity_name`, `project_manager_name`, `sales_person_name`

5. **`20251028084258_` - Enables pg_cron extension**
   - ⚠️ Status: ACTIVE but **WRONG PROJECT_REF**
   - **ISSUE**: References `hfscflqjpozqyfpohvjj` instead of `ibqgwakjmsnjtvwpkdns`
   - **ACTION**: Needs updating

6. **`20251028230412_` - Adds date/stage fields**
   - ✅ Status: ACTIVE - Should keep
   - Adds: `date_order`, `project_stage_id`, `project_stage_name`

7. **`20251031000001_` - DUPLICATE job tables creation**
   - ❌ Status: **CONFLICT** - Uses `CREATE TABLE IF NOT EXISTS`
   - **ISSUE**: Duplicate of migration #3
   - **ACTION**: Should DELETE this file

8. **`20251031000002_` - DUPLICATE targets tables creation**
   - ❌ Status: **PARTIAL CONFLICT**
   - **ISSUE 1**: Duplicate `monthly_targets` (already created in #2)
   - **ISSUE 2**: Duplicate `sales_targets` (already created in #1)
   - **ISSUE 3**: Uses regular DECIMAL columns instead of GENERATED ALWAYS AS columns for variances
   - **ISSUE 4**: Creates duplicate trigger and function
   - **ACTION**: Should DELETE this file

9. **`20251031000003_` - Fix RLS policies**
   - ✅ Status: ACTIVE - NEEDED!
   - Fixes: 406 errors by allowing authenticated users to read
   - **ACTION**: Keep and apply

---

## 🚨 Critical Issues Found

### 1. **Duplicate Table Definitions**

The October 31 migrations (`20251031000001` and `20251031000002`) are duplicating tables already created by earlier migrations:

| Table | Original Migration | Duplicate Migration | Issue |
|-------|-------------------|---------------------|-------|
| `jobs` | 20251028062240 | 20251031000001 | Different schema (missing fields) |
| `job_budget_lines` | 20251028062240 | 20251031000001 | Same |
| `job_bom_lines` | 20251028062240 | 20251031000001 | Same |
| `job_non_material_costs` | 20251028062240 | 20251031000001 | Same |
| `job_purchase_orders` | 20251028062240 | 20251031000001 | Same |
| `monthly_targets` | 20251022224631 | 20251031000002 | **SCHEMA CONFLICT!** |
| `sales_targets` | 20251008044255 | 20251031000002 | Same |

### 2. **Schema Conflicts: `monthly_targets`**

**Original (CORRECT):**
```sql
-- Uses GENERATED ALWAYS AS columns (automatic calculation)
cfg_sales_variance NUMERIC(12, 2) GENERATED ALWAYS AS (cfg_sales_actual - cfg_sales_target) STORED,
```

**Duplicate (WRONG):**
```sql
-- Uses regular DECIMAL columns (requires trigger)
cfg_sales_variance DECIMAL(12,2) DEFAULT 0,
```

**Impact:** The original schema is better because it uses PostgreSQL's native generated columns which are more reliable and performant.

### 3. **Wrong Project Reference**

Migration `20251028084258` has hardcoded project ref: `hfscflqjpozqyfpohvjj`  
Should be: `ibqgwakjmsnjtvwpkdns`

---

## 🎯 Recommended Actions

### Action 1: Delete Duplicate Migrations ❌

**Delete these files:**
- `supabase/migrations/20251031000001_create_jobs_tables.sql`
- `supabase/migrations/20251031000002_create_targets_tables.sql`

**Reason:** These tables were already created by earlier migrations. The `CREATE TABLE IF NOT EXISTS` prevents errors, but the RLS policies will conflict.

### Action 2: Fix pg_cron Migration 🔧

Update `20251028084258` to use correct project ref.

### Action 3: Apply RLS Fix ✅

Keep and apply: `supabase/migrations/20251031000003_fix_rls_policies.sql`

---

## 📊 Correct Database Schema

### Tables (7 total):

1. **`sales_targets`**
   - Purpose: Generic sales targets
   - Created by: `20251008044255`
   - RLS: ✅ Enabled

2. **`monthly_targets`**
   - Purpose: Monthly CFG/DSF targets with auto-calculated variances
   - Created by: `20251022224631`
   - RLS: ✅ Enabled (needs fix from migration #9)
   - Special: Uses GENERATED ALWAYS AS columns

3. **`jobs`**
   - Purpose: Main job costing table
   - Created by: `20251028062240`
   - Enhanced by: `20251028083705`, `20251028230412`
   - RLS: ✅ Enabled (needs fix from migration #9)

4. **`job_budget_lines`**
   - Purpose: Budget line items from sales orders
   - Created by: `20251028062240`
   - RLS: ✅ Enabled (needs fix from migration #9)

5. **`job_bom_lines`**
   - Purpose: Bill of Materials lines
   - Created by: `20251028062240`
   - RLS: ✅ Enabled (needs fix from migration #9)

6. **`job_non_material_costs`**
   - Purpose: Non-material costs breakdown
   - Created by: `20251028062240`
   - RLS: ✅ Enabled (needs fix from migration #9)

7. **`job_purchase_orders`**
   - Purpose: Purchase order tracking
   - Created by: `20251028062240`
   - RLS: ✅ Enabled (needs fix from migration #9)

---

## 🔐 RLS Policies Status

### Current State (Before Fix):
All policies use: `auth.uid() = user_id`

**Problem:** Too restrictive! Users can't view any data because:
- `monthly_targets` might not have a `user_id` for the current user
- Data needs to be shared across the organization for dashboard aggregations

### After RLS Fix (Migration #9):
SELECT policies use: `auth.role() = 'authenticated'`

**Benefit:** Authenticated users can read all data (for dashboards), but can only INSERT/UPDATE/DELETE their own records.

---

## ✅ Action Items Checklist

- [ ] 1. Delete `supabase/migrations/20251031000001_create_jobs_tables.sql`
- [ ] 2. Delete `supabase/migrations/20251031000002_create_targets_tables.sql`
- [ ] 3. Fix `supabase/migrations/20251028084258_*` project ref
- [ ] 4. Apply RLS fix SQL in dashboard
- [ ] 5. Verify tables in Supabase dashboard
- [ ] 6. Test app functionality

---

## 🧪 Verification SQL

Run this in SQL Editor to verify your schema:

```sql
-- Check all tables exist
SELECT table_name, 
       (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('jobs', 'job_budget_lines', 'job_bom_lines', 'job_non_material_costs', 
                      'job_purchase_orders', 'monthly_targets', 'sales_targets')
ORDER BY table_name;

-- Check RLS policies
SELECT tablename, policyname, cmd, qual::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('jobs', 'job_budget_lines', 'job_bom_lines', 'job_non_material_costs', 
                     'job_purchase_orders', 'monthly_targets', 'sales_targets')
ORDER BY tablename, policyname;

-- Check for GENERATED columns in monthly_targets
SELECT column_name, column_default, is_generated, generation_expression
FROM information_schema.columns
WHERE table_name = 'monthly_targets'
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

---

## 🔍 Comparison with Lovable App

Based on the [Lovable app](https://con-form-dash.lovable.app), the schema should support:

### Dashboard Features:
- ✅ Sales metrics (Expected Revenue, Deals Closed, Conversion Rate)
- ✅ Monthly targets tracking (CFG + DSF divisions)
- ✅ Revenue charts
- ✅ Pipeline visualization
- ✅ Performance tables

### Job Costing Features:
- ✅ Job list with filters
- ✅ BOM breakdown
- ✅ Budget vs Actual tracking
- ✅ Material vs Non-material costs
- ✅ Purchase order tracking

### Current Schema: **MATCHES** ✅

The existing schema (migrations #1-6 + #8) fully supports all Lovable app features.

---

## 📝 Summary

**Current State:**
- 7 tables created correctly
- RLS policies too restrictive (causing 406 errors)
- 2 duplicate migration files
- 1 migration with wrong project ref

**After Cleanup:**
- Delete 2 duplicate migrations
- Apply RLS fix
- Update pg_cron project ref
- **Result:** Clean, functional database matching Lovable app

---

**Status:** Ready for cleanup and fix 🚀

