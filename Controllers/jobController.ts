import { Request, Response } from "express";
import prisma from "../Connection/prisma";
import { setResponse } from "../DTO";
import slugify from "slugify";

export const listJobs = async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.job.findMany({
      include: {
        company: true,
        poster: { select: { id: true, username: true, email: true, avatar: true } },
      },
      orderBy: [
        { featured: "desc" },
        { createdAt: "desc" },
      ],
    });

    res.status(200).send(setResponse(200, "Jobs fetched successfully", jobs));
  } catch (error) {
    console.error("Error listing jobs:", error);
    res.status(500).send(setResponse(500, "Server error", []));
  }
};

export const getJob = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        poster: { select: { id: true, username: true, email: true, avatar: true } },
        applications: {
          include: { seeker: { select: { id: true, username: true, avatar: true } } },
        },
      },
    });

    if (!job) {
      res.status(404).send(setResponse(404, "Job not found", []));
      return;
    }

    res.status(200).send(setResponse(200, "Job fetched successfully", job));
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).send(setResponse(500, "Server error", []));
  }
};

export const searchJobs = async (req: Request, res: Response) => {
  try {
    const q = req.query.q?.toString() || "";
    const jobs = await prisma.job.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { skills: { hasSome: [q] } },
          { location: { contains: q, mode: "insensitive" } },
          { employment: { in: [q as any] } },
          { experience: { in: [q as any] } },
          { company: { name: { contains: q, mode: "insensitive" } } },
        ],
      },

      include: { company: true },
    });

    res.status(200).send(setResponse(200, "Jobs search results", jobs));
  } catch (error) {
    console.error("Error searching jobs:", error);
    res.status(500).send(setResponse(500, "Server error", []));
  }
};

export const applyJob = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);
    const user = (req as any).user;

    const application = await prisma.application.create({
      data: { jobId, seekerId: user.id },
    });

    res.status(201).send(setResponse(201, "Applied successfully", application));
  } catch (error: any) {
    if (error.code === "P2002") {
      res.status(400).send(setResponse(400, "Already applied to this job", []));
      return;
    }
    console.error("Error applying job:", error);
    res.status(500).send(setResponse(500, "Server error", []));
  }
};

export const getClosestJobs = async (req: Request, res: Response) => {
  try {
    const id = (req as any).user.id;
    if (!id) {
      res.status(401).send(setResponse(401, "Unauthorized", []));
      return
    }
    const user = await prisma.profile.findUnique({ where: { id } });

    
    const jobs = await prisma.job.findMany({
      include: { company: true },
    });
    res.status(200).send(setResponse(200, "Closed jobs fetched", jobs));
  } catch (error) {
    console.error("Error fetching closed jobs:", error);
    res.status(500).send(setResponse(500, "Server error", []));
  }
};

export const getJobCandidates = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);

    const candidates = await prisma.application.findMany({
      where: { jobId },
      include: {
        seeker: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            profile: true,
          },
        },
      },
    });

    res.status(200).send(setResponse(200, "Candidates fetched", candidates));
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).send(setResponse(500, "Server error", []));
  }
};

export const postJob = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      skills,
      type,
      location,
      salaryMin,
      salaryMax,
      currency,
      experience,
      employment,
      openings,
      companyId,
      featured,
    } = req.body;

    const user = (req as any).user;

    // Generate slug from job title + company
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      res.status(404).send(setResponse(404, "Company not found", []));
      return
    }

    const slug = slugify(`${title}-${company.name}`, {
      lower: true,
      strict: true,
    });

    const job = await prisma.job.create({
      data: {
        title,
        description,
        skills,
        type,
        location,
        salaryMin,
        salaryMax,
        currency,
        experience,
        employment,
        openings: openings ?? 1,
        status: "OPEN",
        slug,
        featured: featured ?? false,
        posterId: user.id,
        companyId,
      },
    });

    res.status(201).send(setResponse(201, "Job posted successfully", job));
  } catch (error) {
    console.error("Error posting job:", error);
    res.status(500).send(setResponse(500, "Server error", []));
  }
};

export const getPostedJobs = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const jobs = await prisma.job.findMany({
      where: { posterId: user.id },
      include: { company: true, applications: true },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).send(setResponse(200, "Posted jobs fetched", jobs));
  } catch (error) {
    console.error("Error fetching posted jobs:", error);
    res.status(500).send(setResponse(500, "Server error", []));
  }
};

export const deleteJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // check if job exists
    const job = await prisma.job.findUnique({
      where: { id: Number(id) },
    });

    if (!job) {
      res.status(404).json(setResponse(404, "Job not found", []));
      return;
    }

    // delete job
    await prisma.job.delete({
      where: { id: Number(id) },
    });

    res.status(200).json(setResponse(200, "Job deleted successfully", []));
    return;
  } catch (error: any) {
    console.error("Error deleting job:", error);
    res.status(500).json(setResponse(500, "Internal server error", []));
    return;
  }
};
