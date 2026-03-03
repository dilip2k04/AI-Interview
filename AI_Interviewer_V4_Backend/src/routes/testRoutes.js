import express from "express";
import { transporter } from "../utils/mailer.js";

const router = express.Router();

router.get("/test-mail", async (req, res) => {
  try {

    console.log("Sending test email...");

    const info = await transporter.sendMail({
      from: `"AI Interviewer" <${process.env.MAIL_FROM}>`,
      to: "gsmddilip1812@gmail.com",
      subject: "Test Email",
      html: "<h1>Email Working 🚀</h1>"
    });

    console.log("Mail sent:", info.messageId);

    res.json({
      success: true,
      message: "Mail sent successfully",
      id: info.messageId
    });

  } catch (error) {

    console.error("Mail error:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;