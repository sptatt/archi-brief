import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

// IMPORTANT: until you verify a domain on resend.com, you can only send to your OWN email
// using the address "onboarding@resend.dev". After domain verification, change the from address.
export async function sendDigestEmail({ to, subject, html }) {
  return resend.emails.send({
    from: 'ARCHI Brief <noreply@archibrief.pe.kr>',
    to,
    subject,
    html,
  });
}
