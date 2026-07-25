// Path: backend/src/middleware/caAuth.middleware.ts

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface CARequest extends Request {
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
  req: CARequest,
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
   CA ONLY — blocks non-CA roles
───────────────────────────────────────────── */
export const caOnly = (
  req: CARequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "ca") {
    return res.status(403).json({
      success: false,
      message: "Access denied. CA account required.",
    });
  }
  next();
};