import nodemailer from "nodemailer";
import User from "../models/User.js";

/* ─────────────────────────────────────────────
   Nodemailer Transport (Brevo SMTP)
───────────────────────────────────────────── */

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // Brevo uses STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* ─────────────────────────────────────────────
   Verify SMTP Connection (Optional but helpful)
───────────────────────────────────────────── */

transporter.verify(function (error, success) {
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

    await transporter.sendMail({
      from: `"AI Interviewer" <${process.env.MAIL_FROM}>`,
      to: email,
      subject: "Welcome to AI Interviewer Platform",
      html,
    });

    console.log("✅ Welcome email sent to:", email);

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
    <h2>Hello ${candidate.name},</h2>

    <p>You have been invited for an interview.</p>

    <p><b>Company:</b> ${company}</p>
    <p><b>Role:</b> ${jobRole}</p>
    <p><b>Mode:</b> ${mode}</p>
    <p><b>Duration:</b> ${durationMinutes} minutes</p>
    <p><b>Expiry:</b> ${new Date(expiresAt).toLocaleString()}</p>

    <p>${jobDescription}</p>

    <br>

    <a href="${interviewLink}"
    style="
    padding:12px 20px;
    background:#2563eb;
    color:white;
    text-decoration:none;
    border-radius:6px;
    font-weight:bold;
    display:inline-block;
    ">
    🚀 Start Interview
    </a>

    <br><br>

    <p>Best regards,<br>${company} Recruitment Team</p>
    `;

    await transporter.sendMail({
      from: `"${company}" <${process.env.MAIL_FROM}>`,
      to: candidate.email,
      subject: `Interview Invitation - ${jobRole}`,
      html
    });

    console.log("✅ Interview email sent to:", candidate.email);

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

    await transporter.sendMail({
      from: `"${company}" <${process.env.MAIL_FROM}>`,
      to: email,
      subject: `New Job Created - ${jobRole}`,
      html,
    });

    console.log("✅ Job creation mail sent to:", email);

  } catch (error) {
    console.log("❌ Job creation mail error:", error);
  }
};

/* ─────────────────────────────────────────────
   4. Bulk Mail Sender
───────────────────────────────────────────── */

export const sendBatchMails = async (recipients) => {
  try {

    for (const mail of recipients) {

      await transporter.sendMail({
        from: `"AI Interviewer" <${process.env.MAIL_FROM}>`,
        to: mail.to,
        subject: mail.subject,
        html: mail.body,
      });

    }

    console.log("✅ Bulk emails sent");

  } catch (error) {
    console.log("❌ Bulk mail error:", error);
  }
};