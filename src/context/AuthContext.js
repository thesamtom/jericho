import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          fetchUserRole(session.user.id);
        } else {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserRole(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(data);
      setRole(data.role);
    } catch {
      // If users table doesn't exist yet, fall back to metadata
      const meta = session?.user?.user_metadata;
      setRole(meta?.role || 'student');
      setUser({ id: userId, email: session?.user?.email, role: meta?.role || 'student' });
    } finally {
      setLoading(false);
    }
  }

  async function signIn(roleId, password, selectedRole) {
    // Each role table uses its own ID column name
    const idColumn = `${selectedRole}_id`; // admin_id, student_id, parent_id, warden_id
    const tableName = selectedRole;

    const { data: userData, error: lookupError } = await supabase
      .from(tableName)
      .select('*')
      .eq(idColumn, roleId)
      .maybeSingle();

    if (lookupError) {
      // PGRST116 is expected when no matching row exists.
      if (lookupError.code !== 'PGRST116') {
        console.log('Supabase lookup error:', JSON.stringify(lookupError));
      }
      throw new Error(`Login failed: ${lookupError.message}`);
    }

    if (!userData) {
      throw new Error(`No ${selectedRole} found with ID: ${roleId}`);
    }

    // Verify password against the stored password
    if (userData.password !== password) {
      throw new Error('Incorrect password');
    }

    // Set auth state
    setRole(selectedRole);
    setUser({ ...userData, role: selectedRole });
    setSession({ user: userData });
    setLoading(false);
    return userData;
  }

  async function signUp(email, password, selectedRole, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: selectedRole, ...metadata },
      },
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider
      value={{ session, user, role, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
