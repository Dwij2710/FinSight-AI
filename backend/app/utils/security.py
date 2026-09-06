"""
FinSight AI - Security & Cryptographic Utilities
Provides PBKDF2-HMAC-SHA256 password hashing with random salt,
and cryptographically secure session token and UUID generation.
"""
import os
import hmac
import hashlib
import secrets
import uuid

def generate_uuid() -> str:
    """Generate a standard UUID4 string."""
    return str(uuid.uuid4())

def generate_session_token() -> str:
    """Generate a high-entropy, URL-safe session token (256 bits)."""
    return secrets.token_urlsafe(32)

def hash_password(password: str) -> str:
    """
    Hash password using PBKDF2-HMAC-SHA256 with a random 16-byte salt
    and 200,000 iterations for OWASP-compliant key stretching.
    Format: 'pbkdf2_sha256$iterations$salt_hex$hash_hex'
    """
    if not password:
        raise ValueError("Password cannot be empty")
    
    salt = os.urandom(16)
    iterations = 200_000
    derived = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        iterations,
        dklen=32
    )
    return f"pbkdf2_sha256${iterations}${salt.hex()}${derived.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify plaintext password against a PBKDF2 hash using constant-time comparison.
    """
    if not plain_password or not hashed_password:
        return False
    
    try:
        parts = hashed_password.split('$')
        if len(parts) != 4 or parts[0] != 'pbkdf2_sha256':
            return False
        
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected_hash = bytes.fromhex(parts[3])
        
        computed_hash = hashlib.pbkdf2_hmac(
            'sha256',
            plain_password.encode('utf-8'),
            salt,
            iterations,
            dklen=len(expected_hash)
        )
        return hmac.compare_digest(expected_hash, computed_hash)
    except Exception:
        return False
