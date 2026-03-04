import Interview from "../models/Interview.js";
import User from "../models/User.js";
import { generateText, parseGeminiJSON } from "../utils/gemini.js";
import { sendEmail } from "../utils/mailer.js";

// ── HR: Get all candidates (users with role=candidate) ──────────────────────
export async function getCandidates(req, res, next) {
  try {
    const candidates = await User.find({ role: "candidate", isActive: true }).select("-password").sort({ createdAt: -1 });
    // Attach latest interview status for each
    const result = await Promise.all(
      candidates.map(async (c) => {
        const latest = await Interview.findOne({ candidate: c._id }).sort({ createdAt: -1 }).select("status score mode difficulty jobRole createdAt");
        return { ...c.toJSON(), latestInterview: latest };
      })
    );
    res.json({ success: true, candidates: result });
  } catch (err) { next(err); }
}

// ── HR: Get all interviews created by this HR ────────────────────────────────
export async function getHRInterviews(req, res, next) {
  try {
    const interviews = await Interview.find({ hr: req.user._id })
      .populate("candidate", "name email")
      .sort({ createdAt: -1 });
    res.json({ success: true, interviews });
  } catch (err) { next(err); }
}

// ── HR: Analyze JD ───────────────────────────────────────────────────────────
export async function analyzeJD(req, res, next) {
  try {
    const { jobDescription, jobRole } = req.body;
    const prompt = `You are an expert technical recruiter. Analyze this job description and extract structured information.

Job Role: ${jobRole || "Not specified"}
Job Description:
"""
${jobDescription}
"""

Respond ONLY with valid JSON:
{
  "extractedJobRole": "string",
  "experienceLevel": "junior|mid|senior|lead",
  "primaryTechStack": ["string"],
  "secondarySkills": ["string"],
  "keyResponsibilities": ["string"],
  "coreCompetenciesRequired": ["string"],
  "suggestedInterviewConfig": {
    "recommendedMode": "mcq|virtual",
    "recommendedDifficulty": "easy|medium|hard",
    "suggestedQuestionCount": 8,
    "suggestedDurationMinutes": 45,
    "focusAreas": ["string"]
  },
  "summary": "string"
}`;
    const raw = await generateText(prompt, { temperature: 0.3 });
    const analysis = parseGeminiJSON(raw);
    res.json({ success: true, analysis });
  } catch (err) { next(err); }
}

