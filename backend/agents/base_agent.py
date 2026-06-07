import asyncio
from enum import Enum
from dataclasses import dataclass
from typing import Any, Optional
from abc import ABC, abstractmethod

class AgentStatus(Enum):
    NOT_STARTED = "NOT_STARTED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

@dataclass
class AgentResult:
    name: str
    status: AgentStatus
    duration_sec: float
    error: Optional[str] = None
    data: Optional[Any] = None

class BaseAgent(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    async def run(self, url: str) -> AgentResult:
        """Execute the agent's main task."""
        pass
