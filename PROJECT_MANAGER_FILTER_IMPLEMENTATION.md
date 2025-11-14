# Project Manager Filter Implementation

## Overview
Added a Project Manager filter to the Job Costing page that allows users to filter jobs by the project manager assigned in `project.project.user_id` from Odoo.

## Changes Made

### 1. Data Fetching & Storage

#### Updated `src/pages/JobCosting.tsx`
- **Line 259:** Added `projectManagerName` variable
- **Line 270:** Added `user_id` to fields fetched from `project.project`
- **Lines 280-283:** Capture project manager name from `project.user_id[1]`
- **Line 361:** Store `project_manager_name` in jobs table during sync

#### Updated `src/pages/Settings.tsx`
- **Line 367:** Added `projectManagerName` variable  
- **Line 376:** Added `user_id` to fields fetched from `project.project`
- **Line 387:** Capture project manager name from `project.user_id[1]`
- **Lines 411 & 453:** Store `project_manager_name` in both create and update operations

### 2. Filter Logic

#### Updated `src/hooks/useJobFilters.ts`
- **Line 16:** Added `projectManager: string | null` to `JobFilters` interface
- **Lines 34-39:** Added project manager filtering logic
- **Line 60:** Updated useMemo dependencies to include `projectManager`

**Filter Behavior:**
- When `projectManager` is set, only jobs with matching `project_manager_name` are shown
- When `projectManager` is null (default), all jobs are shown
- Filter is applied before search filter and after date filter

### 3. UI Components

#### Created `src/components/job-costing/ProjectManagerFilter.tsx`
New component that:
- Extracts unique project manager names from all jobs
- Displays them in a sorted dropdown
- Includes "All Project Managers" option (default)
- Width: 200px for consistent UI layout

**Key Features:**
- Memoized list generation for performance
- Alphabetically sorted project managers
- Handles null/undefined project manager names gracefully

#### Updated `src/components/job-costing/JobFilterBar.tsx`
- **Lines 4 & 6:** Added imports for `ProjectManagerFilter` and `Job` type
- **Lines 15-17:** Added props for project manager filter
- **Lines 27-29 & 44-47:** Added project manager filter to props and JSX
- **Lines 41-48:** Added Project Manager dropdown between Date and Sort By filters

#### Updated `src/pages/JobCosting.tsx`
- **Line 35:** Added `projectManager` state variable
- **Line 67:** Added `projectManager` to filter object
- **Lines 855-857:** Passed project manager props to `JobFilterBar`

## Data Flow

```
1. User syncs jobs from Odoo (JobCosting or Settings page)
   ↓
2. project.project.user_id is fetched from Odoo
   ↓
3. Project manager name stored in jobs.project_manager_name
   ↓
4. ProjectManagerFilter extracts unique manager names from all jobs
   ↓
5. User selects a project manager from dropdown
   ↓
6. useJobFiltering hook filters jobs by selected manager
   ↓
7. Filtered jobs displayed in List/Kanban/Grid view
```

## Odoo Field Mapping

| Odoo Model | Odoo Field | Database Field | Display Name |
|------------|------------|----------------|--------------|
| `project.project` | `user_id` | `project_manager_name` | Project Manager |
| `sale.order` | `user_id` | `sales_person_name` | Salesperson |

**Note:** The sale order's `user_id` is the salesperson, while the project's `user_id` is the project manager. These are different fields serving different purposes.

## Usage Instructions

### For Users

1. **Initial Setup:**
   - Go to Settings page
   - Run "Import All Jobs from Odoo" with "Update existing jobs" checked
   - This will populate the project manager field for all jobs

2. **Filtering:**
   - Navigate to Job Costing page
   - Look for the "Project Manager" dropdown in the filter bar
   - Select a specific project manager or choose "All Project Managers"
   - The job list will update automatically

3. **Combined Filters:**
   - Project Manager filter works with other filters:
     - Date Range filter (Confirmation Date)
     - Search box (searches across SO, customer, opportunity, manager)
     - Sort By (Budget: High to Low / Low to High)

### For Developers

**To add project manager to new jobs:**
```typescript
// When creating/updating a job, ensure you fetch project.user_id:
const { data: projects } = await supabase.functions.invoke("odoo-query", {
  body: {
    model: "project.project",
    method: "search_read",
    args: [
      [["analytic_account_id", "=", analyticAccountId]],
      ["id", "name", "user_id"], // Include user_id
    ],
  },
});

// Then store it:
const projectManagerName = projects[0]?.user_id?.[1] || null;
```

## Database Schema

The `jobs` table already includes the `project_manager_name` field:
- **Column:** `project_manager_name`
- **Type:** `text | null`
- **Source:** `project.project.user_id[1]` (the name part of the many2one field)
- **Nullable:** Yes (not all projects have a project manager assigned)

## Testing Checklist

- [x] Build succeeds without TypeScript errors
- [x] No linter errors
- [x] Project manager fetched during job sync
- [x] Project manager stored in database
- [x] Filter dropdown populates with unique managers
- [x] Selecting a manager filters the job list
- [x] "All Project Managers" shows all jobs
- [x] Filter works with date range filter
- [x] Filter works with search box
- [x] Filter works with sort options
- [x] Filter works in List, Kanban, and Grid views

## Future Enhancements

1. **Multi-select Filter:** Allow selecting multiple project managers
2. **Manager Stats:** Show job count next to each manager name in dropdown
3. **Color Coding:** Assign colors to managers for visual identification
4. **Manager Performance:** Add manager-specific metrics dashboard
5. **Search in Dropdown:** For organizations with many project managers

## Related Files

### Modified:
- `src/pages/JobCosting.tsx`
- `src/pages/Settings.tsx`
- `src/hooks/useJobFilters.ts`
- `src/components/job-costing/JobFilterBar.tsx`

### Created:
- `src/components/job-costing/ProjectManagerFilter.tsx`

### Database:
- `jobs` table (existing field `project_manager_name` now populated)

## Compatibility

- Works with existing jobs (will show null/undefined until re-synced)
- Backward compatible (jobs without project manager still display)
- No breaking changes to existing functionality
- Filter is optional and defaults to "All Project Managers"

