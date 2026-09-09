import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

interface AuthResult {
  user: {
    id: string;
    email: string;
  };
  token: string;
}

function createToken(userId: string): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is not defined");
  }

  return jwt.sign(
    {
      id: userId,
    },
    secret,
    {
      expiresIn: "7d",
    }
  );
}

export async function registerUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
    },

    token: createToken(user.id),
  };
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new Error("INVALID_CREDENTIALS");
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },

    token: createToken(user.id),
  };
}