// ── HR: Create interview (generate questions + assign) ───────────────────────
export async function createInterview(req, res, next) {
  try {

    const {
      candidateId,
      jobRole,
      jobDescription,
      techStack,
      mode,
      difficulty,
      numQuestions,
      durationMinutes,
      jdAnalysis
    } = req.body;

    const candidate = await User.findById(candidateId);

    if (!candidate || candidate.role !== "candidate") {
      return res.status(404).json({
        success: false,
        error: "Candidate not found"
      });
    }

    /* ─────────────────────────────────────
       Generate Interview Questions (Gemini)
    ───────────────────────────────────── */

    const diffMap = {
      easy: "basic/foundational",
      medium: "intermediate/practical",
      hard: "advanced/expert-level"
    };

    const diffLabel = diffMap[difficulty] || "intermediate";
    const techList = (techStack || []).join(", ") || "General";

    let prompt;

    if (mode === "mcq") {

      prompt = `You are an expert technical interviewer. Generate exactly ${numQuestions} MCQ questions.

Job Role: ${jobRole}
Tech Stack: ${techList}
Difficulty: ${diffLabel}

Job Description:
"""
${jobDescription}
"""

Respond ONLY with a valid JSON array:

[{
  "questionText": "string",
  "options": {"A":"string","B":"string","C":"string","D":"string"},
  "correctAnswer": "A|B|C|D",
  "explanation": "string",
  "topic": "string",
  "difficulty": "${difficulty}"
}]`;

    } else {

      prompt = `You are an expert technical interviewer. Generate exactly ${numQuestions} open-ended virtual interview questions.

Job Role: ${jobRole}
Tech Stack: ${techList}
Difficulty: ${diffLabel}

Job Description:
"""
${jobDescription}
"""

Respond ONLY with valid JSON array:

[{
  "questionText": "string",
  "topic": "string",
  "difficulty": "${difficulty}",
  "expectedKeyPoints": ["string"],
  "followUpHints": ["string"],
  "questionType": "conceptual|problem-solving|system-design|behavioral"
}]`;

    }

    const raw = await generateText(prompt, { temperature: 0.6 });

    const generatedQs = parseGeminiJSON(raw);

    if (!Array.isArray(generatedQs)) {
      throw new Error("Invalid questions format from AI");
    }

    /* ─────────────────────────────────────
       Set Interview Expiry
    ───────────────────────────────────── */

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    /* ─────────────────────────────────────
       Create Interview
    ───────────────────────────────────── */

    const interview = await Interview.create({
      hr: req.user._id,
      candidate: candidateId,
      jobRole,
      jobDescription,
      techStack: techStack || [],
      company: req.user.company || "",
      mode,
      difficulty,
      numQuestions,
      durationMinutes,
      questions: generatedQs,
      jdAnalysis: jdAnalysis || null,
      expiresAt
    });

    console.log("Interview assigned");

    /* ─────────────────────────────────────
       Build Interview Link
    ───────────────────────────────────── */

    const interviewLink =
      `${process.env.FRONTEND_URL}/interview/${interview._id}`;

    /* ─────────────────────────────────────
       Send Interview Email (Async)
    ───────────────────────────────────── */

    sendEmail(
  candidate._id,
  jobRole,
  jobDescription,
  req.user.company || "AI Interviewer",
  mode,
  durationMinutes,
  expiresAt,
  interviewLink
)
.then(() => {
  console.log("📧 Interview email sent successfully");
})
.catch(err => {
  console.log("❌ Interview email failed:", err);
});

    /* ─────────────────────────────────────
       Populate Candidate Details
    ───────────────────────────────────── */

    await interview.populate("candidate", "name email");

    res.status(201).json({
      success: true,
      interview
    });

  } catch (err) {

    console.log("Error while creating interview", err);

    next(err);

  }
}

// ── HR: Get single interview with full report ────────────────────────────────
export async function getInterviewById(req, res, next) {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate("candidate", "name email phone")
      .populate("hr", "name email company");
    if (!interview) return res.status(404).json({ success: false, error: "Interview not found" });

    // Ensure requester owns it (HR) or is the candidate
    const isHR = String(interview.hr._id) === String(req.user._id);
    const isCandidate = String(interview.candidate._id) === String(req.user._id);
    if (!isHR && !isCandidate)
      return res.status(403).json({ success: false, error: "Not authorized" });

    res.json({ success: true, interview });
  } catch (err) { next(err); }
}

// ── Candidate: Get assigned interviews ───────────────────────────────────────
export async function getCandidateInterviews(req, res, next) {
  try {
    const interviews = await Interview.find({ candidate: req.user._id })
      .populate("hr", "name company")
      .sort({ createdAt: -1 })
      .select("-questions.correctAnswer -questions.explanation -questions.expectedKeyPoints");
    res.json({ success: true, interviews });
  } catch (err) { next(err); }
}

// ── Candidate: Start interview ───────────────────────────────────────────────
export async function startInterview(req, res, next) {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, candidate: req.user._id });
    if (!interview) return res.status(404).json({ success: false, error: "Interview not found" });
    if (interview.status === "completed") return res.status(400).json({ success: false, error: "Interview already completed" });
    if (interview.status === "expired") return res.status(400).json({ success: false, error: "Interview has expired" });

    interview.status = "in_progress";
    interview.startedAt = new Date();
    await interview.save();

    // Return with correct answers HIDDEN for mcq (show after submit)
    const safeQuestions = interview.questions.map((q) => {
      const obj = q.toObject();
      if (interview.mode === "mcq") { delete obj.correctAnswer; delete obj.explanation; }
      return obj;
    });

    res.json({ success: true, interview: { ...interview.toObject(), questions: safeQuestions } });
  } catch (err) { next(err); }
}

