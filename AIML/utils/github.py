import httpx
import json
from services.text_generation import generate_text_from_prompt

GITHUB_API_URL = "https://api.github.com/users/"

async def fetch_profile_data(client: httpx.AsyncClient, username: str):
    """Fetch GitHub profile + repos for one user"""
    try:
        profile_resp = await client.get(f"{GITHUB_API_URL}{username}")
        if profile_resp.status_code != 200:
            return {"username": username, "error": "GitHub user not found"}

        profile_data = profile_resp.json()

        repos_resp = await client.get(f"{GITHUB_API_URL}{username}/repos?per_page=100")
        if repos_resp.status_code != 200:
            return {"username": username, "error": "Repos not found"}

        repos_data = repos_resp.json()

        # Aggregate stats
        total_stars = sum(repo["stargazers_count"] for repo in repos_data)
        total_forks = sum(repo["forks_count"] for repo in repos_data)
        languages = [repo["language"] for repo in repos_data if repo["language"]]
        top_languages = list(set(languages))[:5]
        num_repos = len(repos_data)

        # Build AI prompt
        prompt = f"""
        Create a professional summary for a software developer based on the following GitHub data:

        - Name: {profile_data.get('name') or profile_data.get('login')}
        - Bio: {profile_data.get('bio') or 'N/A'}
        - Location: {profile_data.get('location') or 'N/A'}
        - Public Repositories: {num_repos}
        - Total Stars: {total_stars}
        - Total Forks: {total_forks}
        - Top Languages: {', '.join(top_languages) if top_languages else 'N/A'}
        - Repo activity: Frequent commits in the last year (based on public activity)

        Output JSON:
        {{
          "summary": "...",
          "rating": 4.5,
          "tips": ["Tip 1", "Tip 2"]
        }}
        """

        ai_response = await generate_text_from_prompt(
            prompt=prompt,
            model="openai",
            system="You are a career profiler AI",
            stream=False,
        )

        try:
            summary_data = json.loads(ai_response) if isinstance(ai_response, str) else ai_response
        except:
            summary_data = {"summary": ai_response, "rating": None}

        return {
            "username": username,
            "github_profile": {
                "username": profile_data.get("login"),
                "name": profile_data.get("name"),
                "avatar_url": profile_data.get("avatar_url"),
                "bio": profile_data.get("bio"),
                "location": profile_data.get("location"),
                "blog": profile_data.get("blog"),
                "followers": profile_data.get("followers"),
                "following": profile_data.get("following"),
                "public_repos_count": profile_data.get("public_repos"),
            },
            "repos_count": num_repos,
            "total_stars": total_stars,
            "total_forks": total_forks,
            "top_languages": top_languages,
            "summary_data": summary_data,
        }

    except Exception as e:
        return {"username": username, "error": str(e)}
