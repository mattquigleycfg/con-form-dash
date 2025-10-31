# MCP (Model Context Protocol) Setup for Supabase

## What is MCP?

Model Context Protocol (MCP) is an open protocol that enables AI assistants to securely connect with external data sources and tools. This project includes an MCP server configuration for Supabase, allowing AI assistants to interact directly with your Supabase database.

## Configuration

The MCP configuration is defined in `.mcp.json` at the project root.

### Required Environment Variables

To use the Supabase MCP server, you need to set the following environment variable:

1. **SUPABASE_SERVICE_ROLE_KEY**: Your Supabase service role key (has elevated permissions)
   - Get this from: [Supabase Dashboard > Settings > API](https://supabase.com/dashboard/project/hfscflqjpozqyfpohvjj/settings/api)
   - This key should be kept secure and never committed to version control
   - Add it to your system environment variables or shell profile

### Setting Environment Variables

#### Windows (PowerShell)
```powershell
# Temporary (current session only)
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key-here"

# Permanent (user environment variable)
[System.Environment]::SetEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', 'your-service-role-key-here', 'User')
```

#### Windows (Command Prompt)
```cmd
set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

#### macOS/Linux
```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.profile
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Then reload your shell
source ~/.bashrc  # or ~/.zshrc
```

## Using the MCP Server

Once configured, the MCP server will be available to AI assistants running in Cursor. The AI can:

- Query your Supabase database
- Create, read, update, and delete records
- Execute SQL queries
- Manage database schema
- Interact with Supabase storage
- Work with Supabase edge functions

## Security Notes

⚠️ **Important Security Considerations:**

1. The service role key has administrative access to your Supabase project
2. Only use this in development environments with trusted AI assistants
3. Never commit the service role key to version control
4. Consider using row-level security (RLS) policies even in development
5. For production, use more restrictive API keys or custom access patterns

## How It Works

When you use an AI assistant in Cursor with MCP enabled:

1. The AI can request to use the Supabase MCP server
2. Cursor starts the MCP server using `npx @modelcontextprotocol/server-supabase`
3. The server connects to your Supabase instance using the credentials
4. The AI can then interact with your database through the MCP protocol

## Troubleshooting

### "SUPABASE_SERVICE_ROLE_KEY not found"
- Make sure you've set the environment variable
- Restart Cursor after setting the environment variable
- Verify the variable is set: `echo $env:SUPABASE_SERVICE_ROLE_KEY` (PowerShell) or `echo $SUPABASE_SERVICE_ROLE_KEY` (bash)

### MCP server not starting
- Ensure you have Node.js installed (v18 or higher recommended)
- Check that `npx` is available in your PATH
- Try running manually: `npx -y @modelcontextprotocol/server-supabase`

### Permission errors
- Verify your service role key is correct
- Check that your Supabase project is active
- Ensure you're using the service role key, not the anon key

## Additional Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase API Settings](https://supabase.com/dashboard/project/hfscflqjpozqyfpohvjj/settings/api)

