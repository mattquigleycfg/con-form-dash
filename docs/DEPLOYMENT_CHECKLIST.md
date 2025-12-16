# Deployment Checklist

## Pre-Deployment Verification

### 1. Build Validation ✅
- [x] TypeScript compilation passes
- [x] Vite build completes successfully
- [x] No linter errors
- [x] Bundle size acceptable (1.85 MB)

### 2. Code Quality ✅
- [x] All imports correct
- [x] No hardcoded credentials
- [x] Error handling implemented
- [x] Loading states added
- [x] Toast notifications for user feedback

### 3. Environment Variables
Required in Supabase Edge Functions Secrets:
- [ ] `ODOO_URL` - https://con-formgroup.odoo.com/
- [ ] `ODOO_USERNAME` - admin@waoconnect.com.au
- [ ] `ODOO_PASSWORD` - (stored in Supabase)
- [ ] `ODOO_API_KEY` - (if required)

Required in Frontend (.env):
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## Configuration Verification

### Odoo-Specific Settings
1. **Ticket Type ID for Account Applications:**
   - Current value: `7`
   - Verify in Odoo: Settings → Helpdesk → Ticket Types
   - Adjust in `src/hooks/useAccountApplications.ts` if different

2. **Shop Drawings Ticket Type:**
   - Verify ticket type name matches "Shop Drawings"
   - Check in `src/hooks/useShopDrawingCycleTime.ts`

3. **Working Hours:**
   - Default: 9 AM - 5 PM, Monday-Friday
   - Adjust in `src/utils/workingHours.ts` if needed

---

## Deployment Steps

### 1. Git Commit
```bash
git add .
git commit -m "feat: add account applications, metres rolled table, and accounting integration"
git push origin main
```

### 2. Supabase Edge Functions
Verify these functions are deployed and configured:
- [ ] `odoo-query` - Main Odoo API proxy
- [ ] `ai-copilot` - AI assistance (if used)
- [ ] `sync-job-costs` - Job costing sync (if used)

### 3. Netlify Deployment
- [ ] Push to GitHub triggers automatic build
- [ ] Build completes successfully
- [ ] Site preview available
- [ ] Review deploy preview
- [ ] Promote to production

### 4. Database Verification
Check Supabase tables:
- [ ] `manual_kpis` - For metres rolled storage
- [ ] Any custom tables for KPIs

---

## Post-Deployment Testing

### Critical Path Tests
1. **Accounting KPIs Page:**
   - [ ] Navigate to `/kpis/accounting`
   - [ ] Account Applications section loads
   - [ ] Stage metrics display correctly
   - [ ] Invoicing data shows
   - [ ] AR/AP metrics calculate

2. **Production KPIs Page:**
   - [ ] Navigate to `/kpis/production`
   - [ ] Metres Rolled table visible
   - [ ] Can edit metres values
   - [ ] Changes save successfully
   - [ ] Values persist on refresh

3. **Design KPIs Page:**
   - [ ] Navigate to `/kpis/design`
   - [ ] Advanced filters work
   - [ ] Cycle time metrics show
   - [ ] Quality metrics display
   - [ ] Working hours calculation correct

4. **Advanced Filters:**
   - [ ] Date range selector works
   - [ ] Assigned to filter populates
   - [ ] Team filter available
   - [ ] Priority filter functions
   - [ ] Status filter applies correctly

### Data Validation Tests
1. **Verify against Odoo:**
   - [ ] Account application counts match
   - [ ] Invoice totals accurate
   - [ ] AR/AP days reasonable
   - [ ] Stage history complete

2. **Working Hours Calculation:**
   - [ ] Weekend time excluded
   - [ ] Non-business hours excluded
   - [ ] Multi-day spans correct

3. **Quality Metrics:**
   - [ ] Revision rate logical
   - [ ] First-time pass rate = 100% - revision rate
   - [ ] DIFOT calculations accurate

---

## Rollback Plan

If issues are detected:

1. **Immediate Rollback:**
   ```bash
   # Revert to previous deployment in Netlify dashboard
   # Or revert git commit:
   git revert HEAD
   git push origin main
   ```

2. **Known Issues:**
   - If ticket_type_id is wrong, update in code
   - If stage names don't match, adjust icon mapping
   - If working hours are incorrect, update config

3. **Emergency Contacts:**
   - Development team
   - Odoo admin
   - Supabase support (if needed)

---

## Monitoring & Alerts

### What to Monitor
1. **Error Rates:**
   - Supabase Edge Function errors
   - Frontend console errors
   - Failed API calls

2. **Performance:**
   - Page load times
   - Query response times
   - Time to interactive

3. **Data Quality:**
   - Missing stage history
   - Null values in metrics
   - Calculation inconsistencies

### Key Metrics to Track
- Average page load time (target: < 3s)
- API call success rate (target: > 99%)
- User error rate (target: < 1%)
- Data refresh frequency

---

## User Communication

### Announcement Template
```
New Features Available:

1. **Accounting KPIs Dashboard**
   - Track account applications from helpdesk
   - View AR/AP days and invoicing metrics
   - Monitor quality and turnaround times
   - Access at: [Your Domain]/kpis/accounting

2. **Production Metres Rolled**
   - Manual entry for production output by machine
   - Edit values with inline editing
   - Track week/month/YTD metrics
   - Find in: Production KPIs page

3. **Enhanced Filtering**
   - Filter by date range, assigned to, team, priority, status
   - Available on Design, Production, and Accounting pages
   - Save and restore filter preferences

Need help? Contact [Support Team]
```

---

## Success Criteria

Deployment is successful when:
- [ ] All pages load without errors
- [ ] Data displays correctly from Odoo
- [ ] Users can edit metres rolled values
- [ ] Filters apply correctly
- [ ] Quality metrics calculate accurately
- [ ] No console errors
- [ ] Performance meets targets
- [ ] Users successfully navigate new features

**Sign-off:** _____________________ Date: _________

---

## Future Enhancements

Consider for next iteration:
1. Export functionality for reports
2. Historical trending for all metrics
3. Configurable working hours per region
4. Automated alerts for threshold breaches
5. Bulk edit for metres rolled
6. Custom stage mapping configuration
7. Advanced analytics dashboard
8. Mobile app support

