import { Request, Response, NextFunction } from "express";
import prisma from "../Connection/prisma";
import { setResponse } from "../DTO";

export const saveUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const usernameExists = await prisma.user.findUnique({
            where: { username: req.body.username }
        });
        if (usernameExists) {
            res.status(409).send(setResponse(res.statusCode, "Username already exists", []));
            return
        }

        const emailExists = await prisma.user.findUnique({
            where: { email: req.body.email }
        });
        if (emailExists) {
            res.status(409).send(setResponse(res.statusCode, "Email already exists", []));
            return
        }

        next();
    } catch (error) {
        console.error("Error in saveUser:", error);
        res.status(500).send(setResponse(res.statusCode, "Error checking user", []));
    }
};

