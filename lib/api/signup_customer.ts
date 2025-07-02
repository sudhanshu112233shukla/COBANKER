import { sendEmailToAdmin } from "../utils/email";
import { supabase } from "../utils/supabase";

export async function registerCustomerRequest(data: any) {
  const insertData = { ...data, status: "pending" };
  const { error } = await supabase.from("customers").insert(insertData);
  if (error) throw new Error(error.message);
  await sendEmailToAdmin(data);
}
