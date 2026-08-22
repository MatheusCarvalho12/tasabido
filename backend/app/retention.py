"""Bounded, idempotent tracing retention purge CLI."""

from __future__ import annotations

import argparse
from collections.abc import Callable, Sequence

from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

RETENTION_MONTHS = 24
DEFAULT_PURGE_BATCH_SIZE = 500
MAX_PURGE_BATCH_SIZE = 500
RETENTION_LOCK_KEY = 0x545342444F


def _validate_batch_size(batch_size: int) -> int:
    if not 1 <= batch_size <= MAX_PURGE_BATCH_SIZE:
        raise ValueError(f"batch_size must be between 1 and {MAX_PURGE_BATCH_SIZE}")
    return batch_size


def purge_expired(
    batch_size: int = DEFAULT_PURGE_BATCH_SIZE,
    session_factory: Callable[[], Session] | None = None,
) -> int:
    """Remove tracing evidence older than 24 months, committing each batch.

    The run summary and immutable glyph/scoring identity remain for product
    history; drawing evidence and the effective configuration are cleared in
    the same transaction. The audit row retains the deletion action, original
    evidence digest/version, and run reference.
    """
    batch_size = _validate_batch_size(batch_size)
    if session_factory is None:
        from app.database import SessionLocal

        session_factory = SessionLocal
    with session_factory() as db:
        locked = db.scalar(select(func.pg_try_advisory_lock(RETENTION_LOCK_KEY)))
        if not locked:
            return 0
        from app.models import GameRun, RetentionAudit

        purged = 0
        try:
            while True:
                runs = list(
                    db.scalars(
                        select(GameRun)
                        .where(
                            GameRun.last_activity_at.is_not(None),
                            GameRun.last_activity_at < func.now() - text("INTERVAL '24 months'"),
                            or_(
                                GameRun.evidence.is_not(None),
                                GameRun.effective_config.is_not(None),
                            ),
                        )
                        .order_by(GameRun.last_activity_at, GameRun.id)
                        .limit(batch_size)
                        .with_for_update(skip_locked=True)
                    ).all()
                )
                if not runs:
                    db.commit()
                    break
                for run in runs:
                    db.add(
                        RetentionAudit(
                            game_run_id=run.id,
                            action="deleted",
                            reason=f"tracing evidence expired after {RETENTION_MONTHS} months",
                            evidence_sha256=run.evidence_sha256,
                            evidence_version=run.evidence_version,
                        )
                    )
                    run.evidence = None
                    run.evidence_sha256 = None
                    run.evidence_version = None
                    run.effective_config = None
                db.commit()
                purged += len(runs)
            return purged
        finally:
            if db.in_transaction():
                db.rollback()
            db.execute(select(func.pg_advisory_unlock(RETENTION_LOCK_KEY)))
            db.commit()


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m app.retention")
    commands = parser.add_subparsers(dest="command", required=True)
    purge = commands.add_parser("purge-expired", help="purge tracing evidence past retention")
    purge.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_PURGE_BATCH_SIZE,
        help=f"rows per transaction (1-{MAX_PURGE_BATCH_SIZE})",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if args.command == "purge-expired":
        count = purge_expired(args.batch_size)
        print(f"purged {count} tracing runs")
        return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
