import express from "express";
import { getMe, getProfile, updateProfile, deleteAlluser, deleteUser, getSummary, getResume } from "../Controllers/userController";
import { authenticateUser, authorizeRoles } from "../Middlewares/authMiddleware";

const router = express.Router();

// Authenticated routes
router.get("/me", authenticateUser, getMe);
router.get("/profile", authenticateUser, getProfile);
router.patch("/profile", authenticateUser, updateProfile);
router.post("/summary", authenticateUser, getSummary);
router.get("/getResume", getResume)

// Admin-only routes
router.delete("/users", authenticateUser, authorizeRoles("ADMIN"), deleteAlluser);
router.delete("/users/:id", authenticateUser, authorizeRoles("ADMIN"), deleteUser);

export default router;
