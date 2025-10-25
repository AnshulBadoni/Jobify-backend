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
    // const id = (req as any).user?.id;
    // if (!id) {
    //   res.status(401).send(setResponse(401, "Unauthorized", []));
    //   return
    // }
    // if (!refresh) {
    //   const existing = await prisma.profile.findUnique({
    //     where: { userId: id },
    //     select: { summary: true },
    //   });
    //   if (existing?.summary) {
    //     res.status(200).send(setResponse(200, "Summary fetched", existing.summary));
    //     return
    //   }
    // }

    let { usernames } = req.body;
    if (!Array.isArray(usernames)) {
      usernames = usernames.split(',').map((u: string) => u.trim());
    }

    const summary = await generateSummary(usernames);
    console.log("Summary generated:", summary);

    // const summaryData = await prisma.profile.upsert({
    //   where: { userId: id },
    //   update: { summary },
    //   create: { userId: id, summary },
    // });

    res.status(200).send(setResponse(200, "Summary generated", summary));
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
    const { fullName, email, avatar, bio, skills, experience } = req.body;

    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        bio,
        skills,
        experience,
        user: {
          update: {
            username: fullName,
            email,
            avatar,
          },
        },
      },
      create: {
        userId: user.id,
        bio,
        skills,
        experience,
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
      },
    });

    res.status(200).send(setResponse(200, "Profile saved successfully", profile));
  } catch (error) {
    console.error("Error saving profile:", error);
    res.status(500).send(setResponse(500, "Server error", []));
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
