// Path: backend/src/middleware/dsaAuth.middleware.ts

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface DSARequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    full_name?: string;
  };
}

/* ─────────────────────────────────────────────
   AUTHENTICATE — verifies JWT token
───────────────────────────────────────────── */
export const authenticate = (
  req: DSARequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string; email: string; role: string;
    };

    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
    }
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
};

/* ─────────────────────────────────────────────
   DSA ONLY — blocks non-DSA roles
───────────────────────────────────────────── */
export const dsaOnly = (
  req: DSARequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "dsa") {
    return res.status(403).json({
      success: false,
      message: "Access denied. DSA account required.",
    });
  }
  next();
};