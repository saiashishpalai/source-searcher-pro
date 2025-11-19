import os
from openai import OpenAI
from models.extraction import MeetingInsights
import json

class ExtractionService:
    def __init__(self):
        api_key = os.environ.get("OPENAI_API_KEY")
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4o"

    async def extract_insights(self, transcript_text: str) -> MeetingInsights:
        """
        Extracts structured insights from the transcript using OpenAI Structured Outputs.
        """
        
        system_prompt = """
        You are an expert Project Manager AI. Analyze the following meeting transcript.
        Extract key insights: Summary, Action Items, Decisions, Blockers, and Risks.
        
        Rules:
        - Be precise and concise.
        - Only extract explicitly stated items.
        - For Action Items, try to identify the assignee.
        - For Decisions, capture the final agreement.
        """
        
        completion = self.client.beta.chat.completions.parse(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": transcript_text},
            ],
            response_format=MeetingInsights,
        )
        
        return completion.choices[0].message.parsed
