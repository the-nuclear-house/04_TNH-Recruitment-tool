import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a Supabase client with the user's token to verify they're an admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Client with user's auth to check permissions
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify the requesting user is an admin or superadmin
    const { data: { user: requestingUser }, error: authError } = await userClient.auth.getUser()
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has admin privileges
    const { data: userData, error: userError } = await userClient
      .from('users')
      .select('roles')
      .eq('id', requestingUser.id)
      .single()

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isAdmin = userData.roles?.some((r: string) => ['superadmin', 'admin'].includes(r))
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only admins can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the new user data from request body
    const { email, password, full_name, roles } = await req.json()

    if (!email || !password || !full_name || !roles) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, full_name, roles' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role client to create user (bypasses signup restrictions)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Create the auth user
    const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: { full_name }
    })

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert into users table
    const { error: insertError } = await adminClient
      .from('users')
      .insert({
        id: newAuthUser.user.id,
        email,
        full_name,
        roles
      })

    if (insertError) {
      // Rollback: delete the auth user if we couldn't create the profile
      await adminClient.auth.admin.deleteUser(newAuthUser.user.id)
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile: ' + insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: newAuthUser.user.id, 
          email, 
          full_name, 
          roles 
        } 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
