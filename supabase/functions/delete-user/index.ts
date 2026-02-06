import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*'
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Missing env vars' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await adminClient.auth.getUser(token)
    
    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Look up by EMAIL to handle mismatched IDs
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('roles')
      .eq('email', requestingUser.email)
      .single()
    
    if (userError || !userData) {
      return new Response(JSON.stringify({ error: 'User not found in database' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const roles = userData.roles || []
    const isAdmin = roles.includes('superadmin') || roles.includes('admin')
    
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Only admins can delete users' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { userId } = await req.json()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Prevent self-deletion
    if (requestingUser.email) {
      const { data: targetUser } = await adminClient
        .from('users')
        .select('email')
        .eq('id', userId)
        .single()
      
      if (targetUser?.email === requestingUser.email) {
        return new Response(JSON.stringify({ error: 'Cannot delete yourself' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // First, unlink any consultant record (don't delete it - needed for history)
    const { error: unlinkError } = await adminClient
      .from('consultants')
      .update({ user_id: null })
      .eq('user_id', userId)

    if (unlinkError) {
      console.log('No consultant to unlink or error:', unlinkError.message)
    }

    // Delete from users table
    const { error: deleteUserError } = await adminClient
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteUserError) {
      return new Response(JSON.stringify({ error: 'Failed to delete user profile: ' + deleteUserError.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Note: We don't delete the consultant record - it's needed for historical data
    // (timesheets, missions, invoices). The consultant profile just becomes orphaned.

    // Delete from auth.users
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      return new Response(JSON.stringify({ error: 'Failed to delete auth user: ' + deleteAuthError.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
