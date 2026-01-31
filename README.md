# Cockpit

The Nuclear House Recruitment Management System

Engineering Recruitment Management System built with React, TypeScript, and Supabase.

## Features

- **Candidate Management**: Store and manage candidate profiles with detailed information
- **Powerful Search**: Find candidates by name, skills, experience, and more
- **Interview Tracking**: Manage the full interview lifecycle (Phone → Technical → Director)
- **Requirements Management**: Track customer needs and match candidates
- **Contract Workflow**: Draft contracts and manage approval processes
- **Microsoft 365 SSO**: Secure authentication with your company's M365

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Build**: Vite
- **State Management**: Zustand
- **Routing**: React Router v7

---

## Setup Guide

### Step 1: Create a Supabase Account

1. Go to [supabase.com](https://supabase.com) and click "Start your project"
2. Sign up with GitHub (recommended) or email
3. Click "New project"
4. Fill in:
   - **Name**: recruit-hub
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose the closest to your users (e.g., London for UK)
5. Click "Create new project" and wait 2-3 minutes

### Step 2: Set Up the Database

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" - this is correct

### Step 3: Get Your Supabase Keys

1. In Supabase, click **Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL**: Something like `https://xxxxx.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`

### Step 4: Configure the Project

1. In your project folder, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and paste your values:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...your-long-key...
   ```

### Step 5: Set Up Microsoft 365 Authentication (Optional)

Skip this for now if you want to test with the demo account.

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "App registrations" and click it
3. Click "New registration"
4. Fill in:
   - **Name**: RecruitHub
   - **Supported account types**: "Accounts in this organizational directory only"
   - **Redirect URI**: Select "Web" and enter your Supabase callback URL:
     `https://xxxxx.supabase.co/auth/v1/callback`
5. Click "Register"
6. Copy the **Application (client) ID**
7. Go to "Certificates & secrets" → "New client secret"
8. Add a description, choose expiry, click "Add"
9. Copy the **Value** immediately (you won't see it again)

10. In Supabase:
    - Go to **Authentication** → **Providers** → **Azure**
    - Enable it
    - Paste your **Application ID** and **Client Secret**
    - Click **Save**

### Step 6: Install Dependencies and Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5173`

---

## Deploying to Vercel

### Step 1: Create a Vercel Account

1. Go to [vercel.com](https://vercel.com) and click "Sign Up"
2. Sign up with GitHub (recommended)

### Step 2: Push to GitHub

1. Create a new repository on GitHub
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/recruit-hub.git
   git push -u origin main
   ```

### Step 3: Deploy to Vercel

1. In Vercel dashboard, click "Add New..." → "Project"
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables:
   - `VITE_SUPABASE_URL`: Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
5. Click "Deploy"

### Step 4: Update OAuth Redirect URL

After deploying, update your Microsoft Azure app registration:
1. Go to Azure Portal → App registrations → RecruitHub
2. Add a new Redirect URI: `https://your-vercel-domain.vercel.app/auth/callback`

---

## Project Structure

```
recruit-hub/
├── src/
│   ├── components/
│   │   ├── ui/           # Reusable UI components
│   │   ├── layout/       # Layout components
│   │   ├── candidates/   # Candidate-specific components
│   │   └── ...
│   ├── pages/            # Page components
│   ├── hooks/            # Custom React hooks
│   ├── lib/
│   │   ├── supabase.ts   # Supabase client
│   │   ├── stores/       # Zustand stores
│   │   └── utils.ts      # Utility functions
│   ├── types/            # TypeScript types
│   └── styles/           # Global styles
├── supabase/
│   └── migrations/       # Database migrations
└── public/
    └── assets/           # Static assets
```

---

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

---

## Adding Your Logo

1. Place your logo file at `public/assets/logo.svg`
2. The app will automatically use it

---

## Next Steps

After the basic setup, you can:

1. **Add team members**: Go to Organisation → Add Member
2. **Configure business units**: Set up your organisational structure
3. **Add candidates**: Start building your database
4. **Create requirements**: Add customer needs to match candidates

---

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify your environment variables are set correctly
3. Ensure the database migration ran successfully

---

## Licence

Private - Internal use only
