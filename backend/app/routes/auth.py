"""
FinSight AI - Authentication & Session Management Routes
Provides secure guest session generation, registration, login, logout,
and the get_current_user dependency enforcing backend tenant isolation.
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..db.database import get_db
from ..db.models import User, Session
from ..schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    SessionResponse,
    ApiResponse
)
from ..utils.security import (
    hash_password,
    verify_password,
    generate_session_token,
    generate_uuid
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

SESSION_TTL_DAYS = 30

async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    FastAPI dependency to extract and authenticate the current user.
    If a valid Bearer token is supplied, returns the associated user.
    If no token is supplied, automatically creates and returns an anonymous guest user.
    If an invalid or expired token is supplied, raises HTTP 401.
    """
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1].strip()
            now = datetime.utcnow()
            
            # Query session matching token
            query = select(Session).where(
                Session.session_token == token,
                Session.expires_at > now
            )
            res = await db.execute(query)
            session_obj = res.scalar_one_or_none()

            if session_obj:
                user_res = await db.execute(select(User).where(User.id == session_obj.user_id))
                user = user_res.scalar_one_or_none()
                if user:
                    return user

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token. Please log in again or refresh guest session."
            )

    # Automatic guest user creation if no token provided
    guest_user = User(
        id=generate_uuid(),
        is_guest=True,
        email=None,
        hashed_password=None
    )
    db.add(guest_user)
    await db.flush()

    guest_session = Session(
        id=generate_uuid(),
        user_id=guest_user.id,
        session_token=generate_session_token(),
        expires_at=datetime.utcnow() + timedelta(days=SESSION_TTL_DAYS)
    )
    db.add(guest_session)
    await db.commit()
    await db.refresh(guest_user)
    return guest_user

@router.post("/guest", response_model=ApiResponse)
async def create_guest_session(db: AsyncSession = Depends(get_db)):
    """
    Explicitly creates a new anonymous guest user and returns session credentials.
    Guarantees tenant isolation for unauthenticated users.
    """
    guest_user = User(
        id=generate_uuid(),
        is_guest=True,
        email=None,
        hashed_password=None
    )
    db.add(guest_user)
    await db.flush()

    token = generate_session_token()
    expires_at = datetime.utcnow() + timedelta(days=SESSION_TTL_DAYS)
    session_obj = Session(
        id=generate_uuid(),
        user_id=guest_user.id,
        session_token=token,
        expires_at=expires_at
    )
    db.add(session_obj)
    await db.commit()

    return ApiResponse(
        success=True,
        message="Anonymous guest session initialized successfully.",
        data=SessionResponse(
            session_token=token,
            user_id=guest_user.id,
            is_guest=True,
            email=None,
            expires_at=expires_at
        ).model_dump(mode="json")
    )

@router.post("/register", response_model=ApiResponse)
async def register(
    req: UserRegisterRequest,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user with email and password.
    If called with an existing guest session, upgrades that guest user in-place,
    preserving all existing watchlists, portfolios, and paper trading state.
    """
    clean_email = req.email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")

    # Check if email is already taken
    existing_query = select(User).where(User.email == clean_email)
    res = await db.execute(existing_query)
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{clean_email}' already exists. Please log in."
        )

    # Check if existing session can be upgraded
    target_user: Optional[User] = None
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            tok = parts[1].strip()
            s_query = select(Session).where(
                Session.session_token == tok,
                Session.expires_at > datetime.utcnow()
            )
            s_res = await db.execute(s_query)
            sess = s_res.scalar_one_or_none()
            if sess and sess.user and sess.user.is_guest:
                target_user = sess.user

    hashed = hash_password(req.password)
    now = datetime.utcnow()

    if target_user:
        # Upgrade guest user in-place
        target_user.email = clean_email
        target_user.hashed_password = hashed
        target_user.is_guest = False
        target_user.updated_at = now
    else:
        # Create fresh registered user
        target_user = User(
            id=generate_uuid(),
            email=clean_email,
            hashed_password=hashed,
            is_guest=False,
            created_at=now,
            updated_at=now
        )
        db.add(target_user)
        await db.flush()

    # Issue session
    token = generate_session_token()
    expires_at = now + timedelta(days=SESSION_TTL_DAYS)
    new_session = Session(
        id=generate_uuid(),
        user_id=target_user.id,
        session_token=token,
        expires_at=expires_at
    )
    db.add(new_session)
    await db.commit()

    return ApiResponse(
        success=True,
        message="Account registered successfully.",
        data=SessionResponse(
            session_token=token,
            user_id=target_user.id,
            is_guest=False,
            email=target_user.email,
            expires_at=expires_at
        ).model_dump(mode="json")
    )

@router.post("/login", response_model=ApiResponse)
async def login(req: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate with email and password.
    Returns a 30-day session token.
    """
    clean_email = req.email.strip().lower()
    query = select(User).where(User.email == clean_email)
    res = await db.execute(query)
    user = res.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    now = datetime.utcnow()
    token = generate_session_token()
    expires_at = now + timedelta(days=SESSION_TTL_DAYS)
    new_session = Session(
        id=generate_uuid(),
        user_id=user.id,
        session_token=token,
        expires_at=expires_at
    )
    db.add(new_session)
    await db.commit()

    return ApiResponse(
        success=True,
        message="Login successful.",
        data=SessionResponse(
            session_token=token,
            user_id=user.id,
            is_guest=user.is_guest,
            email=user.email,
            expires_at=expires_at
        ).model_dump(mode="json")
    )

@router.get("/me", response_model=ApiResponse)
async def get_current_user_profile(user: User = Depends(get_current_user)):
    """Returns the profile and status of the currently authenticated user."""
    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(user).model_dump(mode="json")
    )

@router.post("/logout", response_model=ApiResponse)
async def logout(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """Invalidates the active session token."""
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            tok = parts[1].strip()
            query = select(Session).where(Session.session_token == tok)
            res = await db.execute(query)
            sess = res.scalar_one_or_none()
            if sess:
                await db.delete(sess)
                await db.commit()
    return ApiResponse(success=True, message="Successfully logged out.")
