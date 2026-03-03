import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer "))
      return res.status(401).json({ success: false, error: "No token provided" });

    const token = header.split(" ")[1];
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select("-password");
    if (!user || !user.isActive)
      return res.status(401).json({ success: false, error: "User not found or inactive" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role))
      return res.status(403).json({ success: false, error: `Access denied. Requires role: ${roles.join(" or ")}` });
    next();
  };
}
