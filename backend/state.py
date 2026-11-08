from __future__ import annotations
from typing import Annotated, Any, Dict, List, Literal, Optional, TypedDict
from pydantic import BaseModel, Field

AgentId = Literal["planner", "research", "coder", "qa", "reviewer", "security", "devops", "debugger", "reporter"]
AgentStatus = Literal["idle", "thinking", "working", "done"]
Phase = Literal["idle", "planning", "approval", "execution", "qa", "review", "hardening", "report", "complete", "aborted"]
LineKind = Literal["sys", "info", "data", "code", "good", "warn"]

def merge_lists(left: Optional[list], right: Optional[list]) -> list:
    return (left or []) + (right or [])

class SubtaskDict(TypedDict):
    id: str
    text: str
    owner: AgentId
    tools: List[str]

class MemoryEntryDict(TypedDict):
    id: str
    key: str
    value: str
    author: AgentId
    persisted: bool

class ToolCallDict(TypedDict):
    id: str
    agent: AgentId
    tool: str
    arg: str
    result: str
    ms: int
    ok: bool
    at: int

class SwarmState(TypedDict, total=False):
    run_id: str
    task: str
    domain: str
    operator: str
    origin: Literal["manual", "schedule"]
    live_web: bool
    auto_approve: bool
    plan_subtasks: List[SubtaskDict]
    inference_model: str
    human_approved: bool
    revision_notes: str
    research_stack: List[str]
    research_metrics: Dict[str, Any]
    research_live_sources: List[Dict[str, str]]
    code_artifact: str
    code_tests: str
    code_dependencies: List[str]
    qa_coverage: float
    qa_passed: bool
    qa_edge_cases: List[str]
    qa_stderr: str
    review_score: int
    review_flags: List[str]
    patch_iterations: int
    security_verdict: str
    security_findings: List[Dict[str, Any]]
    deploy_contract: Dict[str, str]
    github_pr_url: Optional[str]
    debug_fixes: List[str]
    debug_retries: int
    report_md: str
    memory_entries: Annotated[List[MemoryEntryDict], merge_lists]
    tool_calls: Annotated[List[ToolCallDict], merge_lists]
    sse_events: Annotated[List[Dict[str, Any]], merge_lists]

class PlannedSubtaskModel(BaseModel):
    id: str = Field(description="Short subtask identifier such as ST-1")
    text: str = Field(description="Actionable description of the subtask")
    owner: AgentId = Field(description="Specialist agent responsible for this subtask")
    tools: List[str] = Field(default_factory=list)

class PlannerOutput(BaseModel):
    domain: str
    subtasks: List[PlannedSubtaskModel]

class ResearchOutput(BaseModel):
    stack: List[str]
    metrics: Dict[str, Any]
    sources: List[Dict[str, str]] = Field(default_factory=list)

class CoderOutput(BaseModel):
    code_artifact: str
    code_tests: str
    dependencies: List[str] = Field(default_factory=list)

class DebuggerOutput(BaseModel):
    fixed_code_artifact: str
    fixed_code_tests: str
    fix_summary: str

class ReviewOutput(BaseModel):
    review_score: int = Field(ge=0, le=100)
    review_flags: List[str] = Field(default_factory=list)
