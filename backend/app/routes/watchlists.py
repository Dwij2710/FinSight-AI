from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from ..db.database import get_db
from ..db.models import Watchlist, WatchlistItem
from ..schemas import WatchlistCreate, WatchlistResponse, WatchlistItemCreate, WatchlistItemResponse, ApiResponse

router = APIRouter(prefix="/api/watchlists", tags=["Watchlists Persistence"])

@router.get("", response_model=ApiResponse)
async def list_watchlists(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Watchlist).order_by(Watchlist.created_at.desc()))
    watchlists = result.scalars().all()
    data = [WatchlistResponse.model_validate(w).model_dump(mode="json") for w in watchlists]
    return ApiResponse(success=True, data=data)

@router.post("", response_model=ApiResponse)
async def create_watchlist(req: WatchlistCreate, db: AsyncSession = Depends(get_db)):
    wl = Watchlist(name=req.name.strip())
    db.add(wl)
    await db.commit()
    await db.refresh(wl)
    data = WatchlistResponse.model_validate(wl).model_dump(mode="json")
    return ApiResponse(success=True, data=data)

@router.get("/{watchlist_id}", response_model=ApiResponse)
async def get_watchlist(watchlist_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Watchlist).where(Watchlist.id == watchlist_id))
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    data = WatchlistResponse.model_validate(wl).model_dump(mode="json")
    return ApiResponse(success=True, data=data)

@router.post("/{watchlist_id}/items", response_model=ApiResponse)
async def add_watchlist_item(watchlist_id: int, req: WatchlistItemCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Watchlist).where(Watchlist.id == watchlist_id))
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")

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
async def delete_watchlist_item(watchlist_id: int, item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WatchlistItem).where(
        WatchlistItem.id == item_id,
        WatchlistItem.watchlist_id == watchlist_id
    ))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    await db.commit()
    return ApiResponse(success=True, message=f"Item {item_id} removed from watchlist.")

@router.delete("/{watchlist_id}", response_model=ApiResponse)
async def delete_watchlist(watchlist_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Watchlist).where(Watchlist.id == watchlist_id))
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    await db.delete(wl)
    await db.commit()
    return ApiResponse(success=True, message=f"Watchlist {watchlist_id} deleted.")
