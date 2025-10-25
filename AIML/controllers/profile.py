from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF
import docx
import io
import json
from services.profile import generate_profile_data
from services.text_generation import generate_text_from_prompt

profile = APIRouter(prefix="/profile", tags=["profile"])

@profile.get("/generate-profile")
async def generate_profile(usernames: str = Query(..., description="Comma-separated GitHub usernames")):
    data = await generate_profile_data(usernames)
    return JSONResponse(content=data)

@profile.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """Upload and parse resume (PDF/DOCX)"""
    try:
        contents = await file.read()
        text = ""

        if file.filename.endswith(".pdf"):
            pdf_doc = fitz.open(stream=contents, filetype="pdf")
            text = " ".join(page.get_text() for page in pdf_doc)
        elif file.filename.endswith(".docx"):
            doc = docx.Document(io.BytesIO(contents))
            text = " ".join([para.text for para in doc.paragraphs])
        else:
            raise HTTPException(status_code=400, detail="Only PDF/DOCX supported")

        return {"status":200,"message": "success", "extracted_text": text}  # preview first 1000 chars

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@profile.post("/update-resume")
async def update_resume(existing_resume: str = Form(...), new_details: str = Form(...)):
    """
    Update resume with new details (merging AI).
    existing_resume = extracted text from old resume
    new_details = e.g., GitHub summary, new job experience
    """
    prompt = f"""
Update the following resume with the new details provided.

Resume (existing):
{existing_resume}

New Details (to update/add):
{new_details}

Instructions:
1. Ensure correct grammar and professional tone.
2. Keep structure clear, consistent, and ATS-friendly (no random uppercase/lowercase).
3. Rewrite content to be concise, professional, and achievement-focused.
4. Ensure sections are well-structured and formatted for readability.

Output a structured JSON format resume with the following schema:
{{
    "name": "Full Name",
    "contact": "Email | Phone | LinkedIn | GitHub | Portfolio", (make them in hyper-link and if they exist else remove them)
    "summary": "Professional summary paragraph",
    "skills": [
        {{category:"Programming Languages",items: ["C", "C++", "Java", ...]}},
        {{category:"Frameworks / Libraries", items: ["React.js", "Next.js", ...]}},
        {{category:"Tools / Platforms", items : ["AWS", "Docker", ...]}},
        {{category:"Databases", items: ["MongoDB", "PostgreSQL", ...]}}
    ],
    "experience": [
        {{
            "title": "Job Title",
            "company": "Company Name",
            "location": "City",
            "period": "Start - End",
            "details": [
                "Responsibility/achievement 1",
                "Responsibility/achievement 2"
            ]
        }}
    ],
    "education": [
        {{
            "institution": "University Name",
            "location": "City",
            "degree": "Degree",
            "period": "YYYY - YYYY"
        }}
    ],
    "projects": [
        {{
            "title": "Project Title",
            "link": "URL (if available)",
            "tech": "Tech stack used",
            "description": "Short professional description"
        }}
    ]
}}
"""


    ai_response = await generate_text_from_prompt(
        prompt=prompt,
        model="openai",
        system="You are a professional resume builder AI",
        stream=False
    )

    try:
        resume_data = json.loads(ai_response) if isinstance(ai_response, str) else ai_response
    except:
        resume_data = {"resume": ai_response}

    return {"status": "success", "updated_resume": resume_data}

@profile.post("/generate-resume")
async def generate_resume(name: str = Form(...), skills: str = Form(...), summary: str = Form(...)):
    """Generate resume from scratch using AI"""
    prompt = f"""
    Create a professional software developer resume.

    Name: {name}
    Skills: {skills}
    Summary: {summary}

    Output structured JSON:
    {{
        "name": "{name}",
        "summary": "...",
        "skills": ["categorize skills here in json array"],
        "experience": [...],
        "projects": [...],
        "education": [...]
    }}

        """

    ai_response = await generate_text_from_prompt(
        prompt=prompt,
        model="openai",
        system="You are a professional resume builder AI",
        stream=False
    )

    try:
        resume_data = json.loads(ai_response) if isinstance(ai_response, str) else ai_response
    except:
        resume_data = {"resume": ai_response}

    return {"status": "success", "resume": resume_data}