def sanitize_for_json(*args, **kwargs):
    from .serializer import sanitize_for_json as _fn
    return _fn(*args, **kwargs)

__all__ = ["sanitize_for_json"]