// ── Candidate: Submit MCQ ────────────────────────────────────────────────────
export async function submitMCQ(req, res, next) {
  try {
    const { answers, proctorData } = req.body; // answers: [{questionId, selectedOption}]
    const interview = await Interview.findOne({ _id: req.params.id, candidate: req.user._id });
    if (!interview) return res.status(404).json({ success: false, error: "Not found" });
    if (interview.status !== "in_progress") return res.status(400).json({ success: false, error: "Interview not in progress" });

    const answerMap = {};
    for (const a of answers) answerMap[String(a.questionId)] = a.selectedOption;

    // Score answers
    const scoredAnswers = interview.questions.map((q) => {
      const selected = answerMap[String(q._id)] || null;
      const isCorrect = selected === q.correctAnswer;
      return {
        questionId: q._id, questionText: q.questionText, topic: q.topic,
        selectedOption: selected, isCorrect,
      };
    });

    const correct = scoredAnswers.filter((a) => a.isCorrect).length;
    const total = interview.questions.length;
    const percentage = Math.round((correct / total) * 100);

    // Topic breakdown
    const topicMap = {};
    for (const a of scoredAnswers) {
      if (!topicMap[a.topic]) topicMap[a.topic] = { correct: 0, total: 0 };
      topicMap[a.topic].total++;
      if (a.isCorrect) topicMap[a.topic].correct++;
    }
    const topicBreakdown = Object.entries(topicMap).map(([topic, d]) => ({
      topic, correct: d.correct, total: d.total,
      percentage: Math.round((d.correct / d.total) * 100),
    }));

    // Gemini AI insights
    const topicStr = topicBreakdown.map((t) => `- ${t.topic}: ${t.correct}/${t.total} (${t.percentage}%)`).join("\n");
    const wrongStr = scoredAnswers.filter((a) => !a.isCorrect)
      .map((a) => `- ${a.questionText} | Selected: ${a.selectedOption || "none"}`).join("\n") || "None";
    const aiPrompt = `You are an expert interviewer. Evaluate MCQ results for a ${interview.jobRole} candidate.
Score: ${correct}/${total} (${percentage}%)
Topic Breakdown:\n${topicStr}
Wrong Questions:\n${wrongStr}

Respond ONLY with valid JSON:
{
  "overallSummary": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendations": ["string"],
  "hiringRecommendation": "Strong Hire|Hire|Consider|Reject",
  "hiringRationale": "string"
}`;
    const aiRaw = await generateText(aiPrompt, { temperature: 0.4 });
    const aiReport = parseGeminiJSON(aiRaw);

    // Proctor analysis if data provided
    let proctorReport = null;
    if (proctorData) {
      const pPrompt = `You are an AI proctoring system. Interview: ${interview.durationMinutes} min.
Signals: tab switches: ${proctorData.tabSwitches||0}, fullscreen exits: ${proctorData.fullscreenExits||0}, long pauses: ${proctorData.longPauses||0}, camera disconnects: ${proctorData.cameraDisconnects||0}

Respond ONLY with valid JSON:
{"integrityScore":number,"riskLevel":"Low|Medium|High|Critical","flags":[{"type":"string","severity":"string","detail":"string"}],"behaviorSummary":"string","recommendation":"string"}`;
      const pRaw = await generateText(pPrompt, { temperature: 0.2 });
      proctorReport = parseGeminiJSON(pRaw);
    }

    // Save to DB
    interview.answers = scoredAnswers;
    interview.score = { correct, total, percentage };
    interview.topicBreakdown = topicBreakdown;
    interview.aiReport = aiReport;
    if (proctorReport) interview.proctorReport = { ...proctorData, ...proctorReport };
    interview.status = "completed";
    interview.completedAt = new Date();
    await interview.save();

    res.json({ success: true, interview: await Interview.findById(interview._id).populate("candidate", "name email").populate("hr", "name company") });
  } catch (err) { next(err); }
}

// ── Virtual: Get next question ───────────────────────────────────────────────
export async function virtualNextQuestion(req, res, next) {
  try {
    const { currentQuestionIndex } = req.body;
    const interview = await Interview.findOne({ _id: req.params.id, candidate: req.user._id });
    if (!interview) return res.status(404).json({ success: false, error: "Not found" });
    if (interview.mode !== "virtual") return res.status(400).json({ success: false, error: "Not a virtual interview" });

    // Return pre-generated question
    const q = interview.questions[currentQuestionIndex];
    if (!q) return res.json({ success: true, done: true });

    res.json({
      success: true, done: false,
      question: { _id: q._id, questionText: q.questionText, topic: q.topic, questionType: q.questionType, internalHint: q.expectedKeyPoints?.join(", ") },
      questionIndex: currentQuestionIndex,
      totalQuestions: interview.questions.length,
    });
  } catch (err) { next(err); }
}

