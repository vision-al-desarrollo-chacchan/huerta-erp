import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ksmraxusmcwwzpoyhtqv.supabase.co";

const supabaseKey =
  "sb_publishable_KXWvBYcnQdi1YRaIfSK2Aw_zFKluywi";

export const supabase = createClient(supabaseUrl, supabaseKey);