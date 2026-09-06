"""
FinSight AI - Async Jobs Route
Provides polling status endpoints for asynchronous background tasks
(RL training, walk-forward backtests, quantile regression).
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from ..schemas import ApiResponse, JobResponse
from ..services.jobs import job_manager
from ..db.models import User
from .auth import get_current_user

router = APIRouter(prefix="/api/jobs", tags=["Async Jobs"])

@router.get("/{job_id}", response_model=ApiResponse)
async def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Poll the current status, progress, or completed result of a background job.
    Enforces user authorization: users can only view jobs initiated under their session.
    """
    job_data = await job_manager.get_job(job_id, requesting_user_id=current_user.id)
    if not job_data:
        raise HTTPException(
            status_code=404,
            detail=f"Job '{job_id}' not found or you do not have permission to view it."
        )

    return ApiResponse(
        success=True,
        data=job_data
    )