// ── Virtual: Submit single response ─────────────────────────────────────────
export async function virtualSubmitResponse(req, res, next) {
  try {
    const { questionId, responseText, conversationHistory } = req.body;
    const interview = await Interview.findOne({ _id: req.params.id, candidate: req.user._id });
    if (!interview) return res.status(404).json({ success: false, error: "Not found" });

    const q = interview.questions.id(questionId);
    if (!q) return res.status(404).json({ success: false, error: "Question not found" });

    // Evaluate with Gemini
    const prompt = `You are a technical interviewer evaluating a virtual interview response.
Job Role: ${interview.jobRole} | Difficulty: ${interview.difficulty}
Tech Stack: ${interview.techStack.join(", ") || "General"}
Question: "${q.questionText}"
Expected Key Points: ${q.expectedKeyPoints?.join(", ") || "N/A"}
Candidate Answer: "${responseText}"

Score on: Technical Accuracy (0-40), Depth & Completeness (0-30), Communication Clarity (0-20), Practical Examples (0-10).
Respond ONLY with valid JSON:
{"score":0-100,"maxScore":100,"technicalAccuracy":0-40,"depthScore":0-30,"clarityScore":0-20,"practicalScore":0-10,"verdict":"Excellent|Good|Average|Poor","strengths":["string"],"gaps":["string"],"idealAnswerSummary":"string"}`;

    const raw = await generateText(prompt, { temperature: 0.3 });
    const evaluation = parseGeminiJSON(raw);

    // Save answer + append to conversation
    const alreadyIdx = interview.answers.findIndex((a) => String(a.questionId) === String(questionId));
    const answerEntry = { questionId: q._id, questionText: q.questionText, topic: q.topic, responseText, ...evaluation };
    if (alreadyIdx >= 0) interview.answers[alreadyIdx] = answerEntry;
    else interview.answers.push(answerEntry);

    // Append messages to conversation
    if (conversationHistory) interview.conversationHistory = conversationHistory;

    await interview.save();
    res.json({ success: true, evaluation });
  } catch (err) { next(err); }
}

// ── Virtual: Complete interview ──────────────────────────────────────────────
export async function completeVirtual(req, res, next) {
  try {
    const { conversationHistory, proctorData } = req.body;
    const interview = await Interview.findOne({ _id: req.params.id, candidate: req.user._id });
    if (!interview) return res.status(404).json({ success: false, error: "Not found" });
    if (interview.status === "completed") return res.json({ success: true, interview });

    const totalRaw = interview.answers.reduce((s, a) => s + (a.score || 0), 0);
    const maxPossible = interview.answers.length * 100;
    const percentage = maxPossible > 0 ? Math.round((totalRaw / maxPossible) * 100) : 0;

    // Topic breakdown
    const topicMap = {};
    for (const a of interview.answers) {
      if (!topicMap[a.topic]) topicMap[a.topic] = { total: 0, sum: 0 };
      topicMap[a.topic].total++;
      topicMap[a.topic].sum += a.score || 0;
    }
    const topicBreakdown = Object.entries(topicMap).map(([topic, d]) => ({
      topic, correct: d.sum, total: d.total * 100,
      percentage: Math.round(d.sum / d.total),
    }));

    // Final AI report
    const evalSummary = interview.answers.map((a, i) =>
      `Q${i+1} [${a.verdict||"?"}]: ${a.score||0}/100 - ${a.questionText?.slice(0,60)}... Gaps: ${(a.gaps||[]).join(", ") || "None"}`
    ).join("\n");

    const prompt = `You are an expert interviewer. Write a final virtual interview evaluation.
Candidate for: ${interview.jobRole} | Difficulty: ${interview.difficulty}
Tech: ${interview.techStack.join(", ") || "General"}
Score: ${totalRaw}/${maxPossible} (${percentage}%)
Per-Question Summary:\n${evalSummary}

Respond ONLY with valid JSON:
{"executiveSummary":"string","technicalCompetency":"string","softSkillsAssessment":"string","strengths":["string"],"areasForImprovement":["string"],"overallRating":"Excellent|Good|Average|Below Average","hiringRecommendation":"Strong Hire|Hire|Consider|Reject","hiringRationale":"string","suggestedNextSteps":["string"]}`;

    const raw = await generateText(prompt, { temperature: 0.4 });
    const aiReport = parseGeminiJSON(raw);

    // Proctor
    let proctorReport = null;
    if (proctorData) {
      const pPrompt = `Proctoring assessment for ${interview.durationMinutes}-min interview.
Signals: tab switches: ${proctorData.tabSwitches||0}, exits: ${proctorData.fullscreenExits||0}, pauses: ${proctorData.longPauses||0}, camera drops: ${proctorData.cameraDisconnects||0}
Respond ONLY JSON: {"integrityScore":number,"riskLevel":"Low|Medium|High|Critical","behaviorSummary":"string","recommendation":"string"}`;
      const pRaw = await generateText(pPrompt, { temperature: 0.2 });
      proctorReport = parseGeminiJSON(pRaw);
    }

    if (conversationHistory) interview.conversationHistory = conversationHistory;
    interview.score = { totalRaw, maxPossible, percentage };
    interview.topicBreakdown = topicBreakdown;
    interview.aiReport = aiReport;
    if (proctorReport) interview.proctorReport = { ...proctorData, ...proctorReport };
    interview.status = "completed";
    interview.completedAt = new Date();
    await interview.save();

    res.json({ success: true, interview: await Interview.findById(interview._id).populate("candidate", "name email").populate("hr", "name company") });
  } catch (err) { next(err); }
}

