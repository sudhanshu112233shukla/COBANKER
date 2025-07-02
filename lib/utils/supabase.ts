import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

export const supabase = createClient(
  "https://ajcoctcqipwiztubuyaw.supabase.co/",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY29jdGNxaXB3aXp0dWJ1eWF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NjkwMjIsImV4cCI6MjA2NTA0NTAyMn0.oDuP441StRvxhNCZlzbN9zNdOpF_n-vypWyzRLryw2s",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
