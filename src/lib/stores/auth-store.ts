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
              // User authenticated but has no profile in the users table.
              // This means they weren't created through the admin flow.
              // Do not auto-create a profile - sign them out.
              console.error('No user profile found for:', session.user.email);
              await supabase.auth.signOut();
              set({ user: null, isAuthenticated: false, isLoading: false });
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
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session && !useAuthStore.getState().isAuthenticated) {
    useAuthStore.getState().checkAuth();
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.getState().setUser(null);
  }
});
