"""
FastAPI Security & Shared JWT Token Verification Dependency
Interoperates with Spring Boot 3 JJWT authentication tokens using HMAC-SHA256.
"""

import os
import time
import json
import hmac
import base64
import hashlib
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

def _get_key_bytes() -> bytes:
    raw_secret = os.getenv("JWT_SECRET", "").strip()
    if not raw_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT_SECRET is not configured on the AI service."
        )

    # Decode Base64 / Base64URL / UTF-8 exactly as Spring Boot does
    try:
        # Add padding if needed
        padded = raw_secret + "=" * (-len(raw_secret) % 4)
        key_bytes = base64.b64decode(padded)
    except Exception:
        try:
            padded = raw_secret + "=" * (-len(raw_secret) % 4)
            key_bytes = base64.urlsafe_b64decode(padded)
        except Exception:
            key_bytes = raw_secret.encode("utf-8")

    if len(key_bytes) < 32:
        key_bytes = hashlib.sha256(key_bytes).digest()

    return key_bytes

def _base64url_decode(input_str: str) -> bytes:
    rem = len(input_str) % 4
    if rem > 0:
        input_str += "=" * (4 - rem)
    return base64.urlsafe_b64decode(input_str)

def decode_token(token: str) -> Dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid JWT token structure."
        )

    header_b64, payload_b64, signature_b64 = parts

    try:
        header = json.loads(_base64url_decode(header_b64).decode("utf-8"))
    except Exception:
        header = {}

    alg = header.get("alg", "HS256").upper()
    if alg == "HS384":
        hash_fn = hashlib.sha384
    elif alg == "HS512":
        hash_fn = hashlib.sha512
    else:
        hash_fn = hashlib.sha256

    key_bytes = _get_key_bytes()
    expected_sig = hmac.new(key_bytes, f"{header_b64}.{payload_b64}".encode("utf-8"), hash_fn).digest()

    try:
        actual_sig = _base64url_decode(signature_b64)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token signature."
        )

    if not hmac.compare_digest(expected_sig, actual_sig):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid JWT token signature."
        )

    try:
        payload = json.loads(_base64url_decode(payload_b64).decode("utf-8"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload."
        )

    # Check expiration
    exp = payload.get("exp")
    if exp and time.time() > exp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired."
        )

    return payload

def get_current_user_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return decode_token(credentials.credentials)

def get_current_user_id(
    payload: Dict[str, Any] = Depends(get_current_user_payload)
) -> str:
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID (sub claim) missing in token."
        )
    return str(user_id)

def get_optional_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub")
        return str(user_id) if user_id else None
    except Exception:
        return None

