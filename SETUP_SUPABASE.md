# Cockpit - Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in/create account
2. Click **"New Project"**
3. Fill in:
   - **Name**: `recruit-hub` (or whatever you prefer)
   - **Database Password**: Generate a strong password and save it somewhere safe
   - **Region**: Choose closest to you (e.g., London for UK)
4. Click **"Create new project"** and wait for it to finish (~2 minutes)

## Step 2: Get Your API Keys

1. Go to **Settings** (gear icon in sidebar) → **API**
2. Copy these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIs...` (long string starting with `eyJ`)

## Step 3: Create Environment File

In your project root (where package.json is), create a file called `.env`:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJyour-anon-key-here
```

Replace with your actual values from Step 2.

## Step 4: Run Database Migration

1. In Supabase, go to **SQL Editor** (in sidebar)
2. Click **"New Query"**
3. Copy the entire contents of `supabase/migrations/002_updated_schema.sql`
4. Paste into the SQL editor
5. Click **"Run"** (or Ctrl+Enter)

You should see "Success" message.

## Step 5: Set Up Authentication

### Option A: Email/Password (Simple)

1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Go to **Authentication** → **Users**
4. Click **"Add user"** → **"Create new user"**
5. Create these test users:

| Email | Password | 
|-------|----------|
| admin@recruithub.com | TestPassword123! |
| director@recruithub.com | TestPassword123! |
| manager@recruithub.com | TestPassword123! |
| recruiter@recruithub.com | TestPassword123! |
| interviewer@recruithub.com | TestPassword123! |

### Option B: Magic Link (No password)

1. Enable Email provider
2. Under **Email Templates**, you can customize the magic link email
3. Users will receive a link to sign in (no password needed)

## Step 6: Link Auth Users to Database Users

After creating auth users, you need to update the `users` table with the correct IDs:

1. Go to **Authentication** → **Users**
2. For each user, copy their **User UID** (the long UUID)
3. Go to **Table Editor** → **users** table
4. Update each row's `id` to match the auth user's UID

For example:
- Find `admin@recruithub.com` in Auth, copy its UID
- Go to users table, find the row with `admin@recruithub.com`
- Update the `id` field with the copied UID

## Step 7: Update Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. **Redeploy** your project for changes to take effect

## Step 8: Test the Connection

1. Start your local dev server: `npm run dev`
2. Open the browser console (F12)
3. Try logging in with one of your test users
4. Check for any connection errors

## Troubleshooting

### "Invalid API key"
- Double-check your `.env` file has the correct values
- Make sure there are no extra spaces or quotes
- Restart your dev server after changing `.env`

### "RLS policy violation"
- Make sure you ran the full migration including the RLS policies
- Check that your user is authenticated before making requests

### "User not found"
- Make sure you created the auth user AND the database user
- Make sure the IDs match between auth.users and public.users

## Next Steps

Once connected, you can:
1. Create real candidates through the UI
2. Add requirements
3. Schedule interviews
4. See data persist across sessions

The app will automatically save to Supabase instead of using mock data.
