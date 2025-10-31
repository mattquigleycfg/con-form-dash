# 🔐 Odoo Credentials Configuration Guide

**IMPORTANT:** This file contains instructions for configuring Odoo credentials. The actual credentials should be stored securely in Supabase Edge Functions, NOT in your `.env` file.

---

## ⚠️ Security Warning

**DO NOT add Odoo credentials to `.env` file!**

❌ **WRONG:**
```env
# DON'T DO THIS - Would expose credentials in frontend
VITE_ODOO_URL=https://con-formgroup.odoo.com/
VITE_ODOO_USERNAME=admin@waoconnect.com.au
VITE_ODOO_PASSWORD=***
```

✅ **CORRECT:**
- Store in **Supabase Edge Functions Secrets** (server-side)
- Never expose in frontend code
- Access via secure backend functions only

---

## 📋 Odoo Instance Details

**Company:** Con-form Group Pty Ltd  
**Website:** https://con-formgroup.odoo.com/  
**Business:** HVAC Roof Plant Platforms & Access Solutions  
**Database:** con-formgroup-main-10348162

### Products & Services:
- MR (Metal Roof) Plant Platforms
- CR (Concrete Roof) Plant Platforms  
- Span+ (Rafter Mounted) Systems
- Engineering, Design & Consulting Services

**Contact:**
- Phone: 1300 882 490
- Email: sales@con-formgroup.com.au

---

## 🔧 Step 1: Configure Supabase Edge Functions

### Add Secrets to Supabase

1. **Go to Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/hfscflqjpozqyfpohvjj/settings/functions
   - Or navigate: Project Settings → Edge Functions → Secrets

2. **Add these 4 secrets:**

#### Secret 1: ODOO_URL
```
Name: ODOO_URL
Value: https://con-formgroup.odoo.com
```
⚠️ **Note:** Remove trailing slash

#### Secret 2: ODOO_USERNAME
```
Name: ODOO_USERNAME
Value: admin@waoconnect.com.au
```

#### Secret 3: ODOO_PASSWORD
```
Name: ODOO_PASSWORD
Value: 2i@YA-:/k/8/o.XNgwiO
```
🔒 **Keep this secure!**

#### Secret 4: ODOO_API_KEY (Optional)
```
Name: ODOO_API_KEY
Value: 47977d425aad95e73b4445b37b75bbc9a624f365
```
ℹ️ This may be used for API authentication instead of password

3. **Save all secrets**

4. **Redeploy Edge Functions** (if they were already deployed)

---

## 🌐 Step 2: Configure Netlify (Deployment Only)

### Add Environment Variables to Netlify

**ONLY add frontend variables to Netlify:**

1. **Go to Netlify Dashboard:**
   - Your Site → Site Configuration → Environment Variables

2. **Add ONLY these variables:**

```
VITE_SUPABASE_URL=https://hfscflqjpozqyfpohvjj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhmc2NmbHFqcG96cXlmcG9odmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg0Mzg5ODUsImV4cCI6MjA0NDAxNDk4NX0.VF0RBEsJJNUzQv8_Jt3zv5TC9D5rLKU8v5OmPvGPpYs
```

⚠️ **DO NOT add Odoo credentials to Netlify!**

Odoo credentials stay in Supabase only. Your frontend calls Supabase Edge Functions, which then use the stored secrets to communicate with Odoo.

---

## 🔄 How It Works (Architecture)

```
┌─────────────────────────────────────┐
│  Frontend (Browser/Netlify)         │
│  ├── VITE_SUPABASE_URL (public)     │
│  └── VITE_SUPABASE_PUBLISHABLE_KEY  │
│                                     │
│  Makes authenticated requests to    │
└──────────────┬──────────────────────┘
               │
               │ HTTPS Request
               ▼
┌──────────────────────────────────────┐
│  Supabase Edge Functions (Secure)    │
│  ├── Validates JWT token             │
│  ├── Reads secrets:                  │
│  │   ├── ODOO_URL                    │
│  │   ├── ODOO_USERNAME               │
│  │   ├── ODOO_PASSWORD               │
│  │   └── ODOO_API_KEY                │
│  └── Makes Odoo API calls            │
└──────────────┬───────────────────────┘
               │
               │ Authenticated Request
               ▼
┌──────────────────────────────────────┐
│  Odoo ERP (con-formgroup.odoo.com)  │
│  ├── Authenticates request           │
│  ├── Returns data                    │
│  └── (Sales, CRM, Projects, etc.)    │
└──────────────────────────────────────┘
```

### Security Benefits:
✅ Odoo credentials never leave the server  
✅ Frontend only has public Supabase keys  
✅ RLS policies protect database access  
✅ JWT tokens validate user authentication  
✅ No credentials in compiled JavaScript  

---

