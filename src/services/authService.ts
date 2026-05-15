import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

/**
 * Register a new user with Supabase Auth.
 * After signup, automatically signs the user in so no email confirmation is needed.
 * Creates a profile row in the `profiles` table.
 */
export async function signUp(
  email: string,
  password: string,
  userData: {
    name: string;
    phone: string;
    role: 'passenger' | 'driver' | 'admin';
  }
) {
  // 1. Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // This tells Supabase to NOT require email confirmation
      emailRedirectTo: undefined,
      data: {
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
      },
    },
  });

  if (authError) {
    // Provide clearer error messages in Darija-friendly English
    if (authError.message.includes('already registered')) {
      throw new Error('This email is already registered. Please sign in instead.');
    }
    if (authError.message.includes('password')) {
      throw new Error('Password is too weak. Use at least 6 characters.');
    }
    throw new Error(authError.message || 'Registration failed. Please try again.');
  }

  if (!authData.user) {
    throw new Error('Signup failed — no user returned from server.');
  }

  // 2. Create the profile in the `profiles` table
  // We use upsert in case a profile already exists (edge case)
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: authData.user.id,
        name: userData.name,
        email,
        phone: userData.phone,
        role: userData.role,
        is_verified: false,
        rating: 5.0,
        trips_count: 0,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.name)}`,
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    console.error('Profile creation error:', profileError);
    // Don't throw here — auth succeeded, profile can be created later
    // The user is still registered and can sign in
  }

  // 3. Auto sign-in after registration (no email confirmation needed)
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError) {
    // If auto sign-in fails (e.g. email confirmation still required),
    // tell the user to check their email
    if (signInError.message.includes('Email not confirmed')) {
      throw new Error(
        'Account created! Please check your email and click the confirmation link, then sign in.'
      );
    }
    // Otherwise they need to manually sign in
    throw new Error(
      'Account created! Please sign in with your email and password.'
    );
  }

  // 4. Return the signed-in session
  return signInData;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes('Invalid login')) {
      throw new Error('Invalid email or password. Please try again.');
    }
    if (error.message.includes('Email not confirmed')) {
      throw new Error('Please confirm your email before signing in.');
    }
    throw new Error(error.message || 'Login failed.');
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  // Fallback: if no profile in DB yet, build one from auth metadata
  if (!profile) {
    return {
      id: data.user.id,
      name: data.user.user_metadata?.name || data.user.email || 'User',
      email: data.user.email || '',
      phone: data.user.user_metadata?.phone || '',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.user.email || '')}`,
      role: data.user.user_metadata?.role || 'passenger',
      is_verified: false,
      rating: 5.0,
      trips_count: 0,
    } as User;
  }

  return profile as User;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Session error:', error);
    return null;
  }
  return data.session;
}

export function onAuthStateChange(
  callback: (user: User | null) => void
) {
  return supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      callback(null);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      callback(profile as User);
    } else {
      // Fallback profile from auth metadata
      callback({
        id: session.user.id,
        name:
          session.user.user_metadata?.name ||
          session.user.email ||
          'User',
        email: session.user.email || '',
        phone: session.user.user_metadata?.phone || '',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(session.user.email || '')}`,
        role: session.user.user_metadata?.role || 'passenger',
        is_verified: false,
        rating: 5.0,
        trips_count: 0,
      } as User);
    }
  });
}
