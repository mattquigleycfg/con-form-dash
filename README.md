# Con-form Dashboard

**Production Sales Analytics Dashboard** for Con-form Group

## Project Info

- **GitHub Repository**: https://github.com/mattquigleycfg/con-form-dash
- **Hosting**: Netlify (auto-deploys from `main` branch)
- **Backend**: Supabase (Project: `ibqgwakjmsnjtvwpkdns`)
- **Database**: Supabase PostgreSQL
- **ERP Integration**: Odoo 16 (con-formgroup.odoo.com)

## Local Development

### Prerequisites

- Node.js 20+ and npm (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Git

### Setup Steps

```sh
# 1. Clone the repository
git clone https://github.com/mattquigleycfg/con-form-dash.git
cd con-form-dash

# 2. Install dependencies
npm install

# 3. Create environment file
cp env.example .env

# 4. Configure environment variables in .env
# VITE_SUPABASE_URL=https://ibqgwakjmsnjtvwpkdns.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=<your-key>

# 5. Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Development with Docker

```sh
# Development environment with hot reload
npm run docker:dev

# Production build locally
npm run docker:prod
```

## Technology Stack

### Frontend
- **Build Tool**: Vite 5.4.19
- **Framework**: React 18.3.1 with TypeScript 5.8.3
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 3.4.17
- **Charts**: Recharts 2.15.4
- **State Management**: TanStack Query 5.83.0, React Context API
- **Routing**: React Router 6.30.1
- **Forms**: React Hook Form 7.61.1 + Zod 3.25.76
- **Themes**: next-themes 0.3.0 (Dark mode support)

### Backend & Integration
- **Backend as a Service**: Supabase
  - PostgreSQL Database
  - Edge Functions (Deno runtime)
  - Authentication
  - Real-time subscriptions
- **ERP Integration**: Odoo 16 (via Supabase Edge Functions proxy)
  - Models: sale.order, crm.lead, project.project, account.move, mrp.bom
  - Database: con-formgroup-main-10348162
- **Export**: XLSX 0.18.5 (Excel export functionality)

### Deployment
- **Hosting**: Netlify
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Auto-Deploy**: Enabled on `main` branch push

## Environment Variables

### Required Variables

Create a `.env` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://ibqgwakjmsnjtvwpkdns.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
```

### Supabase Edge Functions Environment

Configure these in the Supabase Dashboard → Edge Functions → Secrets:

```env
# Odoo Integration
ODOO_URL=https://con-formgroup.odoo.com
ODOO_USERNAME=admin@waoconnect.com.au
ODOO_PASSWORD=<odoo-password>
ODOO_API_KEY=<optional-api-key>
```

**Security Note**: Never commit `.env` files or credentials to git. Use Supabase Secrets for Edge Functions.

## Deployment

### Automatic Deployment (Netlify)

The project automatically deploys to Netlify when you push to the `main` branch:

1. **Push changes to GitHub**:
   ```sh
   git add .
   git commit -m "feat: your changes"
   git push origin main
   ```

2. **Netlify automatically**:
   - Detects the push via webhook
   - Runs `npm run build`
   - Publishes the `dist` folder
   - Usually completes in 2-5 minutes

3. **Verify deployment**:
   - Check Netlify dashboard for build logs
   - Clear browser cache (Ctrl+Shift+R / Cmd+Shift+R)
   - Test the production site

### Manual Deployment Trigger

If auto-deploy doesn't work:

1. Go to your Netlify dashboard
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Or click **"Clear cache and deploy site"** to force a fresh build

### Troubleshooting Deployment Issues

**Changes not appearing in production?**
- Verify commit is pushed to GitHub: `git log origin/main`
- Check Netlify build logs for errors
- Clear browser cache completely
- Verify environment variables are set in Netlify dashboard
- Try "Clear cache and deploy site" in Netlify

**Build failures:**
- Check that all environment variables are set in Netlify
- Verify `netlify.toml` configuration
- Review build logs for specific errors

## Key Features

### 📊 Sales Analytics Dashboard
- **Real-time metrics**: Expected Revenue, Deals Closed, Conversion Rate, Active Customers
- **Revenue & Pipeline Charts**: Interactive charts using Recharts
- **Australia Sales Map**: Regional sales visualization
- **Sankey Flow Diagram**: Visual pipeline flow analysis
- **YTD Performance Tracking**: Year-to-date metrics and trends
- **Performance Tables**: Sales rep statistics and rankings
- **Advanced Filtering**: Save filter templates, date ranges, multi-select

### 💰 Job Costing Module
- **Multiple Views**: Kanban board, Grid view, List view
- **Cost Analysis**: BOM breakdown, Material vs Non-Material costs
- **Real-time Sync**: Direct integration with Odoo analytic accounts
- **Budget Tracking**: Compare budgets vs actuals with variance analysis
- **Bulk Import**: Import all sales orders from Odoo with one click
- **Excel Export**: Export job costing reports to Excel/CSV

### 🤖 AI-Powered Features
- **AI Copilot**: Chat interface for data insights and analysis
- **Job Insights**: AI-generated recommendations and cost optimization
- **Natural Language Queries**: Ask questions about your data

### 🎨 User Experience
- **Dark Mode**: Built-in theme switching
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: Live data sync with Odoo ERP
- **Confetti Celebrations**: Visual feedback for achievements

### 🔐 Security & Performance
- **Authentication**: Supabase Auth with email/password
- **Row Level Security**: Database-level access control
- **Optimized Queries**: TanStack Query for efficient data fetching
- **Rate Limiting**: Built-in rate limiting for API calls

## Project Structure

```
con-form-dash/
├── src/
│   ├── components/        # React components (UI, filters, job costing)
│   ├── contexts/          # React Context (Auth, Filters)
│   ├── hooks/             # Custom hooks (useOdoo*, useJob*)
│   ├── pages/             # Route pages
│   ├── integrations/      # Supabase client setup
│   ├── utils/             # Utilities (logger, rate limiter, export)
│   └── lib/               # Shared libraries
├── supabase/
│   ├── functions/         # Edge Functions (Odoo integration, AI)
│   └── migrations/        # Database migrations
├── public/                # Static assets
└── dist/                  # Build output (generated)
