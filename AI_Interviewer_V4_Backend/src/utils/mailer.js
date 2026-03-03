import nodemailer from "nodemailer";
import User from "../models/User.js";

/* ─────────────────────────────────────────────
   Nodemailer Transport (Brevo SMTP)
───────────────────────────────────────────── */

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* ─────────────────────────────────────────────
   Verify SMTP Connection
───────────────────────────────────────────── */

transporter.verify((error) => {
  if (error) {
    console.log("❌ SMTP Connection Error:", error);
  } else {
    console.log("📧 SMTP server ready to send emails");
  }
});

/* ─────────────────────────────────────────────
   1. Welcome Mail (User Registration)
───────────────────────────────────────────── */

export const sendWelcomeMail = async (email, name, company) => {
  try {

    const html = `
<p>Dear ${name},</p>

<p>Welcome to <b>${company || "AI Interviewer Platform"}</b>.</p>

<p>Your account has been successfully created.</p>

<p>You can now login and start using the platform.</p>

<br>

<p>Best Regards,<br>
AI Interviewer Team</p>
`;

    const info = await transporter.sendMail({
      from: `"AI Interviewer" <${process.env.MAIL_FROM}>`,
      to: email,
      subject: "Welcome to AI Interviewer Platform",
      html,
    });

    console.log("✅ Welcome email sent:", info.messageId);

  } catch (error) {
    console.log("❌ Welcome mail error:", error);
  }
};

/* ─────────────────────────────────────────────
   2. Interview Assignment Mail
───────────────────────────────────────────── */

export const sendEmail = async (
  candidateId,
  jobRole,
  jobDescription,
  company,
  mode,
  durationMinutes,
  expiresAt,
  interviewLink
) => {
  try {

    const candidate = await User.findById(candidateId);

    if (!candidate) throw new Error("Candidate not found");

    const html = `
<p>Dear ${candidate.name},</p>

<p>You have been invited for an interview.</p>

<b>Company:</b> ${company}<br>
<b>Role:</b> ${jobRole}<br>
<b>Mode:</b> ${mode}<br>
<b>Duration:</b> ${durationMinutes} minutes<br>
<b>Expiry:</b> ${expiresAt}<br>

<p>${jobDescription}</p>

<br>

<a href="${interviewLink}"
style="
padding:10px 18px;
background:#2563eb;
color:white;
text-decoration:none;
border-radius:6px;
font-weight:bold;
">
Start Interview
</a>

<br><br>

<p>
Best regards,<br>
${company} Recruitment Team
</p>
`;

    const info = await transporter.sendMail({
      from: `"${company}" <${process.env.MAIL_FROM}>`,
      to: candidate.email,
      subject: `Interview Invitation - ${jobRole}`,
      html,
    });

    console.log("✅ Interview email sent:", info.messageId);

  } catch (error) {
    console.log("❌ Interview mail error:", error);
  }
};

/* ─────────────────────────────────────────────
   3. Job Creation Notification
───────────────────────────────────────────── */

export const sendJobCreatedMail = async (email, jobRole, company) => {
  try {

    const html = `
<p>Hello,</p>

<p>A new job has been created.</p>

<b>Company:</b> ${company}<br>
<b>Role:</b> ${jobRole}<br>

<p>You can now assign candidates for this job.</p>

<br>

<p>AI Interviewer System</p>
`;

    const info = await transporter.sendMail({
      from: `"${company}" <${process.env.MAIL_FROM}>`,
      to: email,
      subject: `New Job Created - ${jobRole}`,
      html,
    });

    console.log("✅ Job creation mail sent:", info.messageId);

  } catch (error) {
    console.log("❌ Job creation mail error:", error);
  }
};

/* ─────────────────────────────────────────────
   4. Bulk Mail Sender
───────────────────────────────────────────── */

export const sendBatchMails = async (recipients) => {
  try {

    const mailPromises = recipients.map((mail) =>
      transporter.sendMail({
        from: `"AI Interviewer" <${process.env.MAIL_FROM}>`,
        to: mail.to,
        subject: mail.subject,
        html: mail.body,
      })
    );

    await Promise.all(mailPromises);

    console.log("✅ Bulk emails sent:", recipients.length);

  } catch (error) {
    console.log("❌ Bulk mail error:", error);
  }
};