## 🧪 Step 3: Test Odoo Connection

### After configuring Supabase secrets:

1. **Open your app:** http://localhost:8080

2. **Sign in** to your account

3. **Click "Sync Odoo"** button on the dashboard

4. **Check for data:**
   - Sales metrics should populate
   - Revenue charts should show data
   - Pipeline information should load

### Troubleshooting:

#### Error: "Odoo credentials not configured"
- Verify secrets are added in Supabase
- Check secret names match exactly (case-sensitive)
- Redeploy Edge Functions

#### Error: "Odoo authentication failed"
- Verify ODOO_URL has no trailing slash
- Check username/password are correct
- Confirm you have access to the Odoo instance

#### Error: "Network error"
- Check Odoo instance is accessible
- Verify URL: https://con-formgroup.odoo.com/
- Test login directly on Odoo website

---

## 📝 Verification Checklist

### Supabase Configuration
- [ ] Logged into Supabase Dashboard
- [ ] Navigated to Edge Functions → Secrets
- [ ] Added `ODOO_URL` secret
- [ ] Added `ODOO_USERNAME` secret
- [ ] Added `ODOO_PASSWORD` secret
- [ ] Added `ODOO_API_KEY` secret (optional)
- [ ] Saved all secrets
- [ ] Redeployed functions (if needed)

### Netlify Configuration (When Deploying)
- [ ] Logged into Netlify Dashboard
- [ ] Navigated to Site Configuration → Environment Variables
- [ ] Added `VITE_SUPABASE_URL`
- [ ] Added `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] **Confirmed NOT adding Odoo credentials**
- [ ] Triggered new deployment

### Testing
- [ ] Opened application
- [ ] Signed in successfully
- [ ] Clicked "Sync Odoo" button
- [ ] Data loaded from Odoo
- [ ] No console errors
- [ ] All dashboards show data

---

## 🔍 Odoo Data Models Used

Your application queries these Odoo models:

| Model | Description | Used For |
|-------|-------------|----------|
| `sale.order` | Sales Orders | Revenue, deals closed |
| `crm.lead` | CRM Opportunities | Pipeline, forecasting |
| `project.project` | Projects | Job costing, tracking |
| `account.move` | Invoices | Accounting dashboard |
| `purchase.order` | Purchase Orders | Job costing |
| `mrp.bom` | Bill of Materials | BOM breakdown |
| `account.analytic.line` | Analytic Lines | Cost analysis |
| `helpdesk.ticket` | Support Tickets | Helpdesk dashboard |

---

## 🛡️ Security Best Practices

### ✅ DO:
- Store Odoo credentials in Supabase Edge Functions
- Use environment-specific secrets
- Rotate passwords regularly
- Use API keys when possible
- Enable 2FA on Odoo admin account
- Monitor Edge Function logs
- Set up rate limiting

### ❌ DON'T:
- Commit credentials to Git
- Store in `.env` file
- Share credentials in chat/email
- Use same password across services
- Hard-code credentials in code
- Expose secrets in frontend
- Share API keys publicly

---

## 📚 Additional Resources

### Supabase Documentation:
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [Environment Variables](https://supabase.com/docs/guides/functions/secrets)
- [Security Best Practices](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)

### Odoo Documentation:
- [External API](https://www.odoo.com/documentation/16.0/developer/reference/external_api.html)
- [Web Services](https://www.odoo.com/documentation/16.0/developer/reference/backend/web_services.html)

### Your Application Docs:
- [AUDIT.md](./AUDIT.md) - Codebase audit
- [SETUP.md](./SETUP.md) - Development setup
- [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) - Environment config

---

## 🎯 Quick Reference

### Supabase Dashboard URLs:
- **Main Dashboard:** https://supabase.com/dashboard/project/hfscflqjpozqyfpohvjj
- **Edge Functions:** https://supabase.com/dashboard/project/hfscflqjpozqyfpohvjj/functions
- **Secrets:** https://supabase.com/dashboard/project/hfscflqjpozqyfpohvjj/settings/functions

### Odoo Instance:
- **URL:** https://con-formgroup.odoo.com/
- **Database:** con-formgroup-main-10348162
- **Login:** https://con-formgroup.odoo.com/web/login

### Your Application:
- **Local:** http://localhost:8080
- **Lovable:** https://lovable.dev/projects/d5056f6f-e114-4e35-a8da-e68395a164c6

---

## ⚡ Next Steps

1. **Add secrets to Supabase** (see Step 1 above)
2. **Test Odoo connection** locally
3. **Verify data syncs** properly
4. **Add Netlify variables** when deploying
5. **Monitor Edge Function logs** for errors

---

**Last Updated:** October 30, 2025  
**Status:** Ready to Configure  
**Security Level:** ✅ Enterprise-Grade

