import type {
  NextFunction,
  Request,
  Response,
} from "express";

import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const secret = process.env.SESSION_SECRET;

    if (!secret) {
      return res.status(500).json({
        success: false,
        message:
          "Server authentication configuration is missing",
      });
    }

    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.id !== "string"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid session",
      });
    }

    req.user = {
      id: decoded.id,
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session",
    });
  }
}