from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.text_generation import generate_text_from_prompt
import json

practice = APIRouter(prefix="/practice", tags=["practice"])

# Store interview contexts per user (in-memory for now)
user_contexts = {}

# Request body schema
class PracticeRequest(BaseModel):
    user_id: str
    prompt: str | None = None
    job_description: str | None = None
    practice: str = "continue"  # "start", "continue", "end"


@practice.post("/practice-question")
async def practice_question(req: PracticeRequest):
    user_id = req.user_id
    prompt = req.prompt
    job_description = req.job_description
    practice = req.practice

    # --- Start a new interview ---
    if practice == "start":
        if not job_description:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "job_description is required to start."},
            )

        user_contexts[user_id] = {
            "job": job_description,
            "history": []  
        }

        initial_prompt = (
                f"You are Anna, a interviewer hiring for this job: {job_description}. "
                "you talk cutely and flirty to the candidate."
                "Start with a very basic question related to the role. "
                "Only ask one question at a time. "
                "Adjust your question based on the user's answer."
            )


        ai_response = await generate_text_from_prompt(
            prompt=initial_prompt,
            model="openai",
            system="You are a technical interviewer.",
            stream=False,
        )

        user_contexts[user_id]["history"].append({"role": "assistant", "content": ai_response})
        return JSONResponse(content={"success": True, "data": {"response": ai_response}})

    # --- End interview ---
    if practice == "end":
        if user_id not in user_contexts:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "No active interview to end."},
            )

        # Build history text for evaluation
        history_text = ""
        for msg in user_contexts[user_id]["history"]:
            role = msg["role"].capitalize()
            history_text += f"{role}: {msg['content']}\n"

        end_prompt = (
            f"You are an interviewer hiring for this job: {user_contexts[user_id]['job']}.\n"
            "Here is the interview conversation:\n\n"
            f"{history_text}\n\n"
            "Now give your final evaluation ONLY in JSON with keys:\n"
            "- rating (1-10)\n"
            "- score (0-100)\n"
            "- feedback (string)\n"
            "- pass (string: pass/fail)\n\n"
            "The evaluation should reflect the candidate's actual answers, "
            "for example if they often said 'I don't know', reduce the rating/score accordingly."
        )

        ai_response = await generate_text_from_prompt(
            prompt=end_prompt,
            model="openai",
            system="You are a strict but fair technical interviewer.",
            stream=False,
        )

        # Parse JSON safely
        try:
            parsed_response = json.loads(ai_response)
        except Exception:
            parsed_response = {"raw": ai_response}

        user_contexts.pop(user_id, None)
        return JSONResponse(content={"status": 200, "message": "success", "data": parsed_response})
    # --- Continue interview ---
    if user_id not in user_contexts:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "No active interview. Please start first."},
        )

    if not prompt:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Prompt (answer) is required to continue."},
        )

    # Save user answer
    user_contexts[user_id]["history"].append({"role": "user", "content": prompt})

    conversation_text = (
        f"You are an interviewer hiring for this job: {user_contexts[user_id]['job']}.\n"
        "Continue the interview step by step. Do not overwhelm the candidate. "
        "Ask only the next logical question based on their last answer.\n\n"
    )

    for msg in user_contexts[user_id]["history"]:
        role = msg["role"].capitalize()
        conversation_text += f"{role}: {msg['content']}\n"

    conversation_text += "Interviewer:"

    ai_response = await generate_text_from_prompt(
        prompt=conversation_text,
        model="openai",
        system="You are a technical interviewer.",
        stream=False,
    )

    user_contexts[user_id]["history"].append({"role": "assistant", "content": ai_response})

    return JSONResponse(content={"success": True, "data": {"response": ai_response}})
