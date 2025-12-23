import { Request, Response } from "express";
import prisma from "../Connection/prisma";
import { setResponse } from "../DTO";
import { generateSummary } from "../gRPC/grpcClient";
import { generatePDF } from "../Services/resumeGenerator";
import path from "path";
import { Resume } from "../types";

// --------------------------------------------------
// Profile Controllers (req.user is already injected by middleware)
// --------------------------------------------------
export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
        experiences: {
          select: {
            id: true,
            role: true,
            companyName: true,
            description: true,
            startDate: true,
            endDate: true,
            isCurrent: true,
            location: true,
          },
          orderBy: {
            startDate: 'desc' // Show most recent first
          }
        },
        educations: {
          select: {
            id: true,
            degree: true,
            institution: true,
            fieldOfStudy: true,
            startYear: true,
            endYear: true,
            grade: true,
            description: true,
          },
          orderBy: {
            startYear: 'desc'
          }
        },
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            imgs: true,
            skills: true,
            link: true,
            startDate: true,
            endDate: true,
          }
        }
      }
    });

    if (!profile) {
      res.status(404).send(setResponse(404, "Profile not found", []));
      return;
    }

    res.status(200).send(setResponse(200, "Profile fetched", profile));
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).send(setResponse(500, "Server error", []));
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user; // injected from middleware
    res.status(200).send(setResponse(200, "Success", user));
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).send(setResponse(500, "Server error", []));
  }
};

export const getSummary = async (req: Request, res: Response) => {
  try {
    const refresh = req.body.refresh || false;
    const id = (req as any).user?.id;
    if (!id) {
      res.status(401).send(setResponse(401, "Unauthorized", []));
      return
    }
    console.log(refresh, "Refresh", req.body.usernames);
    if (!refresh) {
      const existing = await prisma.profile.findUnique({
        where: { userId: id },
        select: { summary: true, rating: true },
      });
      if (existing?.summary) {
        res.status(200).send(setResponse(200, "Summary fetched", existing));
        return
      }
    }

    let { usernames } = req.body;
    if (!Array.isArray(usernames)) {
      usernames = usernames.split(',').map((u: string) => u.trim());
    }

    const summary = await generateSummary(usernames);

    await prisma.profile.upsert({
      where: { userId: id },
      update: { summary: summary.overall_summary || "", rating: Number(summary.overall_rating.toFixed(1)) || null },
      create: { userId: id, summary: summary.overall_summary || "", rating: Number(summary.overall_rating.toFixed(1)) || null },
    });

    const summaryResponse = await prisma.profile.findUnique({
      where: { userId: id },
      select: { summary: true, rating: true },
    });
    res.status(200).send(setResponse(200, "Summary generated", summaryResponse));
  } catch (error) {
    console.error("Error generating summary:", error);
    res.status(500).send(setResponse(500, "Server error", []));
  }
};

