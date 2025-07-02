//WHEN THE USER WILL SIGN UP, THIS WILL BE THE REQUEST SENT TO THE SUPABASE SERVER
import { sendEmailToAdmin } from "../utils/email";
import { supabase } from "../utils/supabase";

export async function registerUserRequest(data: any) {
  const { role, ...rest } = data;

  const tableName = role === "member" ? "members" : "customers";
  const insertData = { ...rest, status: "pending" };

  const { error } = await supabase.from(tableName).insert(insertData);
  if (error) throw new Error(error.message);

  await sendEmailToAdmin(data); // Sends email for approval
}
