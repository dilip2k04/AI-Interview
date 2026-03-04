import BASE_URL from "../config";

// const BASE = BASE_URL;
const BASE = "https://ai-interview-l6am.onrender.com/api";

console.log("Backend URL : " + BASE);

async function req(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  const contentType = res.headers.get("content-type");

  if (!contentType || !contentType.includes("application/json")) {
    const text = await res.text();
    console.error("[API] Non-JSON response:", text.substring(0, 200));
    throw new Error(`Server returned non-JSON response (${res.status}). Check backend URL and CORS.`);
  }

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

const get  = (url)       => req(url);
const post = (url, body) => req(url, { method: "POST", body });
const put  = (url, body) => req(url, { method: "PUT", body });

export const api = {
  register: (data)      => post("/auth/register", data),
  login:    (data)      => post("/auth/login", data),
  getMe:    ()          => get("/auth/me"),
  updateProfile: (data) => put("/auth/profile", data),

  getHRStats:      ()      => get("/interviews/hr/stats"),
  getCandidates:   ()      => get("/interviews/hr/candidates"),
  getHRInterviews: ()      => get("/interviews/hr/list"),
  analyzeJD:       (jd,r)  => post("/interviews/hr/analyze-jd", { jobDescription: jd, jobRole: r }),
  createInterview: (data)  => post("/interviews/hr/create", data),
  generateFeedbackEmail:(id)=> post(`/interviews/hr/${id}/feedback-email`, {}),

  getCandidateInterviews: ()      => get("/interviews/candidate/list"),
  startInterview:         (id)    => post(`/interviews/${id}/start`, {}),
  submitMCQ:              (id,a,p)=> post(`/interviews/${id}/submit-mcq`, { answers: a, proctorData: p }),

  virtualNextQuestion:   (id,i) => post(`/interviews/${id}/virtual/next-question`, { currentQuestionIndex: i }),
  virtualSubmitResponse: (id,d) => post(`/interviews/${id}/virtual/submit-response`, d),
  completeVirtual:       (id,d) => post(`/interviews/${id}/virtual/complete`, d),

  getInterview:  (id)    => get(`/interviews/${id}`),
  updateProctor: (id,d)  => post(`/interviews/${id}/proctor/update`, d),

  terminateInterview: (id, reason, partialAnswers, proctorSnapshot, conversationHistory) =>
    post(`/interviews/${id}/terminate`, {
      reason,
      partialAnswers: partialAnswers || [],
      proctorSnapshot: proctorSnapshot || {},
      conversationHistory: conversationHistory || [],
    }),

  listProjects:  ()      => get("/projects"),
  createProject: (data)  => post("/projects", data),
  getProject:    (id)    => get(`/projects/${id}`),
  updateProject: (id,d)  => put(`/projects/${id}`, d),
  deleteProject: (id)    => req(`/projects/${id}`, { method: "DELETE" }),

  bulkAssign: (projectId, data) => post(`/projects/${projectId}/bulk-assign`, data),
};
