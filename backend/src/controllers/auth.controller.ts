import type { Request, Response } from "express";

import { loginUser, registerUser } from "../auth/auth.service.js";

import type { AuthRequest } from "../middleware/auth.middleware.js";

import { User } from "../models/User.js";

const cookieOptions: import("express").CookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export async function register(
  req: Request,
  res: Response
) {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const result = await registerUser(
      email,
      password
    );

    res.cookie(
      "token",
      result.token,
      cookieOptions
    );

    return res.status(201).json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "EMAIL_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists",
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register",
    });
  }
}

export async function login(
  req: Request,
  res: Response
) {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await loginUser(
      email,
      password
    );

    res.cookie(
      "token",
      result.token,
      cookieOptions
    );

    return res.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_CREDENTIALS"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login",
    });
  }
}

export function logout(
  _req: Request,
  res: Response
) {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return res.json({
    success: true,
    message: "Logged out successfully",
  });
}

export async function me(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const user = await User.findById(req.user.id).select("email");

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, user: { id: req.user.id, email: user.email } });
  } catch (error) {
    console.error("Fetching current user failed:", error);
    return res.status(500).json({ success: false, message: "Unable to load user" });
  }
}