import { supabase } from "../lib/supabase";

export async function login(email: string, password: string) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function register(email: string, password: string, fullName: string) {
  return await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
}

export async function logout() {
  sessionStorage.removeItem('huerta-active-operator');
  return await supabase.auth.signOut();
}

export async function getUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
