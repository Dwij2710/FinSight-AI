"""
FinSight AI - Watchlists Route with Multi-Tenant User Isolation
Guarantees that each user/guest only sees and manages their own watchlists.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from ..db.database import get_db
from ..db.models import Watchlist, WatchlistItem, User
from ..schemas import (
    WatchlistCreate,
    WatchlistResponse,
    WatchlistItemCreate,
    WatchlistItemResponse,
    ApiResponse
)
from .auth import get_current_user

router = APIRouter(prefix="/api/watchlists", tags=["Watchlists Persistence"])

@router.get("", response_model=ApiResponse)
async def list_watchlists(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all watchlists belonging exclusively to the authenticated user/guest."""
    result = await db.execute(
        select(Watchlist)
        .where(Watchlist.user_id == current_user.id)
        .order_by(Watchlist.created_at.desc())
    )
    watchlists = result.scalars().all()
    data = [WatchlistResponse.model_validate(w).model_dump(mode="json") for w in watchlists]
    return ApiResponse(success=True, data=data)

@router.post("", response_model=ApiResponse)
async def create_watchlist(
    req: WatchlistCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new watchlist associated strictly with the current user."""
    wl = Watchlist(
        name=req.name.strip(),
        user_id=current_user.id
    )
    db.add(wl)
    await db.commit()
    await db.refresh(wl)
    data = WatchlistResponse.model_validate(wl).model_dump(mode="json")
    return ApiResponse(success=True, data=data)

@router.get("/{watchlist_id}", response_model=ApiResponse)
async def get_watchlist(
    watchlist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve single watchlist ensuring authorization ownership."""
    result = await db.execute(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id
        )
    )
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found or access denied")
    data = WatchlistResponse.model_validate(wl).model_dump(mode="json")
    return ApiResponse(success=True, data=data)

@router.post("/{watchlist_id}/items", response_model=ApiResponse)
async def add_watchlist_item(
    watchlist_id: int,
    req: WatchlistItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a ticker item to an authorized watchlist."""
    result = await db.execute(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id
        )
    )
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found or access denied")

    item = WatchlistItem(
        watchlist_id=watchlist_id,
        ticker=req.ticker.strip().upper(),
        notes=req.notes.strip() if req.notes else None
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    data = WatchlistItemResponse.model_validate(item).model_dump(mode="json")
    return ApiResponse(success=True, data=data)

@router.delete("/{watchlist_id}/items/{item_id}", response_model=ApiResponse)
async def delete_watchlist_item(
    watchlist_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a ticker item from an authorized watchlist."""
    # Verify watchlist ownership first
    wl_result = await db.execute(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id
        )
    )
    if not wl_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Watchlist not found or access denied")

    result = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.id == item_id,
            WatchlistItem.watchlist_id == watchlist_id
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    await db.commit()
    return ApiResponse(success=True, message=f"Item {item_id} removed from watchlist.")

@router.delete("/{watchlist_id}", response_model=ApiResponse)
async def delete_watchlist(
    watchlist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a watchlist owned by the current user."""
    result = await db.execute(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id
        )
    )
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found or access denied")
    await db.delete(wl)
    await db.commit()
    return ApiResponse(success=True, message=f"Watchlist {watchlist_id} deleted.")
