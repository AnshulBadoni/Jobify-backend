import httpx
import asyncio
import json
from utils.github import fetch_profile_data
from services.text_generation import generate_text_from_prompt

async def generate_profile_data(usernames: str) -> dict:
    """Core function to fetch and summarize GitHub profiles, returns plain dict"""
    username_list = [u.strip() for u in usernames.split(",") if u.strip()]
    async with httpx.AsyncClient() as client:
        tasks = [fetch_profile_data(client, username) for username in username_list]
        results = await asyncio.gather(*tasks)

    # Build overall summary
    combined_info = ""
    for res in results:
        if "github_profile" in res:
            profile = res["github_profile"]
            combined_info += f"{profile['name'] or profile['username']} has {res['repos_count']} repos, {res['total_stars']} stars, {res['total_forks']} forks, top languages: {', '.join(res['top_languages'])}\n"

    overall_prompt = f"""
    Please review the following GitHub profiles and provide a concise, HR-friendly summary that includes:

    1. **Overall Summary**: A brief overview of the candidate's skills, experience, and strengths as reflected in their GitHub activity.
    2. **Rating**: A rating out of 5 based on the quality, consistency, and relevance of their projects.
    3. **Tips for Improvement**: Constructive suggestions to enhance their profile or skills.
    4. **Top Languages**: The programming languages the candidate uses most frequently.

    Format the output clearly so that HR can quickly understand the candidate's technical profile and potential.

    {combined_info}

    Output JSON:
    {{
        "overall_summary": "...",
        "overall_rating": 4.5,
        "overall_tips": ["Tip 1", "Tip 2"],
        "top_languages": ["Lang1", "Lang2"]
    }}
    """

    try:
        overall_ai_response = await generate_text_from_prompt(
            prompt=overall_prompt,
            model="openai",
            system="You are a career profiler AI",
            stream=False,
        )
        try:
            overall_summary_data = json.loads(overall_ai_response) if isinstance(overall_ai_response, str) else overall_ai_response
        except:
            overall_summary_data = {"overall_summary": overall_ai_response, "overall_rating": None}
    except Exception as e:
        overall_summary_data = {"error": str(e)}

    return {
        "status": "success",
        "message": "Profiles processed",
        "data": results,
        "overall_summary": overall_summary_data,
    }
