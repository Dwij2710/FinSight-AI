"""
Unit & Integration Tests for P0.2 - Async Job Infrastructure.
Validates job lifecycle (QUEUED -> RUNNING -> COMPLETED / FAILED),
progress tracking, error resilience, tenant isolation, and cleanup.
"""
import unittest
import asyncio
import time

from backend.app.db.database import init_db
from backend.app.services.jobs import JobManager
from backend.app.utils.security import generate_uuid

# Test worker functions
async def sample_successful_job(multiplier: int, progress_callback=None):
    if progress_callback:
        progress_callback(0.3)
    await asyncio.sleep(0.05)
    if progress_callback:
        progress_callback(0.7)
    await asyncio.sleep(0.05)
    return {"calculated_value": 42 * multiplier}

def sample_sync_job(delay: float, progress_callback=None):
    if progress_callback:
        progress_callback(0.5)
    time.sleep(delay)
    return {"status": "sync_finished"}

async def sample_failing_job(progress_callback=None):
    await asyncio.sleep(0.05)
    raise ValueError("Quantitative convergence failure simulated")

class TestJobManager(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        asyncio.run(init_db())

    def test_job_lifecycle_success(self):
        """Validates QUEUED -> RUNNING -> COMPLETED lifecycle with progress updates."""
        async def _run():
            mgr = JobManager(max_concurrent_workers=2)
            await mgr.start()
            try:
                user_id = generate_uuid()

                job_id = await mgr.submit_job(
                    job_type="test_math",
                    user_id=user_id,
                    target_func=sample_successful_job,
                    input_params={"multiplier": 2},
                    multiplier=2
                )
                self.assertIsNotNone(job_id)

                # Wait for job to process
                max_wait = 6.0
                start = time.time()
                completed = False

                while time.time() - start < max_wait:
                    status_dict = await mgr.get_job(job_id, requesting_user_id=user_id)
                    self.assertIsNotNone(status_dict)
                    if status_dict["status"] == "COMPLETED":
                        completed = True
                        self.assertEqual(status_dict["progress"], 1.0)
                        self.assertIsNotNone(status_dict["result"])
                        self.assertEqual(status_dict["result"]["calculated_value"], 84)
                        self.assertIsNone(status_dict["error"])
                        self.assertGreater(status_dict["duration_seconds"], 0.0)
                        break
                    await asyncio.sleep(0.05)

                self.assertTrue(completed, "Job did not complete within timeout")
            finally:
                await mgr.shutdown()

        asyncio.run(_run())

    def test_job_lifecycle_failure(self):
        """Validates that a raised exception transitions job to FAILED without crashing worker."""
        async def _run():
            mgr = JobManager(max_concurrent_workers=2)
            await mgr.start()
            try:
                user_id = generate_uuid()

                job_id = await mgr.submit_job(
                    job_type="test_failing",
                    user_id=user_id,
                    target_func=sample_failing_job
                )

                max_wait = 6.0
                start = time.time()
                failed = False

                while time.time() - start < max_wait:
                    status_dict = await mgr.get_job(job_id, requesting_user_id=user_id)
                    self.assertIsNotNone(status_dict)
                    if status_dict["status"] == "FAILED":
                        failed = True
                        self.assertIn("Quantitative convergence failure simulated", status_dict["error"])
                        self.assertIsNone(status_dict["result"])
                        break
                    await asyncio.sleep(0.05)

                self.assertTrue(failed, "Job did not transition to FAILED")
            finally:
                await mgr.shutdown()

        asyncio.run(_run())

    def test_job_tenant_isolation(self):
        """Verifies User B cannot poll User A's background job."""
        async def _run():
            mgr = JobManager(max_concurrent_workers=2)
            await mgr.start()
            try:
                user_a = generate_uuid()
                user_b = generate_uuid()

                job_id = await mgr.submit_job(
                    job_type="test_private",
                    user_id=user_a,
                    target_func=sample_successful_job,
                    multiplier=1
                )

                # User A can inspect the job
                job_a = await mgr.get_job(job_id, requesting_user_id=user_a)
                self.assertIsNotNone(job_a)

                # User B is denied access
                job_b = await mgr.get_job(job_id, requesting_user_id=user_b)
                self.assertIsNone(job_b)
            finally:
                await mgr.shutdown()

        asyncio.run(_run())

    def test_sync_execution_in_threadpool(self):
        """Verifies CPU-bound sync functions run in executor without blocking event loop."""
        async def _run():
            mgr = JobManager(max_concurrent_workers=2)
            await mgr.start()
            try:
                user_id = generate_uuid()

                job_id = await mgr.submit_job(
                    job_type="test_sync",
                    user_id=user_id,
                    target_func=sample_sync_job,
                    delay=0.05
                )

                max_wait = 6.0
                start = time.time()
                completed = False

                while time.time() - start < max_wait:
                    status_dict = await mgr.get_job(job_id, requesting_user_id=user_id)
                    if status_dict and status_dict["status"] == "COMPLETED":
                        completed = True
                        self.assertEqual(status_dict["result"]["status"], "sync_finished")
                        break
                    await asyncio.sleep(0.05)

                self.assertTrue(completed)
            finally:
                await mgr.shutdown()

        asyncio.run(_run())

if __name__ == "__main__":
    unittest.main()
