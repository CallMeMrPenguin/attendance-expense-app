<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mandatory Development & Coding Session Rules

- **Git Quick Commit**: Run `git quick-commit` in the current terminal when done updating code.
- **Dedicated Permanent Scratch Folder**: Keep fixed, non-deletable diagnostic scripts (`scratch/check_db_sync.cjs`, `scratch/check_connections.cjs`) in the `scratch/` folder to verify app data vs Supabase database, connection links, and system integrity.
- **Self-Execution via Temp Files**: Never output code in response text for the user to run manually when doing Supabase database operations or tests. Always create a temporary script in `scratch/`, execute it yourself, verify the output, and clean up temporary files.
- **Supabase Database Verification**: Each time doing something related to the Supabase database (or modifying how data is handled), run `scratch/check_db_sync.cjs` or execute a test script to verify that data is synced properly.
- **Scratch Testing Limitations**: Scratch test scripts are allowed provided they DO NOT open any browser with the intention of capturing images or overriding user control.
- **Supabase Table Data & Schema Inspection**: Never guess or assume table columns, foreign keys, or RLS policies. Always inspect Supabase database tables directly by executing a diagnostic script in `scratch/` (such as `scratch/check_db_sync.cjs`) to query live column keys, relationships, and row counts.
- **No Browser Web Cache**: Never save application or financial data in browser web cache (`localStorage`). All persistent data must be saved to and retrieved directly from Supabase DB.

