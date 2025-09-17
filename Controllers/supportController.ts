import { Request, Response } from "express";
import prisma from "../Connection/prisma";
import { setResponse } from "../DTO";
import { resolveToken } from "../utils";

export const supportMessage = async (req: Request, res: Response) => {
    try {
        const { message } = req.body;

        const prompt = `you are a helpful assitant for Hirely app
        🚀 Hirely — Smarter Job Hunting, Faster Growth
        Hirely isn’t just another job board. It’s a career growth platform where your resume, projects, and coding profiles work for you. Upload once, and Hirely analyzes, rates, and matches you with the most relevant opportunities — saving you time and unlocking jobs you’re actually qualified for.

        🔑 Core Value

        Instant Career Snapshot – Resume + GitHub + HackerRank analysis → your strengths and weaknesses summarized.

        Smarter Matching – AI-powered job matching based on your actual skills, not just keywords.

        Guided Growth – Insights on what you need to improve to land your dream job.

        ⚡ Key Features (Updated)
        📊 1. Career Dashboard

        Snapshot of your resume rating and skill profile.

        Quick view: active applications, saved jobs, skill gaps.

        Beautiful glassmorphic widgets with focus on clarity.

        📝 2. Resume & Profile Analysis

        Upload your resume → instant breakdown of strengths, weak spots, missing keywords.

        Connect GitHub / HackerRank → Hirely scores your coding activity, consistency, and skill depth.

        Personal Career Rating (0–100): a single score showing how ready you are for jobs.

        🎯 3. Smart Job Recommendations

        Personalized job feed based on your rating and skills.

        Filter jobs by: match score, company size, remote/onsite, tech stack.

        Prioritized matches → jobs where you’re the top candidate.

        📜 4. Application Tracker

        One-click apply directly from Hirely (when supported).

        Or log external applications.

        Status pipeline: Pending → Interview → Offer / Rejected → Hired.

        Timeline of your job journey with visual progress.

        📂 5. Activity Feed

        Scrollable LinkedIn-style feed of your job activity.

        Updates: recruiter viewed your profile, interview scheduled, recommendation boost.

        Cards are minimal, consistent, and actionable (withdraw, save, follow-up).

        🏢 6. Company Profiles

        Rich employer pages: culture highlights, team media, open roles.

        Masonry-style media gallery (office pics, events, team testimonials).

        Matches shown → how your profile aligns with that company’s roles.

        🌱 7. Growth Insights

        Skill gap analysis (based on your resume + coding profile).

        “You’re missing React Native experience for 20% of mobile jobs.”

        Actionable recommendations (courses, projects, certifications).

        🧩 How Hirely Works (User Flow)

        Sign Up → Upload resume + link GitHub/HackerRank.

        Profile Analysis → Instant summary + career rating.

        Dashboard → See your matches, skill gaps, and recommended jobs.

        Apply & Track → Apply to jobs and manage your application timeline.

        Grow → Improve skills based on insights and unlock higher-rated opportunities.

        💡 Why Hirely Wins

        Job boards = keyword search → low accuracy.

        Hirely = deep profile + coding analysis → high-precision matches.

        ATS-style resume scoring → feedback you normally never get from recruiters.

        Unified growth + job platform → it’s both a job finder and a career coach.

      the [user] has asked this question: ${message}
      Please provide a short and accurate answer to the user's question.`;

        const chatResponse: any = await fetch("https://apifreellm.com/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-2-70b-uncensored",
                message: prompt,
            }),
        });
        const answerJson = await chatResponse.json();
        console.log(answerJson, "answerJson", message);

        res.status(200).send(setResponse(res.statusCode, "Message sent successfully", answerJson));
    } catch (error) {
        console.error("Error saving message:", error);
        res.status(500).send(setResponse(500, "Internal Server Error", []));
    }
};

export const textCompletion = async (req: Request, res: Response) => {
    try {
        const { message } = req.body;

        const prompt = `complete the text based on the prompt: ${message}`;

        const chatResponse: any = await fetch("https://apifreellm.com/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-2-70b-uncensored",
                message: prompt,
            }),
        });
        const answerJson = await chatResponse.json();
        console.log(answerJson, "answerJson", message);

        res.status(200).send(setResponse(res.statusCode, "Message sent successfully", answerJson));
    } catch (error) {
        console.error("Error saving message:", error);
        res.status(500).send(setResponse(500, "Internal Server Error", []));
    }
};
