import { Router } from "express";
import { authenticateUser, authorizeRoles } from "../Middlewares/authMiddleware";
import { getAllCompanies, getCompany, createCompany, updateCompany, deleteCompany } from "../Controllers/companyController";

const router = Router();

////////////////////////// public routes ////////////////////////////
// Get all companies
router.get("/", getAllCompanies);
// Get single company by ID
router.get("/:id", getCompany);

////////////////////////// admin routes ////////////////////////////
// Create a new company
router.post(
    "/",
    // authenticateUser,
    // authorizeRoles("ADMIN"),
    createCompany
);

// Update company
router.put(
    "/:id",
    authenticateUser,
    authorizeRoles("ADMIN"),
    updateCompany
);

// Delete company
router.delete(
    "/:id",
    authenticateUser,
    authorizeRoles("ADMIN"),
    deleteCompany
);

export default router;
