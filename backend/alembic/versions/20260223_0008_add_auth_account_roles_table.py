"""add auth account roles table

Revision ID: 20260223_0008
Revises: 20260220_0007
Create Date: 2026-02-23
"""

from collections.abc import Sequence
from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260223_0008"
down_revision: str | None = "20260220_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("student_profile_completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("teacher_profile_completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("auth_accounts", sa.Column("student_profile_completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("auth_accounts", sa.Column("teacher_profile_completed_at", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "auth_account_roles",
        sa.Column("auth_account_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["auth_account_id"], ["auth_accounts.id"]),
        sa.PrimaryKeyConstraint("auth_account_id", "role"),
    )
    op.create_index(op.f("ix_auth_account_roles_auth_account_id"), "auth_account_roles", ["auth_account_id"], unique=False)

    connection = op.get_bind()
    rows = connection.execute(sa.text("SELECT id, role FROM auth_accounts")).mappings().all()
    created_at = datetime.now(timezone.utc)
    for row in rows:
        connection.execute(
            sa.text(
                "INSERT INTO auth_account_roles (auth_account_id, role, created_at) "
                "VALUES (:auth_account_id, :role, :created_at) "
                "ON CONFLICT DO NOTHING"
            ),
            {
                "auth_account_id": row["id"],
                "role": row["role"],
                "created_at": created_at,
            },
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_auth_account_roles_auth_account_id"), table_name="auth_account_roles")
    op.drop_table("auth_account_roles")
    op.drop_column("auth_accounts", "teacher_profile_completed_at")
    op.drop_column("auth_accounts", "student_profile_completed_at")
    op.drop_column("users", "teacher_profile_completed_at")
    op.drop_column("users", "student_profile_completed_at")
