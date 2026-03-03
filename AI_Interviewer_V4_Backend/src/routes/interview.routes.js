import { Router } from "express";
import { body } from "express-validator";
import { protect, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/errorHandler.js";
import {
  getCandidates, getHRInterviews, analyzeJD, createInterview,
  getInterviewById, getCandidateInterviews, startInterview,
  submitMCQ, virtualNextQuestion, virtualSubmitResponse,
  completeVirtual, generateFeedbackEmail, getHRStats, updateProctor,
  terminateInterview,
} from "../controllers/interviewController.js";

const router = Router();

router.use(protect);

// ── HR ────────────────────────────────────────────────────────────────────────
router.get("/hr/stats", requireRole("hr"), getHRStats);
router.get("/hr/candidates", requireRole("hr"), getCandidates);
router.get("/hr/list", requireRole("hr"), getHRInterviews);
router.post("/hr/analyze-jd", requireRole("hr"),
  [body("jobDescription").trim().isLength({ min: 30 }).withMessage("JD must be at least 30 chars")],
  validate, analyzeJD
);
router.post("/hr/create", requireRole("hr"),
  [
    body("candidateId").notEmpty().withMessage("Candidate required"),
    body("jobRole").trim().notEmpty().withMessage("Job role required"),
    body("jobDescription").trim().isLength({ min: 30 }).withMessage("JD must be at least 30 chars"),
    body("mode").isIn(["mcq", "virtual"]).withMessage("Mode must be mcq or virtual"),
    body("difficulty").isIn(["easy", "medium", "hard"]).withMessage("Invalid difficulty"),
    body("numQuestions").isInt({ min: 1, max: 30 }).withMessage("1-30 questions"),
    body("durationMinutes").isInt({ min: 5 }).withMessage("Duration required"),
  ],
  validate, createInterview
);
router.post("/hr/:id/feedback-email", requireRole("hr"), generateFeedbackEmail);

// ── Candidate ─────────────────────────────────────────────────────────────────
router.get("/candidate/list", requireRole("candidate"), getCandidateInterviews);

// ── Shared ────────────────────────────────────────────────────────────────────
router.get("/:id", getInterviewById);
router.post("/:id/start", requireRole("candidate"), startInterview);

// MCQ
router.post("/:id/submit-mcq",
  requireRole("candidate"),
  [body("answers").isArray({ min: 1 }).withMessage("Answers required")],
  validate, submitMCQ
);

// Virtual
router.post("/:id/virtual/next-question", requireRole("candidate"),
  [body("currentQuestionIndex").isInt({ min: 0 }).withMessage("Index required")],
  validate, virtualNextQuestion
);
router.post("/:id/virtual/submit-response", requireRole("candidate"),
  [
    body("questionId").notEmpty().withMessage("Question ID required"),
    body("responseText").trim().isLength({ min: 5 }).withMessage("Response too short"),
  ],
  validate, virtualSubmitResponse
);
router.post("/:id/virtual/complete", requireRole("candidate"), completeVirtual);

// ── Proctoring ────────────────────────────────────────────────────────────────
router.post("/:id/proctor/update", requireRole("candidate"), updateProctor);

// Terminate interview due to proctoring violation (look_away | tab_switch)
router.post("/:id/terminate",
  requireRole("candidate"),
  [body("reason").isIn(["look_away", "tab_switch"]).withMessage("Invalid termination reason")],
  validate, terminateInterview
);

export default router;
