import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user,
        isLoading: false 
      }),

      setLoading: (isLoading) => set({ isLoading }),

      checkAuth: async () => {
        try {
          // Only show loading if we don't have a user yet (initial load)
          const currentState = useAuthStore.getState();
          if (!currentState.user) {
            set({ isLoading: true });
          }
          
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // First try to fetch existing user profile
            const { data: profile, error } = await supabase
              .from('users')
              .select('*')
              .eq('email', session.user.email)
              .maybeSingle();
            
            if (error) {
              console.error('Error fetching user profile:', error);
            }
            
            if (profile) {
              // User exists in our table
              set({ 
                user: profile, 
                isAuthenticated: true,
                isLoading: false 
              });
            } else {
              // User doesn't exist in our users table - create one
              // Determine role based on email
              const email = session.user.email || '';
              let role: 'admin' | 'director' | 'manager' | 'recruiter' | 'interviewer' = 'recruiter';
              
              if (email.includes('admin')) {
                role = 'admin';
              } else if (email.includes('director')) {
                role = 'director';
              } else if (email.includes('manager')) {
                role = 'manager';
              } else if (email.includes('interviewer')) {
                role = 'interviewer';
              }
              
              // Get a friendly name from email
              const namePart = email.split('@')[0] || 'Unknown';
              const fullName = namePart
                .split(/[._-]/)
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
              
              const newProfile = {
                id: session.user.id,
                email: email,
                full_name: session.user.user_metadata?.full_name || 
                           session.user.user_metadata?.name ||
                           fullName,
                role: role,
                avatar_url: session.user.user_metadata?.avatar_url || null,
                is_active: true,
              };
              
              const { data: createdProfile, error: createError } = await supabase
                .from('users')
                .insert(newProfile)
                .select()
                .single();
              
              if (createError) {
                console.error('Error creating user profile:', createError);
                // Still allow login even if profile creation fails
                set({ 
                  user: newProfile as User, 
                  isAuthenticated: true,
                  isLoading: false 
                });
              } else {
                set({ 
                  user: createdProfile, 
                  isAuthenticated: true,
                  isLoading: false 
                });
              }
            }
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch (error) {
          console.error('Auth check error:', error);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      signOut: async () => {
        try {
          // Clear test user from localStorage
          localStorage.removeItem('test-user');
          // Clear Supabase session if it exists
          await supabase.auth.signOut();
          set({ user: null, isAuthenticated: false });
        } catch (error) {
          // Even if Supabase signout fails, clear local state
          localStorage.removeItem('test-user');
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// Listen for auth state changes
// Note: We only react to actual sign-in/sign-out events, not token refreshes
// This prevents modals from closing when switching tabs
supabase.auth.onAuthStateChange(async (event, session) => {
  // Only handle actual auth events, ignore TOKEN_REFRESHED and other events
  if (event === 'SIGNED_IN' && session && !useAuthStore.getState().isAuthenticated) {
    // Only check auth if we weren't already authenticated
    useAuthStore.getState().checkAuth();
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.getState().setUser(null);
  }
  // Ignore TOKEN_REFRESHED, INITIAL_SESSION, etc. to prevent re-renders
});
