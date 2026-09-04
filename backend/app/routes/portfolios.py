from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from ..db.database import get_db
from ..db.models import Portfolio, PortfolioItem
from ..schemas import PortfolioCreate, PortfolioResponse, ApiResponse

router = APIRouter(prefix="/api/portfolios", tags=["Portfolios Persistence"])

@router.get("", response_model=ApiResponse)
async def list_portfolios(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Portfolio).order_by(Portfolio.updated_at.desc()))
    portfolios = result.scalars().all()
    data = [PortfolioResponse.model_validate(p).model_dump(mode="json") for p in portfolios]
    return ApiResponse(success=True, data=data)

@router.post("", response_model=ApiResponse)
async def create_portfolio(req: PortfolioCreate, db: AsyncSession = Depends(get_db)):
    portfolio = Portfolio(
        name=req.name.strip(),
        description=req.description.strip() if req.description else None
    )
    db.add(portfolio)
    await db.flush()

    for item_in in req.items:
        item = PortfolioItem(
            portfolio_id=portfolio.id,
            ticker=item_in.ticker.strip().upper(),
            target_weight=float(item_in.target_weight),
            asset_class=item_in.asset_class or "Equity"
        )
        db.add(item)

    await db.commit()
    await db.refresh(portfolio)

    # Re-query with items loaded
    result = await db.execute(select(Portfolio).where(Portfolio.id == portfolio.id))
    saved = result.scalar_one()
    data = PortfolioResponse.model_validate(saved).model_dump(mode="json")
    return ApiResponse(success=True, data=data)

@router.get("/{portfolio_id}", response_model=ApiResponse)
async def get_portfolio(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Portfolio).where(Portfolio.id == portfolio_id))
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    data = PortfolioResponse.model_validate(portfolio).model_dump(mode="json")
    return ApiResponse(success=True, data=data)

@router.delete("/{portfolio_id}", response_model=ApiResponse)
async def delete_portfolio(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Portfolio).where(Portfolio.id == portfolio_id))
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    await db.delete(portfolio)
    await db.commit()
    return ApiResponse(success=True, message=f"Portfolio {portfolio_id} deleted successfully.")