// ── HR: Generate feedback email ───────────────────────────────────────────────
export async function generateFeedbackEmail(req, res, next) {
  try {
    const interview = await Interview.findById(req.params.id).populate("candidate", "name email").populate("hr", "name company");
    if (!interview) return res.status(404).json({ success: false, error: "Not found" });

    const verdict = interview.aiReport?.hiringRecommendation || "Consider";
    const strengths = interview.aiReport?.strengths || [];
    const improvements = interview.aiReport?.weaknesses || interview.aiReport?.areasForImprovement || [];

    const prompt = `Write a professional interview feedback email.
Candidate: ${interview.candidate.name} | Role: ${interview.jobRole} | Company: ${interview.company || "Our Company"}
Decision: ${verdict} | Score: ${interview.score?.percentage}%
Strengths: ${strengths.join(", ")}
Areas to improve: ${improvements.join(", ")}

Respond ONLY with valid JSON: {"subject":"string","body":"string"}`;
    const raw = await generateText(prompt, { temperature: 0.6 });
    const email = parseGeminiJSON(raw);

    res.json({ success: true, email });
  } catch (err) { next(err); }
}

// ── HR: Dashboard stats ───────────────────────────────────────────────────────
export async function getHRStats(req, res, next) {
  try {
    const [total, completed, pending, inProgress] = await Promise.all([
      Interview.countDocuments({ hr: req.user._id }),
      Interview.countDocuments({ hr: req.user._id, status: "completed" }),
      Interview.countDocuments({ hr: req.user._id, status: "pending" }),
      Interview.countDocuments({ hr: req.user._id, status: "in_progress" }),
    ]);
    const completedInterviews = await Interview.find({ hr: req.user._id, status: "completed" }).select("score");
    const avgScore = completedInterviews.length
      ? Math.round(completedInterviews.reduce((s, i) => s + (i.score?.percentage || 0), 0) / completedInterviews.length)
      : 0;
    const candidateCount = await User.countDocuments({ role: "candidate" });
    res.json({ success: true, stats: { total, completed, pending, inProgress, avgScore, candidateCount } });
  } catch (err) { next(err); }
}

