import Project from "../models/Project.js";
import Interview from "../models/Interview.js";
import User from "../models/User.js";
import { generateText, parseGeminiJSON } from "../utils/gemini.js";
import { sendBatchMails, sendJobCreatedMail } from "../utils/mailer.js";

// ── Create project ────────────────────────────────────────────────────────────
export async function createProject(req, res, next) {
  try {

    const { name, description, jobRole, techStack, deadline, color, company } = req.body;

    const project = await Project.create({
      hr: req.user._id,
      name,
      description,
      jobRole,
      techStack: techStack || [],
      deadline: deadline || null,
      color: color || "cyan",
      company: company || req.user.company || "",
    });

    /* ─────────────────────────────────────
       Send project creation email
    ───────────────────────────────────── */

    sendJobCreatedMail(
      req.user.email,
      jobRole,
      req.user.company
    ).catch(err => console.log("Project mail failed:", err));

    res.status(201).json({
      success: true,
      project
    });

  } catch (err) {
    next(err);
  }
}

// ── List all projects for this HR (with interview counts) ────────────────────
export async function listProjects(req, res, next) {
  try {
    const projects = await Project.find({ hr: req.user._id }).sort({ createdAt: -1 });

    // Attach interview stats per project
    const enriched = await Promise.all(
      projects.map(async (p) => {
        const [total, completed, terminated, pending, inProgress] = await Promise.all([
          Interview.countDocuments({ project: p._id }),
          Interview.countDocuments({ project: p._id, status: "completed" }),
          Interview.countDocuments({ project: p._id, status: "terminated" }),
          Interview.countDocuments({ project: p._id, status: "pending" }),
          Interview.countDocuments({ project: p._id, status: "in_progress" }),
        ]);

        // Average score across completed interviews in project
        const completedDocs = await Interview.find({ project: p._id, status: "completed" }).select("score");
        const avgScore = completedDocs.length
          ? Math.round(completedDocs.reduce((s, i) => s + (i.score?.percentage || 0), 0) / completedDocs.length)
          : null;

        return {
          ...p.toObject(),
          stats: { total, completed, terminated, pending, inProgress, avgScore },
        };
      })
    );

    res.json({ success: true, projects: enriched });
  } catch (err) { next(err); }
}

// ── Get single project with its interviews ───────────────────────────────────
export async function getProject(req, res, next) {
  try {
    const project = await Project.findOne({ _id: req.params.id, hr: req.user._id });
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });

    const interviews = await Interview.find({ project: req.params.id })
      .populate("candidate", "name email")
      .sort({ createdAt: -1 });

    // Aggregate stats
    const completed   = interviews.filter((i) => i.status === "completed");
    const terminated  = interviews.filter((i) => i.status === "terminated");
    const pending     = interviews.filter((i) => i.status === "pending");
    const inProgress  = interviews.filter((i) => i.status === "in_progress");
    const avgScore    = completed.length
      ? Math.round(completed.reduce((s, i) => s + (i.score?.percentage || 0), 0) / completed.length)
      : null;

    res.json({
      success: true,
      project: project.toObject(),
      interviews,
      stats: {
        total: interviews.length,
        completed: completed.length,
        terminated: terminated.length,
        pending: pending.length,
        inProgress: inProgress.length,
        avgScore,
      },
    });
  } catch (err) { next(err); }
}

// ── Update project ────────────────────────────────────────────────────────────
export async function updateProject(req, res, next) {
  try {
    const { name, description, jobRole, techStack, deadline, color, status } = req.body;
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, hr: req.user._id },
      { name, description, jobRole, techStack, deadline, color, status },
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });
    res.json({ success: true, project });
  } catch (err) { next(err); }
}

// ── Delete project ────────────────────────────────────────────────────────────
export async function deleteProject(req, res, next) {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, hr: req.user._id });
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });
    // Unlink interviews (don't delete them, just unset project ref)
    await Interview.updateMany({ project: req.params.id }, { $unset: { project: "" } });
    res.json({ success: true, message: "Project deleted" });
  } catch (err) { next(err); }
}

