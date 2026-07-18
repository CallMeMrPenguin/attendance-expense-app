<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mandatory Development & Coding Session Rules

- **Git Quick Commit**: Run `git quick-commit` in the current terminal when done updating code.
- **Scratch Testing**: Scratch test scripts are allowed provided they DO NOT open any browser with the intention of capturing images or overriding user control.
- **Supabase Database Verification**: Each time doing something related to the Supabase database (or modifying how data is handled), a test script MUST be executed to verify that data is synced properly.
- **Dedicated Scratch Folder**: Scratch files used for testing purposes must be placed cleanly in a dedicated scratch directory/folder.
- **No Browser Web Cache**: Never save application or financial data in browser web cache (`localStorage`). All persistent data must be saved to and retrieved directly from Supabase DB.

