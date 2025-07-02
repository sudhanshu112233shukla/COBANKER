//THIS CODE IS REQUIRED TO APPROVE A USER IN THE SYSTEM
import { supabase } from "../utils/supabase";

export async function approveUser(role: "member" | "customer", id: string) {
  const table = role === "member" ? "members" : "customers";

  const { error } = await supabase
    .from(table)
    .update({ status: "approved" })
    .eq(`${role}_id`, id);

  if (error) throw new Error(error.message);
}
