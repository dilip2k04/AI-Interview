import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ai-interviewer");
  console.log("Connected to MongoDB");

  await User.deleteMany({});

  await User.create([
    { name: "Sarah Mitchell", email: "hr@company.com", password: "hr123456", role: "hr", company: "TechCorp Inc." },
    { name: "Alex Kumar", email: "alex@email.com", password: "pass1234", role: "candidate" },
    { name: "Priya Sharma", email: "priya@email.com", password: "pass1234", role: "candidate" },
    { name: "James Wilson", email: "james@email.com", password: "pass1234", role: "candidate" },
  ]);

  console.log("✅ Seeded: 1 HR user + 3 candidate users");
  console.log("   HR Login:        hr@company.com    / hr123456");
  console.log("   Candidate Login: alex@email.com    / pass1234");
  await mongoose.disconnect();
}

seed().catch(console.error);
