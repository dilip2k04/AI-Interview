import express from "express";
import { transporter } from "../utils/mailer.js";

const router = express.Router();

router.get("/test-mail", async (req, res) => {

  try {

    await transporter.sendMail({
      from: `"AI Interviewer" <sihdilip2023@gmail.com>`, // VERIFIED sender email
      to: "gsmddilip1812@gmail.com",
      subject: "Test Email",
      html: `
      <h1>Email Working 🚀</h1>
      <p>Your Brevo SMTP is configured correctly.</p>
      `
    });

    res.json({
      success: true,
      message: "Mail sent successfully"
    });

  } catch (error) {

    console.error("Mail error:", error);

    res.status(500).json({
      success: false,
      error: "Mail sending failed"
    });

  }

});

export default router;