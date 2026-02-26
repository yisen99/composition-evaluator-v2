"""compatibility placeholder for removed local dual-role migration

Revision ID: 2026_02_24_0002
Revises: 20260223_0008
Create Date: 2026-02-24
"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "2026_02_24_0002"
down_revision: str | None = "20260223_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Keep this revision as a no-op to preserve compatibility with
    # existing databases already stamped to 2026_02_24_0002.
    return


def downgrade() -> None:
    return
