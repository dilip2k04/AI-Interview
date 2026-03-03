import { Router } from "express";
import { body } from "express-validator";
import { register, login, getMe, updateProfile } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/errorHandler.js";

const router = Router();

router.post("/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("role").isIn(["hr", "candidate"]).withMessage("Role must be hr or candidate"),
  ],
  validate, register
);

router.post("/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  validate, login
);

router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);

export default router;
