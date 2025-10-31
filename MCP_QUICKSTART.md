# MCP Quickstart Guide

## Quick Setup (5 minutes)

### Step 1: Get Your Service Role Key
1. Go to [Supabase Dashboard > Settings > API](https://supabase.com/dashboard/project/hfscflqjpozqyfpohvjj/settings/api)
2. Copy the **service_role** key (not the anon key)
3. ⚠️ Keep this key secure - it has admin access!

### Step 2: Set Environment Variable

**Windows (PowerShell - Run as Administrator for permanent setup):**
```powershell
# Permanent setup (recommended)
[System.Environment]::SetEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', 'your-key-here', 'User')

# Then restart Cursor for changes to take effect
```

**macOS/Linux:**
```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc, or ~/.profile)
echo 'export SUPABASE_SERVICE_ROLE_KEY="your-key-here"' >> ~/.bashrc
source ~/.bashrc

# Then restart Cursor
```

### Step 3: Restart Cursor
- Close and reopen Cursor completely
- The MCP server will automatically be available

### Step 4: Verify Setup
Ask the AI assistant in Cursor to:
- "List all tables in my Supabase database"
- "Show me the schema for the [table_name] table"
- "Query the first 5 rows from [table_name]"

## What Can You Do With MCP?

Once configured, you can ask the AI to:

### Database Operations
```
- "Show me all users in the database"
- "Create a new table called 'products' with columns for name, price, and description"
- "Add a new row to the orders table"
- "Update all products where category is 'electronics'"
- "Delete old records from the logs table"
```

### Schema Management
```
- "Show me the database schema"
- "What are the relationships between tables?"
- "Add a new column to the users table"
- "Create an index on the email column"
```

### Data Analysis
```
- "How many users signed up last month?"
- "What's the average order value?"
- "Show me the top 10 products by sales"
- "Generate a report of monthly revenue"
```

### Migrations & Updates
```
- "Create a migration to add user roles"
- "Add RLS policies to protect user data"
- "Set up triggers for audit logging"
```

## Common Issues

### "Cannot find SUPABASE_SERVICE_ROLE_KEY"
**Solution:** 
1. Verify the environment variable is set: 
   - Windows: `$env:SUPABASE_SERVICE_ROLE_KEY` in PowerShell
   - macOS/Linux: `echo $SUPABASE_SERVICE_ROLE_KEY`
2. Restart Cursor completely
3. Try logging out and back in to Windows/macOS

### MCP Server Not Starting
**Solution:**
1. Ensure Node.js is installed: `node --version`
2. Test npx: `npx -y @modelcontextprotocol/server-supabase --help`
3. Check Cursor logs for errors

### Permission Denied Errors
**Solution:**
1. Verify you copied the **service_role** key, not the anon key
2. Check your Supabase project is active
3. Ensure your Supabase plan supports the operations

## Security Best Practices

✅ **DO:**
- Set SUPABASE_SERVICE_ROLE_KEY as a system environment variable
- Use in development environments only (or with strict controls)
- Enable RLS (Row Level Security) on all tables
- Regularly rotate your service role key
- Monitor database access logs

❌ **DON'T:**
- Commit the service role key to git
- Share the key in chat messages or screenshots
- Use the service role key in client-side code
- Leave RLS disabled on production tables

## Advanced Configuration

### Custom MCP Server Settings

Edit `.mcp.json` to customize:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-supabase"],
      "env": {
        "SUPABASE_URL": "https://hfscflqjpozqyfpohvjj.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}",
        "SUPABASE_DB_URL": "your-connection-string", // Optional: Direct DB access
        "LOG_LEVEL": "debug" // Optional: Enable debug logs
      }
    }
  }
}
```

### Multiple Supabase Projects

Add multiple MCP servers for different projects:

```json
{
  "mcpServers": {
    "supabase-prod": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-supabase"],
      "env": {
        "SUPABASE_URL": "https://prod-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_PROD_KEY}"
      }
    },
    "supabase-dev": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-supabase"],
      "env": {
        "SUPABASE_URL": "https://dev-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_DEV_KEY}"
      }
    }
  }
}
```

## Next Steps

1. ✅ Set up environment variable
2. ✅ Restart Cursor
3. ✅ Test with a simple query
4. 📚 Read [MCP_SETUP.md](./MCP_SETUP.md) for detailed documentation
5. 🔒 Review security settings in Supabase Dashboard
6. 🚀 Start building with AI-powered database interactions!

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Supabase MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/supabase)
- [Supabase Dashboard](https://supabase.com/dashboard/project/hfscflqjpozqyfpohvjj)
- [This Project's Supabase Settings](https://supabase.com/dashboard/project/hfscflqjpozqyfpohvjj/settings/api)

---

**Need Help?** Check [MCP_SETUP.md](./MCP_SETUP.md) for troubleshooting or open an issue.

