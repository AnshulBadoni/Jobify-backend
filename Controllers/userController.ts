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
    let { usernames } = req.body;
    console.log(usernames);
    // Always normalize into an array of strings
    if (!Array.isArray(usernames)) {
      usernames = [usernames];
    }
    console.log(usernames, "now");

    const summary = await generateSummary(usernames);
    // save it to db
    // const summaryData = await prisma.profile.upsert({
    //   where: { userId: (req as any).user.id },
    //   update: { summary },
    //   create: { userId: (req as any).user.id, summary },
    // })
    // if (!summaryData) {
    //   res.status(404).send(setResponse(404, "Summary not found", []));
    //   return;
    // }
    res.status(200).send(setResponse(200, "Summary generated", summary));
  } catch (error) {
    console.error("Error generating summary:", error);
    res.status(500).send(setResponse(500, "Server error", []));
  }
};

export const getResume = async (req: Request, res: Response) => {
  const resume: Resume = {
    "name": "Prince Sharma",
    "contact": "princesharma57200@gmail.com | +91 8979445689 | LinkedIn: https://www.linkedin.com/in/prince-sharma-3257721a7/ | GitHub: https://github.com/Prince57200",
    "summary": "Frontend-focused Angular Developer, a fresher, seeking a full-time role to build scalable, high-quality web applications. Proficient in Angular 17+, RxJS, NgRx, and modern CSS frameworks, with hands-on internship experience delivering responsive interfaces, component-driven architecture, and REST API integration. Eager to contribute to a collaborative team and drive user-centric outcomes.",
    "skills": [
      {
        "category": "Programming Languages",
        "items": [
          "HTML5",
          "CSS3",
          "JavaScript (ES6+)",
          "TypeScript",
          "Java"
        ]
      },
      {
        "category": "Frameworks / Libraries",
        "items": [
          "Angular 17+",
          "RxJS",
          "NgRx",
          "Bootstrap",
          "Tailwind CSS"
        ]
      },
      {
        "category": "Tools / Platforms",
        "items": [
          "VS Code",
          "Git",
          "Postman",
          "Chrome DevTools"
        ]
      },
      {
        "category": "Databases",
        "items": [
          "SQL (MySQL, PostgreSQL)"
        ]
      }
    ],
    "experience": [
      {
        "title": "Angular Developer Intern",
        "company": "Confidential Internship",
        "location": "Gurugram, India",
        "period": "May 2025 - August 2025",
        "details": [
          "Developed responsive, cross-device web applications using Angular 17, enhancing user experience.",
          "Built reusable components with two-way data binding and implemented routing to reduce code duplication and improve maintainability.",
          "Integrated RESTful APIs via HttpClient for real-time data exchange and seamless backend communication.",
          "Implemented form validation, route guards, and service-based component communication to ensure secure and reliable SPA functionality."
        ]
      }
    ],
    "education": [
      {
        "institution": "GL Bajaj Group of Institute",
        "degree": "B.Tech CSE",
        "period": "August 2019 - July 2023"
      }
    ],
    "projects": [
      {
        "title": "Probing Survey Creation",
        "link": "",
        "tech": "Angular, TypeScript, HTML, Tailwind, REST API",
        "description": "Designed and implemented a frontend platform for creating, editing, and managing surveys with secure token-based authentication and REST API integration. Built modular Angular components leveraging RxJS for asynchronous data flows and state management, ensuring a responsive and scalable UI. Implemented client-side form validation, role-based access controls, and efficient routing to optimize user workflows. Collaborated with backend teams to integrate REST endpoints, improving data reliability and performance."
      },
      {
        "title": "Taker Web Application",
        "link": "",
        "tech": "Angular, Java Servlets, Hibernate, MySQL, HTML, CSS, Bootstrap",
        "description": "Developed a notes-focused frontend enabling create, edit, and delete operations with a responsive UI using Angular and Bootstrap. Implemented data persistence through REST APIs and a robust backend stack (Hibernate, MySQL) ensuring data integrity. Integrated secure authentication and authorization within an MVC architecture to safeguard user data. Optimized user workflows with component-driven design and reusable services for maintainability."
      },
      {
        "title": "Analytic Dashboard for Surveys",
        "link": "",
        "tech": "Angular, Tailwind CSS",
        "description": "Built an internal analytics dashboard to visualize survey data through interactive charts and tables. Implemented data-driven visualizations and filtering, enabling rapid insights, aggregation, and drill-down analysis. Engineered responsive UI with Tailwind CSS and optimized performance for real-time data updates. Collaborated with stakeholders to translate analytical requirements into actionable metrics and dashboards."
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
