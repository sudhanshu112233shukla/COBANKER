import { Resend } from "resend";

const resend = new Resend("re_5TE8yfDP_DY3GGo4STcsBsrZG7MrfhtE9");

export async function sendEmailToAdmin(data: any) {
  const { name, email, role } = data;

  await resend.emails.send({
    from: "parthsohaney04@gmail.com", // Change to your bank app's email
    to: "parth.22440@knit.ac.in", // Change to your bank admin's email
    subject: "🔔 New Signup Request for Admin Approval",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
        <div style="text-align: center;">
          <img src="https://your-org-logo-url.com/logo.png" alt="Bank Logo" style="width: 100px; margin-bottom: 20px;" />
          <h2 style="color: #333;">New Signup Request</h2>
        </div>

        <p style="font-size: 16px; color: #333;"><strong>Role Requested:</strong> ${role}</p>
        <p style="font-size: 16px; color: #333;"><strong>Name:</strong> ${name}</p>
        <p style="font-size: 16px; color: #333;"><strong>Email:</strong> ${email}</p>

        <hr style="margin: 20px 0;" />

        <p style="font-size: 16px; color: #333;">To review and approve the signup request, please click the button below:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://supabase.com/dashboard/project/ajcoctcqipwiztubuyaw/database/tables" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
             Open Admin Dashboard
          </a>
        </div>

        <p style="font-size: 14px; color: #777;">If you did not expect this request, you can ignore this email.</p>

        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #aaa;">
          © 2025 Co-Banker. All rights reserved.
        </div>
      </div>
    `,
  });
}
