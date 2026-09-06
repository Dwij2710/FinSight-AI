"""
FinSight AI - Asynchronous Job Manager
Provides reliable, non-blocking background execution for long-running quantitative
workloads (RL agent training, walk-forward backtests, multi-factor quantile fitting).
Enforces:
- Formal state lifecycle: QUEUED -> RUNNING -> COMPLETED / FAILED
- Bounded concurrency to prevent CPU/memory exhaustion
- Dual in-memory + database persistence
- User ownership and authorization
- Clean progress tracking and thread-safe error capture
"""
import asyncio
import json
import logging
import traceback
from datetime import datetime, timedelta
from typing import Callable, Any, Optional, Dict
from sqlalchemy import select, delete

from ..db.database import async_session_factory
from ..db.models import Job
from ..utils.security import generate_uuid
from ..utils.serializer import sanitize_for_json

logger = logging.getLogger("finsight.jobs")

class JobManager:
    _instance: Optional['JobManager'] = None

    def __init__(self, max_concurrent_workers: int = 2):
        self.max_workers = max_concurrent_workers
        self._queue: asyncio.Queue = asyncio.Queue()
        self._workers: list[asyncio.Task] = []
        self._active_cache: Dict[str, Dict[str, Any]] = {}
        self._is_running = False
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    @classmethod
    def get_instance(cls) -> 'JobManager':
        if cls._instance is None:
            cls._instance = JobManager()
        return cls._instance

    async def start(self):
        """Start worker pool on FastAPI application lifespan startup."""
        if self._is_running:
            return
        self._is_running = True
        self._loop = asyncio.get_running_loop()
        for i in range(self.max_workers):
            task = asyncio.create_task(self._worker_loop(i), name=f"JobWorker-{i}")
            self._workers.append(task)
        logger.info(f"[JobManager] Initialized with {self.max_workers} background workers.")

    async def shutdown(self):
        """Gracefully stop worker pool."""
        self._is_running = False
        for worker in self._workers:
            worker.cancel()
        await asyncio.gather(*self._workers, return_exceptions=True)
        self._workers.clear()
        logger.info("[JobManager] Worker pool shut down gracefully.")

    async def submit_job(
        self,
        job_type: str,
        user_id: str,
        target_func: Callable,
        input_params: Optional[Dict[str, Any]] = None,
        *args,
        **kwargs
    ) -> str:
        """
        Submits a long-running callable for asynchronous execution.
        Returns job_id immediately with HTTP 202 semantics.
        """
        job_id = generate_uuid()
        now = datetime.utcnow()

        params_json = json.dumps(sanitize_for_json(input_params)) if input_params else None

        # 1. Initialize In-Memory Cache for fast polling
        job_data = {
            "job_id": job_id,
            "user_id": user_id,
            "job_type": job_type,
            "status": "QUEUED",
            "progress": 0.0,
            "created_at": now,
            "started_at": None,
            "completed_at": None,
            "result": None,
            "error": None
        }
        self._active_cache[job_id] = job_data

        # 2. Persist QUEUED state to Database
        try:
            async with async_session_factory() as session:
                job_record = Job(
                    id=job_id,
                    user_id=user_id,
                    job_type=job_type,
                    status="QUEUED",
                    progress=0.0,
                    created_at=now,
                    input_params_json=params_json
                )
                session.add(job_record)
                await session.commit()
        except Exception as e:
            logger.warning(f"[JobManager] Failed to persist initial job {job_id} to DB: {e}")

        # 3. Push job package to async queue
        payload = {
            "job_id": job_id,
            "user_id": user_id,
            "job_type": job_type,
            "target_func": target_func,
            "args": args,
            "kwargs": kwargs
        }
        await self._queue.put(payload)
        logger.info(f"[JobManager] Enqueued job {job_id} ({job_type}) for user {user_id}")
        return job_id

    async def _worker_loop(self, worker_id: int):
        """Worker loop continuously popping jobs from the bounded queue."""
        main_loop = asyncio.get_running_loop()
        while self._is_running:
            try:
                job_pkg = await self._queue.get()
            except asyncio.CancelledError:
                break

            job_id = job_pkg["job_id"]
            user_id = job_pkg["user_id"]
            job_type = job_pkg["job_type"]
            target_func = job_pkg["target_func"]
            args = job_pkg["args"]
            kwargs = job_pkg["kwargs"]

            started_at = datetime.utcnow()
            logger.info(f"[JobManager-Worker-{worker_id}] Starting job {job_id} ({job_type})")

            # Update state to RUNNING
            self._update_job_state(job_id, status="RUNNING", started_at=started_at, progress=0.05)
            await self._persist_job_state(job_id, status="RUNNING", started_at=started_at, progress=0.05)

            def progress_callback(pct: float):
                """Thread-safe callback injected into jobs allowing periodic progress reporting."""
                clamped = max(0.0, min(0.99, float(pct)))
                self._update_job_state(job_id, progress=clamped)
                try:
                    cur_loop = asyncio.get_running_loop()
                    cur_loop.create_task(self._persist_job_state(job_id, progress=clamped))
                except RuntimeError:
                    # Called from threadpool
                    if main_loop and main_loop.is_running():
                        asyncio.run_coroutine_threadsafe(
                            self._persist_job_state(job_id, progress=clamped),
                            main_loop
                        )

            # Execute callable
            try:
                kwargs["progress_callback"] = progress_callback
                if asyncio.iscoroutinefunction(target_func):
                    result = await target_func(*args, **kwargs)
                else:
                    # Run CPU-bound sync functions in default executor thread
                    result = await main_loop.run_in_executor(None, lambda: target_func(*args, **kwargs))

                completed_at = datetime.utcnow()
                sanitized_result = sanitize_for_json(result)

                self._update_job_state(
                    job_id,
                    status="COMPLETED",
                    completed_at=completed_at,
                    progress=1.0,
                    result=sanitized_result
                )
                await self._persist_job_state(
                    job_id,
                    status="COMPLETED",
                    completed_at=completed_at,
                    progress=1.0,
                    result_json=json.dumps(sanitized_result)
                )
                logger.info(f"[JobManager-Worker-{worker_id}] Successfully finished job {job_id}")

            except Exception as e:
                completed_at = datetime.utcnow()
                err_msg = str(e)
                tb = traceback.format_exc()
                logger.error(f"[JobManager-Worker-{worker_id}] Job {job_id} failed: {err_msg}\n{tb}")

                self._update_job_state(
                    job_id,
                    status="FAILED",
                    completed_at=completed_at,
                    error=err_msg
                )
                await self._persist_job_state(
                    job_id,
                    status="FAILED",
                    completed_at=completed_at,
                    error_message=err_msg
                )
            finally:
                self._queue.task_done()

    def _update_job_state(self, job_id: str, **fields):
        """Updates in-memory cache synchronously."""
        if job_id in self._active_cache:
            self._active_cache[job_id].update(fields)

    async def _persist_job_state(self, job_id: str, **fields):
        """Persists updated job status, progress, or result to DB."""
        try:
            async with async_session_factory() as session:
                res = await session.execute(select(Job).where(Job.id == job_id))
                record = res.scalar_one_or_none()
                if record:
                    for k, v in fields.items():
                        if hasattr(record, k):
                            setattr(record, k, v)
                    await session.commit()
        except Exception as err:
            logger.debug(f"[JobManager] DB update error for {job_id}: {err}")

    async def get_job(self, job_id: str, requesting_user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Retrieves job status, progress, and result.
        Enforces tenant authorization: users can only inspect jobs they own.
        """
        # 1. Check in-memory cache first
        data = self._active_cache.get(job_id)
        if data:
            if requesting_user_id and data.get("user_id") and data.get("user_id") != requesting_user_id:
                return None  # Access denied
            return self._format_job_dict(data)

        # 2. Check DB
        try:
            async with async_session_factory() as session:
                query = select(Job).where(Job.id == job_id)
                if requesting_user_id:
                    query = query.where(Job.user_id == requesting_user_id)
                res = await session.execute(query)
                rec = res.scalar_one_or_none()
                if rec:
                    result_data = json.loads(rec.result_json) if rec.result_json else None
                    formatted = {
                        "job_id": rec.id,
                        "user_id": rec.user_id,
                        "job_type": rec.job_type,
                        "status": rec.status,
                        "progress": rec.progress,
                        "created_at": rec.created_at,
                        "started_at": rec.started_at,
                        "completed_at": rec.completed_at,
                        "result": result_data,
                        "error": rec.error_message
                    }
                    self._active_cache[rec.id] = formatted
                    return self._format_job_dict(formatted)
        except Exception as e:
            logger.warning(f"[JobManager] Error fetching job {job_id} from DB: {e}")

        return None

    def _format_job_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculates execution duration and formats for API response."""
        duration = None
        started = data.get("started_at")
        completed = data.get("completed_at")
        if started and completed:
            duration = round((completed - started).total_seconds(), 2)
        elif started:
            duration = round((datetime.utcnow() - started).total_seconds(), 2)

        return {
            "job_id": data["job_id"],
            "job_type": data["job_type"],
            "status": data["status"],
            "progress": round(data.get("progress", 0.0), 2),
            "created_at": data["created_at"],
            "started_at": data.get("started_at"),
            "completed_at": data.get("completed_at"),
            "duration_seconds": duration,
            "result": data.get("result"),
            "error": data.get("error")
        }

    async def cleanup_expired_jobs(self, max_age_hours: int = 24):
        """Purge jobs older than max_age_hours."""
        cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)
        # Purge cache
        expired_ids = [
            jid for jid, d in self._active_cache.items()
            if d.get("created_at") and d["created_at"] < cutoff
        ]
        for jid in expired_ids:
            self._active_cache.pop(jid, None)

        # Purge DB
        try:
            async with async_session_factory() as session:
                await session.execute(delete(Job).where(Job.created_at < cutoff))
                await session.commit()
                logger.info(f"[JobManager] Purged expired jobs older than {max_age_hours}h")
        except Exception as e:
            logger.warning(f"[JobManager] Cleanup error: {e}")

job_manager = JobManager.get_instance()