// ── Bulk create interviews for multiple candidates ───────────────────────────
// POST /api/projects/:id/bulk-assign
// Body: { candidateIds[], jobRole, jobDescription, techStack, mode, difficulty, numQuestions, durationMinutes }
export async function bulkAssign(req, res, next) {
  try {
    const { candidateIds, jobRole, jobDescription, techStack, mode, difficulty, numQuestions, durationMinutes, jdAnalysis } = req.body;

    const project = await Project.findOne({ _id: req.params.id, hr: req.user._id });
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });

    if (!candidateIds?.length) return res.status(400).json({ success: false, error: "No candidates selected" });

    // Validate all candidates exist
    const candidates = await User.find({ _id: { $in: candidateIds }, role: "candidate" });
    if (candidates.length !== candidateIds.length)
      return res.status(400).json({ success: false, error: "One or more candidates not found" });

    // Generate ONE shared set of questions via Gemini (same bank for all)
    const diffMap = { easy: "basic/foundational", medium: "intermediate/practical", hard: "advanced/expert-level" };
    const techList = (techStack || []).join(", ") || "General";

    let prompt;
    if (mode === "mcq") {
      prompt = `Generate exactly ${numQuestions} MCQ interview questions.
Job Role: ${jobRole} | Tech: ${techList} | Difficulty: ${diffMap[difficulty] || "intermediate"}
Job Description: """${jobDescription}"""
Respond ONLY as JSON array:
[{"questionText":"string","options":{"A":"string","B":"string","C":"string","D":"string"},"correctAnswer":"A|B|C|D","explanation":"string","topic":"string","difficulty":"${difficulty}"}]`;
    } else {
      prompt = `Generate exactly ${numQuestions} open-ended virtual interview questions.
Job Role: ${jobRole} | Tech: ${techList} | Difficulty: ${diffMap[difficulty] || "intermediate"}
Job Description: """${jobDescription}"""
Respond ONLY as JSON array:
[{"questionText":"string","topic":"string","difficulty":"${difficulty}","expectedKeyPoints":["string"],"followUpHints":["string"],"questionType":"conceptual|problem-solving|system-design|behavioral"}]`;
    }

    const raw = await generateText(prompt, { temperature: 0.6 });
    const generatedQs = parseGeminiJSON(raw);
    if (!Array.isArray(generatedQs)) throw new Error("Invalid questions from AI");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create one interview per candidate (all share same questions)
    const interviews = await Promise.all(
      candidates.map((candidate) =>
        Interview.create({
          hr:            req.user._id,
          candidate:     candidate._id,
          project:       project._id,
          jobRole,
          jobDescription,
          techStack:     techStack || [],
          company:       req.user.company || project.company || "",
          mode,
          difficulty,
          numQuestions,
          durationMinutes,
          questions:     generatedQs,
          jdAnalysis:    jdAnalysis || null,
          expiresAt,
        })
      )
    );

    // sending batch email
const recipients = interviews.map((interview, i) => ({
  to: candidates[i].email,
  subject: `Interview Assigned for ${jobRole}`,
  body: `
  <h2>Hello ${candidates[i].name}</h2>

  <p>You have been assigned an interview.</p>

  <p><b>Role:</b> ${jobRole}</p>
  <p><b>Mode:</b> ${mode}</p>
  <p><b>Duration:</b> ${durationMinutes} minutes</p>

  <a href="${process.env.FRONTEND_URL}/interview/${interview._id}"
  style="background:#2563eb;color:white;padding:10px 18px;text-decoration:none;border-radius:6px;">
  Start Interview
  </a>

  <br><br>

  <p>Best regards,<br>${req.user.company}</p>
  `
}));
    sendBatchMails(recipients)
  .catch(err => console.log("Bulk email failed:", err)); 

    // Update project jobRole / techStack if not set
    if (!project.jobRole) {
      await Project.findByIdAndUpdate(project._id, { jobRole, techStack: techStack || [] });
    }

    const populated = await Interview.find({ _id: { $in: interviews.map((i) => i._id) } })
      .populate("candidate", "name email");

    res.status(201).json({ success: true, interviews: populated, count: populated.length });
  } catch (err) { next(err); }
}
