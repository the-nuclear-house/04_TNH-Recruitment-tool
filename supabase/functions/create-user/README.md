# Deploying the Create User Edge Function

This edge function allows admins to create users even when public signups are disabled.

## Prerequisites

1. Install Supabase CLI: https://supabase.com/docs/guides/cli
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

## Deploy the Function

1. Link your project (run from the project root):
   ```bash
   supabase link --project-ref pzujhiifupouwstbiedh
   ```

2. Deploy the function:
   ```bash
   supabase functions deploy create-user
   ```

3. The function will be available at:
   ```
   https://pzujhiifupouwstbiedh.supabase.co/functions/v1/create-user
   ```

## What It Does

- Verifies the requesting user is logged in
- Checks they have `admin` or `superadmin` role
- Creates the new user in Supabase Auth (bypassing signup restrictions)
- Auto-confirms their email
- Creates their profile in the `users` table

## Security

- Only admins/superadmins can call this function
- Uses the service role key server-side (never exposed to browser)
- Validates all inputs
- Rolls back if profile creation fails

## Testing

After deployment, try creating a user from the Organisation page in Cockpit.
The user should be created immediately and can log in right away.

## Troubleshooting

If you get CORS errors, make sure the function deployed correctly:
```bash
supabase functions list
```

Check function logs:
```bash
supabase functions logs create-user
```
