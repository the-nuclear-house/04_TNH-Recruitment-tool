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
    (set, get) => ({
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
          set({ isLoading: true });
          
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Fetch user profile from our users table
            const { data: profile, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (error && error.code !== 'PGRST116') {
              console.error('Error fetching user profile:', error);
            }
            
            if (profile) {
              set({ 
                user: profile, 
                isAuthenticated: true,
                isLoading: false 
              });
            } else {
              // User exists in auth but not in our users table
              // This happens on first login - we should create the profile
              const newProfile: Partial<User> = {
                id: session.user.id,
                email: session.user.email || '',
                full_name: session.user.user_metadata?.full_name || 
                           session.user.user_metadata?.name ||
                           session.user.email?.split('@')[0] || 'Unknown',
                role: 'recruiter', // Default role
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
                set({ user: null, isAuthenticated: false, isLoading: false });
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
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    useAuthStore.getState().checkAuth();
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.getState().setUser(null);
  }
});
