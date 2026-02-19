"""add manual feedback receipts table

Revision ID: 20260219_0004
Revises: 20260219_0003
Create Date: 2026-02-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260219_0004"
down_revision: str | None = "20260219_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "manual_feedback_receipts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("manual_review_id", sa.String(length=36), nullable=False),
        sa.Column("submission_id", sa.String(length=36), nullable=False),
        sa.Column("student_id", sa.String(length=36), nullable=False),
        sa.Column("first_viewed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_viewed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("view_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["manual_review_id"], ["manual_reviews.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("submission_id", "student_id", name="uq_manual_feedback_receipt_submission_student"),
    )
    op.create_index(
        op.f("ix_manual_feedback_receipts_manual_review_id"),
        "manual_feedback_receipts",
        ["manual_review_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_manual_feedback_receipts_submission_id"),
        "manual_feedback_receipts",
        ["submission_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_manual_feedback_receipts_student_id"),
        "manual_feedback_receipts",
        ["student_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_manual_feedback_receipts_student_id"), table_name="manual_feedback_receipts")
    op.drop_index(op.f("ix_manual_feedback_receipts_submission_id"), table_name="manual_feedback_receipts")
    op.drop_index(op.f("ix_manual_feedback_receipts_manual_review_id"), table_name="manual_feedback_receipts")
    op.drop_table("manual_feedback_receipts")