// ── Update proctor signals (live, called periodically) ───────────────────────
export async function updateProctor(req, res, next) {
  try {
    const { tabSwitches, fullscreenExits, longPauses, cameraDisconnects } = req.body;
    await Interview.findOneAndUpdate(
      { _id: req.params.id, candidate: req.user._id },
      { "proctorReport.tabSwitches": tabSwitches || 0, "proctorReport.fullscreenExits": fullscreenExits || 0, "proctorReport.longPauses": longPauses || 0, "proctorReport.cameraDisconnects": cameraDisconnects || 0 }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
}

// ── Candidate: Terminate interview early (proctoring violation) ───────────────
// Reasons: "look_away" | "tab_switch"
// Scores only the answers already submitted up to this point.
export async function terminateInterview(req, res, next) {
  try {
    const { reason, partialAnswers, proctorSnapshot, conversationHistory } = req.body;

    const interview = await Interview.findOne({
      _id: req.params.id,
      candidate: req.user._id,
    });

    if (!interview) return res.status(404).json({ success: false, error: "Interview not found" });
    if (interview.status === "completed" || interview.status === "terminated") {
      return res.json({ success: true, interview }); // idempotent
    }

    const now = new Date();

    // ── MCQ: score partial answers ───────────────────────────────────────────
    if (interview.mode === "mcq" && partialAnswers?.length > 0) {
      const answerMap = {};
      for (const a of partialAnswers) answerMap[String(a.questionId)] = a.selectedOption;

      // Only score questions that have an answer
      const scoredAnswers = interview.questions
        .filter((q) => answerMap[String(q._id)])
        .map((q) => {
          const selected = answerMap[String(q._id)];
          return {
            questionId: q._id,
            questionText: q.questionText,
            topic: q.topic,
            selectedOption: selected,
            isCorrect: selected === q.correctAnswer,
          };
        });

      const correct = scoredAnswers.filter((a) => a.isCorrect).length;
      const total = interview.questions.length; // total is still full count
      const answered = scoredAnswers.length;
      const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

      // Topic breakdown for answered questions only
      const topicMap = {};
      for (const a of scoredAnswers) {
        if (!topicMap[a.topic]) topicMap[a.topic] = { correct: 0, total: 0 };
        topicMap[a.topic].total++;
        if (a.isCorrect) topicMap[a.topic].correct++;
      }
      const topicBreakdown = Object.entries(topicMap).map(([topic, d]) => ({
        topic, correct: d.correct, total: d.total,
        percentage: Math.round((d.correct / d.total) * 100),
      }));

      interview.answers = scoredAnswers;
      interview.score = { correct, total, percentage, isPartial: true };
      interview.topicBreakdown = topicBreakdown;
    }

    // ── Virtual: score partial responses already saved ───────────────────────
    if (interview.mode === "virtual" && interview.answers?.length > 0) {
      const totalRaw = interview.answers.reduce((s, a) => s + (a.score || 0), 0);
      const maxPossible = interview.questions.length * 100; // full denominator
      const percentage = maxPossible > 0 ? Math.round((totalRaw / maxPossible) * 100) : 0;
      interview.score = { totalRaw, maxPossible, percentage, isPartial: true };

      if (conversationHistory?.length) {
        interview.conversationHistory = conversationHistory;
      }
    }

    // ── Proctor snapshot ─────────────────────────────────────────────────────
    const terminationLabel =
      reason === "look_away"
        ? "Interview terminated: candidate looked away from screen for more than 5 seconds"
        : "Interview terminated: candidate switched tabs or left the browser window";

    interview.proctorReport = {
      ...(interview.proctorReport?.toObject?.() || interview.proctorReport || {}),
      ...(proctorSnapshot || {}),
      terminatedBy: reason,
      terminatedAt: now,
      integrityScore: 0,
      riskLevel: "Critical",
      behaviorSummary: terminationLabel,
      recommendation: "Invalidate session",
    };

    // ── Build a minimal AI report note ───────────────────────────────────────
    interview.aiReport = {
      ...(interview.aiReport?.toObject?.() || interview.aiReport || {}),
      terminationNote: terminationLabel,
      hiringRecommendation: "Reject",
      hiringRationale: `Session auto-terminated due to proctoring violation: ${reason === "look_away" ? "look-away detected" : "tab switch detected"}.`,
      overallSummary: `Interview was terminated early. Only ${interview.answers?.length || 0} of ${interview.numQuestions} questions were answered.`,
    };

    interview.status = "terminated";
    interview.terminationReason = reason;
    interview.terminatedAt = now;
    interview.completedAt = now;

    await interview.save();

    const populated = await Interview.findById(interview._id)
      .populate("candidate", "name email")
      .populate("hr", "name company");

    res.json({ success: true, interview: populated });
  } catch (err) { next(err); }
}
