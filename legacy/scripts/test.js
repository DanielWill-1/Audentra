import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://YOUR_PROJECT.supabase.co",
  "YOUR_ANON_KEY"
);

const { data, error } = await supabase
  .from("contact_submissions")
  .select("*")
  .limit(1);

console.log({ data, error });