import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import prisma from "../Connection/prisma";
import { setResponse } from "../DTO";

interface DecodedToken extends JwtPayload {
  id: number;
}

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | null = null;

    // check cookie first
    if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }
    // fallback to Authorization header
    else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401).send(setResponse(401, "Not authenticated", []));
      return;
    }

    // verify JWT
    const decoded = jwt.verify(token, process.env.secretKey || "defaultSecretKey") as DecodedToken;

    if (!decoded?.id) {
      res.status(401).send(setResponse(401, "Unauthorized", []));
      return;
    }

    // fetch user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(401).send(setResponse(401, "User not found", []));
      return;
    }

    // attach user to request
    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).send(setResponse(401, "Invalid or expired token", []));
    return;
  }
};

// Role-based guard
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).send(setResponse(401, "Not authenticated", []));
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).send(setResponse(403, "Forbidden: insufficient rights", []));
      return;
    }

    next();
  };
};