export const getResume = async (req: Request, res: Response) => {
  const resume: Resume = {
    "name": "Anshul Badoni",
    "contact": "anshulbadoni359@gmail.com 8630736982",
    "summary": "Results-driven full-stack AI engineer with hands-on experience delivering scalable AI-enabled web applications. Proficient in Node.js, FastAPI, Next.js, Angular, and real-time systems; skilled in production ML integration, model serving, and data-driven personalization. Demonstrated ability to reduce latency, improve engagement, and drive observability in production systems. Seeking senior roles focused on end-to-end AI solution architecture and delivery.",
    "skills": [
      {
        "category": "Programming Languages",
        "items": [
          "C",
          "C++",
          "Java",
          "Python",
          "JavaScript",
          "TypeScript"
        ]
      },
      {
        "category": "Frameworks / Libraries",
        "items": [
          "Node.js",
          "Express.js",
          "NestJS",
          "FastAPI",
          "Angular",
          "React.js",
          "Next.js",
          "TensorFlow",
          "Scikit-learn"
        ]
      },
      {
        "category": "Tools / Platforms",
        "items": [
          "Git",
          "Tailwind CSS",
          "Redis",
          "Kafka",
          "BullMQ",
          "gRPC",
          "WebSockets",
          "WebRTC",
          "Janus Gateway",
          "ChromaDB"
        ]
      },
      {
        "category": "Databases",
        "items": [
          "MongoDB",
          "MySQL",
          "OracleDB",
          "PostgreSQL"
        ]
      }
    ],
    "experience": [
      {
        "title": "Software Engineer",
        "company": "Monet Networks",
        "location": "Gurugram",
        "period": "Apr 2025 - Present",
        "details": [
          "Maintained and extended real-time survey platform using Node.js, WebRTC and Janus Gateway, improving system stability by 30% and reducing response latency by 20%.",
          "Designed and integrated AI/ML microservices (face emotion detection, blink analysis) via FastAPI, increasing survey engagement and improving sentiment accuracy.",
          "Optimized backend workflows and API endpoints, achieving a 15% improvement in average API response time and enabling more personalized survey experiences.",
          "Collaborated with product and frontend teams to deliver low-latency real-time features and improve observability for production systems."
        ]
      },
      {
        "title": "Software Developer",
        "company": "Synergy Software",
        "location": "Noida",
        "period": "Apr 2024 - Apr 2025",
        "details": [
          "Implemented responsive finance products using Angular, Next.js, Node.js and Express.js, improving application performance and user experience through front-end and backend optimizations.",
          "Built modular, testable components and services to accelerate feature delivery and reduce regression risk across releases.",
          "Worked with stakeholders to convert business requirements into scalable technical solutions and improved deployment workflows."
        ]
      },
      {
        "title": "Data Science Intern",
        "company": "IBM",
        "location": "Remote",
        "period": "Jan 2024 - Apr 2024",
        "details": [
          "Developed a hybrid recommendation system that combined collaborative and content-based approaches to improve recommendation relevance.",
          "Implemented end-to-end evaluation pipelines to measure model performance and supported iteration on feature engineering and model tuning."
        ]
      }
    ],
    "education": [
      {
        "institution": "University of Petroleum and Energy Studies (UPES)",
        "location": "Dehradun",
        "degree": "MCA - AI & ML",
        "period": "2022 - 2024"
      },
      {
        "institution": "University of Petroleum and Energy Studies (UPES)",
        "location": "Dehradun",
        "degree": "BCA - IoT",
        "period": "2019 - 2022"
      }
    ],
    "projects": [
      {
        "title": "Jobify (AI-powered Job Matching)",
        "link": "",
        "tech": "Node.js, FastAPI, Next.js, gRPC, Redis, WebSockets",
        "description": "AI-driven job matching platform that combines profile parsing, vector search, and ML scoring. Utilizes Node.js for core services, FastAPI for AI tasks, gRPC for inter-service communication, Redis for caching, and WebSockets for real-time notifications; delivered a production-ready pipeline with reduced match latency."
      },
      {
        "title": "Compliance App",
        "link": "",
        "tech": "Next.js, Express.js, Node.js, PostgreSQL, Redis, WebSockets",
        "description": "Full-stack productivity tool with real-time chat and task management. Implemented Retrieval-Augmented Generation (RAG) to surface project insights and improve team productivity."
      },
      {
        "title": "J++ Language",
        "link": "",
        "tech": "C",
        "description": "Designed and implemented a dynamic programming language with a custom lexer, parser, and AST visitor in C to explore compiler concepts and language design."
      }
    ]
  }

  try {
    const outputPath = path.join(__dirname, "resume.pdf");
    await generatePDF(resume, outputPath);
    res.download(outputPath);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).send(setResponse(500, "Server error", []));
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      // Basic Info
      fullName,
      username,
      professionalRole,
      currentLocation,
      expectedLocation,
      currentCTC,
      expectedCTC,
      bio,
      background,
      githubUrl,
      resumeUrl,

      // Arrays/JSON fields
      skills,
      experiences,
      educations,
      projects,

      // User fields
      email,
      avatar,
    } = req.body;

    // Build dynamic update object for Profile
    const profileUpdate: any = {};
    if (fullName !== undefined) profileUpdate.fullName = fullName;
    if (professionalRole !== undefined) profileUpdate.professionalRole = professionalRole;
    if (bio !== undefined) profileUpdate.bio = bio;
    if (background !== undefined) profileUpdate.background = background;
    if (currentLocation !== undefined) profileUpdate.currentLocation = currentLocation;
    if (expectedLocation !== undefined) profileUpdate.expectedLocation = expectedLocation;
    if (currentCTC !== undefined) profileUpdate.currentCTC = currentCTC;
    if (expectedCTC !== undefined) profileUpdate.expectedCTC = expectedCTC;
    if (githubUrl !== undefined) profileUpdate.githubUrl = githubUrl;
    if (resumeUrl !== undefined) profileUpdate.resumeUrl = resumeUrl;

    // Handle skills array
    if (skills !== undefined) {
      profileUpdate.skills = Array.isArray(skills) ? skills : [];
    }

    // Build user update
    const userUpdate: any = {};
    if (username !== undefined) userUpdate.username = username;
    if (email !== undefined) userUpdate.email = email;
    if (avatar !== undefined) userUpdate.avatar = avatar;

    // Build relations FOR UPDATE (with deleteMany)
    const relationsForUpdate: any = {};

    if (experiences !== undefined && Array.isArray(experiences)) {
      relationsForUpdate.experiences = {
        deleteMany: {}, // Delete all existing
        create: experiences.map((exp: any) => ({
          role: exp.role || "",
          companyName: exp.company || "",
          description: exp.details || "",
          startDate: exp.period?.split('–')[0]?.trim() || exp.period?.split('-')[0]?.trim() || "",
          endDate: exp.period?.split('–')[1]?.trim() || exp.period?.split('-')[1]?.trim() || null,
          isCurrent: exp.period?.toLowerCase().includes('present') || false,
          location: exp.location || null,
        })),
      };
    }

    if (educations !== undefined && Array.isArray(educations)) {
      relationsForUpdate.educations = {
        deleteMany: {},
        create: educations.map((edu: any) => ({
          degree: edu.degree || "",
          institution: edu.institution || "",
          fieldOfStudy: edu.field || null,
          startYear: edu.year?.split('–')[0]?.trim() || edu.year?.split('-')[0]?.trim() || "",
          endYear: edu.year?.split('–')[1]?.trim() || edu.year?.split('-')[1]?.trim() || null,
          grade: edu.grade || null,
          description: edu.description || null,
        })),
      };
    }

    if (projects !== undefined && Array.isArray(projects)) {
      relationsForUpdate.projects = {
        deleteMany: {},
        create: projects.map((proj: any) => ({
          name: proj.name || "",
          description: proj.description || "",
          imgs: proj.img || [],
          skills: proj.skills || [],
          link: proj.link || null,
          startDate: proj.startDate || null,
          endDate: proj.endDate || null,
        })),
      };
    }

    // Build relations FOR CREATE (without deleteMany)
    const relationsForCreate: any = {};

    if (experiences !== undefined && Array.isArray(experiences)) {
      relationsForCreate.experiences = {
        create: experiences.map((exp: any) => ({
          role: exp.role || "",
          companyName: exp.company || "",
          description: exp.details || "",
          startDate: exp.period?.split('–')[0]?.trim() || exp.period?.split('-')[0]?.trim() || "",
          endDate: exp.period?.split('–')[1]?.trim() || exp.period?.split('-')[1]?.trim() || null,
          isCurrent: exp.period?.toLowerCase().includes('present') || false,
          location: exp.location || null,
        })),
      };
    }

    if (educations !== undefined && Array.isArray(educations)) {
      relationsForCreate.educations = {
        create: educations.map((edu: any) => ({
          degree: edu.degree || "",
          institution: edu.institution || "",
          fieldOfStudy: edu.field || null,
          startYear: edu.year?.split('–')[0]?.trim() || edu.year?.split('-')[0]?.trim() || "",
          endYear: edu.year?.split('–')[1]?.trim() || edu.year?.split('-')[1]?.trim() || null,
          grade: edu.grade || null,
          description: edu.description || null,
        })),
      };
    }

    if (projects !== undefined && Array.isArray(projects)) {
      relationsForCreate.projects = {
        create: projects.map((proj: any) => ({
          name: proj.name || "",
          description: proj.description || "",
          imgs: proj.img || [],
          skills: proj.skills || [],
          link: proj.link || null,
          startDate: proj.startDate || null,
          endDate: proj.endDate || null,
        })),
      };
    }

    console.log("Profile update object:", profileUpdate);
    console.log("Relations for update:", relationsForUpdate);

    // Update profile
    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        ...profileUpdate,
        ...relationsForUpdate, // ✅ WITH deleteMany
        ...(Object.keys(userUpdate).length > 0 && {
          user: { update: userUpdate },
        }),
      },
      create: {
        userId: user.id,
        fullName: fullName || "",
        bio: bio || "",
        professionalRole: professionalRole || "",
        background: background || "",
        currentLocation: currentLocation || "",
        expectedLocation: expectedLocation || "",
        currentCTC: currentCTC || "",
        expectedCTC: expectedCTC || "",
        githubUrl: githubUrl || "",
        resumeUrl: resumeUrl || "",
        skills: Array.isArray(skills) ? skills : [],
        ...relationsForCreate,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
        experiences: {
          orderBy: { startDate: 'desc' }
        },
        educations: {
          orderBy: { startYear: 'desc' }
        },
        projects: true,
      },
    });

    res.status(200).send(setResponse(200, "Profile updated successfully", profile));
  } catch (error) {
    console.error("Error updating profile:", error);

    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }

    res.status(500).send(setResponse(500, "Failed to update profile", []));
  }
};

// --------------------------------------------------
// Admin-only Controllers (middleware enforces ADMIN role)
// --------------------------------------------------
export const deleteAlluser = async (_req: Request, res: Response) => {
  try {
    await prisma.user.deleteMany();
    res.status(200).send(setResponse(200, "All users deleted", []));
  } catch (error) {
    console.error("Error deleting all users:", error);
    res.status(500).send(setResponse(500, "Error deleting users", []));
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.delete({ where: { id: Number(id) } });
    res.status(200).send(setResponse(200, "User deleted", user));
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send(setResponse(500, "Error deleting user", []));
  }
};
