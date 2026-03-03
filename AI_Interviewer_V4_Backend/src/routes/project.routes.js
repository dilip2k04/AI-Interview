import { Router } from "express";
import { body } from "express-validator";
import { protect, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/errorHandler.js";
import {
  createProject, listProjects, getProject,
  updateProject, deleteProject, bulkAssign,
} from "../controllers/projectController.js";

const router = Router();
router.use(protect, requireRole("hr")); // all project routes are HR-only

router.get("/",    listProjects);
router.post("/",
  [
    body("name").trim().notEmpty().withMessage("Project name required"),
  ],
  validate, createProject
);

router.get("/:id",          getProject);
router.put("/:id",          updateProject);
router.delete("/:id",       deleteProject);

// Bulk assign: create interviews for multiple candidates at once
router.post("/:id/bulk-assign",
  [
    body("candidateIds").isArray({ min: 1 }).withMessage("Select at least one candidate"),
    body("jobRole").trim().notEmpty().withMessage("Job role required"),
    body("jobDescription").trim().isLength({ min: 30 }).withMessage("JD must be at least 30 chars"),
    body("mode").isIn(["mcq", "virtual"]).withMessage("Mode must be mcq or virtual"),
    body("difficulty").isIn(["easy", "medium", "hard"]).withMessage("Invalid difficulty"),
    body("numQuestions").isInt({ min: 1, max: 30 }).withMessage("1-30 questions"),
    body("durationMinutes").isInt({ min: 5 }).withMessage("Duration required"),
  ],
  validate, bulkAssign
);

export default router;
