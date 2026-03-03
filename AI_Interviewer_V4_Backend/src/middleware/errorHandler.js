import { validationResult } from "express-validator";

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({
      success: false,
      error: "Validation failed",
      fields: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  next();
}

export function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ success: false, error: `${field} already exists` });
  }
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, error: messages[0] });
  }
  if (err.name === "CastError")
    return res.status(400).json({ success: false, error: "Invalid ID format" });
  if (err.status === 429 || err.message?.includes("quota"))
    return res.status(429).json({ success: false, error: "AI quota exceeded. Please retry shortly." });
  if (err instanceof SyntaxError)
    return res.status(502).json({ success: false, error: "AI returned unparseable response. Retry." });

  res.status(err.status || 500).json({ success: false, error: err.message || "Internal server error" });
}
