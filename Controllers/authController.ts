import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import prisma from "../Connection/prisma";
import { setResponse } from "../DTO";
import { resolveToken } from "../utils";

export const signUp = async (req: Request, res: Response) => {
    try {
        const { username, email, role = "SEEKER", avatar = "", password, company = null } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                username,
                email,
                role,
                avatar,
                password: hashedPassword,
                profile: {
                    create: {},
                },
            },
            include: { profile: true },
        });
        // upsert user into give company if its not null and is poster,admin

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.secretKey || "defaultSecretKey",
            {
                expiresIn: "1d",
            }
        );
        res.cookie("jwt", token, {
            maxAge: 1 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            path: "/",
        });
        // Hide password in response
        const responseUser = { ...user, password: undefined };
        res.status(201).send(setResponse(res.statusCode, "User created", { ...responseUser, token }));
    } catch (error) {
        console.error("Error in signUp:", error);
        res.status(500).send(setResponse(res.statusCode, "Error creating user", []));
    }
};

export const signIn = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: { profile: true },
        });

        if (!user) {
            res.status(401).send(setResponse(401, "Login Failed", "Invalid Email or Password"));
            return
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(401).send(setResponse(401, "Login Failed", "Invalid Email or Password"));
            return
        }

        // Generate JWT
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.secretKey || "defaultSecretKey",
            { expiresIn: "1d" }
        );

        res.cookie("jwt", token, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            domain: ".crackjobs.in",
            path: "/",
            maxAge: 86400000,
        });



        const { password: _, ...safeUser } = user;

        // Check profile
        const needsProfileSetup = !user.profile;

        res.status(200).send(
            setResponse(res.statusCode, "Login Success", {
                user: safeUser,
                needsProfileSetup,
            })
        );
    } catch (error) {
        console.error(error);
        res.status(500).send(setResponse(res.statusCode, "Login Server Error", error));
    }
};


export const logout = async (_req: Request, res: Response) => {
    try {
        res.clearCookie("jwt", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        });
        res.status(200).send(setResponse(200, "Logout successful", []));
    } catch (error) {
        console.error("Error during logout:", error);
        res.status(500).send(setResponse(500, "Error during logout", []));
    }
};

