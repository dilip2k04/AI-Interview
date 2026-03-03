import mongoose from "mongoose";

const mcqOptionSchema = new mongoose.Schema({ A: String, B: String, C: String, D: String }, { _id: false });

const questionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true },
    topic: { type: String, default: "General" },
    difficulty: { type: String, enum: ["easy", "medium", "hard"] },
    options: mcqOptionSchema,
    correctAnswer: { type: String },
    explanation: { type: String },
    expectedKeyPoints: [String],
    followUpHints: [String],
    questionType: { type: String },
  },
  { _id: true }
);

const candidateAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId },
    questionText: String,
    topic: String,
    selectedOption: String,
    isCorrect: Boolean,
    responseText: String,
    score: { type: Number, min: 0, max: 100 },
    maxScore: { type: Number, default: 100 },
    technicalAccuracy: Number,
    depthScore: Number,
    clarityScore: Number,
    practicalScore: Number,
    verdict: { type: String, enum: ["Excellent", "Good", "Average", "Poor"] },
    strengths: [String],
    gaps: [String],
    idealAnswerSummary: String,
  },
  { _id: false }
);

const proctorSchema = new mongoose.Schema(
  {
    tabSwitches: { type: Number, default: 0 },
    fullscreenExits: { type: Number, default: 0 },
    longPauses: { type: Number, default: 0 },
    cameraDisconnects: { type: Number, default: 0 },
    lookAwayEvents: { type: Number, default: 0 },
    avgResponseTimeSeconds: Number,
    integrityScore: Number,
    riskLevel: { type: String, enum: ["Low", "Medium", "High", "Critical"] },
    behaviorSummary: String,
    recommendation: String,
    terminatedBy: { type: String, enum: ["look_away", "tab_switch"], default: null },
    terminatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const conversationMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["ai", "candidate"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const aiReportSchema = new mongoose.Schema(
  {
    overallSummary: String,
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    hiringRecommendation: { type: String, enum: ["Strong Hire", "Hire", "Consider", "Reject"] },
    hiringRationale: String,
    executiveSummary: String,
    technicalCompetency: String,
    softSkillsAssessment: String,
    overallRating: String,
    suggestedNextSteps: [String],
    candidateFeedback: String,
    hrNotes: String,
    terminationNote: String,
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    hr: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    jobRole: { type: String, required: true },
    jobDescription: { type: String, required: true },
    techStack: [String],
    company: String,
    mode: { type: String, enum: ["mcq", "virtual"], required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    numQuestions: { type: Number, required: true },
    durationMinutes: { type: Number, required: true },

    // ── Status now includes "terminated" ────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "expired", "terminated"],
      default: "pending",
    },
    terminationReason: {
      type: String,
      enum: ["look_away", "tab_switch", null],
      default: null,
    },

    questions: [questionSchema],
    answers: [candidateAnswerSchema],
    conversationHistory: [conversationMessageSchema],

    score: {
      correct: Number,
      total: Number,
      percentage: Number,
      totalRaw: Number,
      maxPossible: Number,
      isPartial: { type: Boolean, default: false }, // true when terminated early
    },

    topicBreakdown: [
      { topic: String, correct: Number, total: Number, percentage: Number, _id: false },
    ],

    jdAnalysis: { type: mongoose.Schema.Types.Mixed },
    aiReport: aiReportSchema,
    proctorReport: proctorSchema,

    startedAt: Date,
    completedAt: Date,
    terminatedAt: Date,
    expiresAt: Date,
  },
  { timestamps: true }
);

interviewSchema.index({ candidate: 1, status: 1 });
interviewSchema.index({ hr: 1, createdAt: -1 });

export default mongoose.model("Interview", interviewSchema);
