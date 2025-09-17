import { Request, Response } from "express";
import prisma from "../Connection/prisma";
import { setResponse } from "../DTO";

// ✅ POST /api/companies - create a new company
export const createCompany = async (req: Request, res: Response) => {
    try {
        const { name, iconUrl, website, location } = req.body;

        if (!name) {
            res.status(400).send(setResponse(400, "Company name is required", []));
            return;
        }

        const existingCompany = await prisma.company.findUnique({ where: { name } });
        if (existingCompany) {
            res.status(400).send(setResponse(400, "Company with this name already exists", []));
            return;
        }

        const company = await prisma.company.create({
            data: { name, iconUrl, website, location },
        });

        res.status(201).send(setResponse(201, "Company created successfully", company));
        return;
    } catch (error) {
        console.error("Error creating company:", error);
        res.status(500).send(setResponse(500, "Server error", []));
        return;
    }
};

// ✅ GET /api/companies - fetch all companies
export const getAllCompanies = async (_req: Request, res: Response) => {
    try {
        const companies = await prisma.company.findMany({
            orderBy: { createdAt: "desc" },
        });

        res.status(200).send(setResponse(200, "Companies fetched successfully", companies));
        return;
    } catch (error) {
        console.error("Error fetching companies:", error);
        res.status(500).send(setResponse(500, "Server error", []));
        return;
    }
};

// ✅ GET /api/companies/:id - fetch single company
export const getCompany = async (req: Request, res: Response) => {
    try {
        const companyId = Number(req.params.id);
        if (isNaN(companyId)) {
            res.status(400).send(setResponse(400, "Invalid company ID", []));
            return;
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: { jobs: true, employees: true },
        });

        if (!company) {
            res.status(404).send(setResponse(404, "Company not found", []));
            return;
        }

        res.status(200).send(setResponse(200, "Company fetched successfully", company));
        return;
    } catch (error) {
        console.error("Error fetching company:", error);
        res.status(500).send(setResponse(500, "Server error", []));
        return;
    }
};

// ✅ PUT /api/companies/:id - update a company
export const updateCompany = async (req: Request, res: Response) => {
    try {
        const companyId = Number(req.params.id);
        if (isNaN(companyId)) {
            res.status(400).send(setResponse(400, "Invalid company ID", []));
            return;
        }

        const { name, iconUrl, website, location } = req.body;

        const company = await prisma.company.update({
            where: { id: companyId },
            data: { name, iconUrl, website, location },
        });

        res.status(200).send(setResponse(200, "Company updated successfully", company));
        return;
    } catch (error: any) {
        if (error.code === "P2025") {
            res.status(404).send(setResponse(404, "Company not found", []));
            return;
        }
        console.error("Error updating company:", error);
        res.status(500).send(setResponse(500, "Server error", []));
        return;
    }
};

// ✅ DELETE /api/companies/:id - delete a company
export const deleteCompany = async (req: Request, res: Response) => {
    try {
        const companyId = Number(req.params.id);
        if (isNaN(companyId)) {
            res.status(400).send(setResponse(400, "Invalid company ID", []));
            return;
        }

        await prisma.company.delete({ where: { id: companyId } });

        res.status(200).send(setResponse(200, "Company deleted successfully", []));
        return;
    } catch (error: any) {
        if (error.code === "P2025") {
            res.status(404).send(setResponse(404, "Company not found", []));
            return;
        }
        console.error("Error deleting company:", error);
        res.status(500).send(setResponse(500, "Server error", []));
        return;
    }
};
