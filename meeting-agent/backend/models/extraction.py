from pydantic import BaseModel, Field
from typing import List, Optional

class ActionItem(BaseModel):
    description: str = Field(..., description="The action to be taken")
    assignee: Optional[str] = Field(None, description="Name of the person assigned, if any")
    due_date: Optional[str] = Field(None, description="Due date if mentioned")

class Decision(BaseModel):
    text: str = Field(..., description="The decision made")
    context: Optional[str] = Field(None, description="Context or reason for the decision")

class Blocker(BaseModel):
    text: str = Field(..., description="Description of the blocker")

class Risk(BaseModel):
    text: str = Field(..., description="Description of the risk")
    severity: str = Field("medium", description="low, medium, or high")

class MeetingInsights(BaseModel):
    summary: str = Field(..., description="Concise summary of the meeting")
    action_items: List[ActionItem] = Field(default_factory=list)
    decisions: List[Decision] = Field(default_factory=list)
    blockers: List[Blocker] = Field(default_factory=list)
    risks: List[Risk] = Field(default_factory=list)
