from __future__ import annotations

import pytest

from app.retention import (
    DEFAULT_PURGE_BATCH_SIZE,
    MAX_PURGE_BATCH_SIZE,
    _parser,
    _validate_batch_size,
    purge_expired,
)


def test_retention_batch_size_is_bounded() -> None:
    assert DEFAULT_PURGE_BATCH_SIZE == 500
    assert _validate_batch_size(1) == 1
    assert _validate_batch_size(MAX_PURGE_BATCH_SIZE) == 500
    with pytest.raises(ValueError, match="between 1 and 500"):
        _validate_batch_size(0)
    with pytest.raises(ValueError, match="between 1 and 500"):
        _validate_batch_size(501)


def test_retention_cli_requires_explicit_purge_command() -> None:
    args = _parser().parse_args(["purge-expired", "--batch-size", "7"])
    assert args.command == "purge-expired"
    assert args.batch_size == 7


class _UnlockedSession:
    def __enter__(self) -> _UnlockedSession:
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def scalar(self, statement: object) -> bool:
        return False


def test_retention_is_safe_when_another_purge_holds_the_advisory_lock() -> None:
    assert purge_expired(session_factory=_UnlockedSession) == 0  # type: ignore[arg-type]
