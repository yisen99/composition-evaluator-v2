"""add manual reviews table

Revision ID: 20260219_0003
Revises: 20260219_0002
Create Date: 2026-02-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260219_0003"
down_revision: str | None = "20260219_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "manual_reviews",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("submission_id", sa.String(length=36), nullable=False),
        sa.Column("assignment_id", sa.String(length=36), nullable=False),
        sa.Column("class_id", sa.String(length=36), nullable=False),
        sa.Column("teacher_id", sa.String(length=36), nullable=False),
        sa.Column("student_id", sa.String(length=36), nullable=False),
        sa.Column("structure_score", sa.Integer(), nullable=False),
        sa.Column("language_score", sa.Integer(), nullable=False),
        sa.Column("value_score", sa.Integer(), nullable=False),
        sa.Column("total_score", sa.Integer(), nullable=False),
        sa.Column("summary_feedback", sa.Text(), nullable=False),
        sa.Column("actionable_suggestions", sa.JSON(), nullable=False),
        sa.Column("strengths", sa.Text(), nullable=True),
        sa.Column("next_goal", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["assignment_id"], ["assignments.id"]),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("submission_id", "teacher_id", name="uq_manual_reviews_submission_teacher"),
    )
    op.create_index(op.f("ix_manual_reviews_assignment_id"), "manual_reviews", ["assignment_id"], unique=False)
    op.create_index(op.f("ix_manual_reviews_class_id"), "manual_reviews", ["class_id"], unique=False)
    op.create_index(op.f("ix_manual_reviews_student_id"), "manual_reviews", ["student_id"], unique=False)
    op.create_index(op.f("ix_manual_reviews_submission_id"), "manual_reviews", ["submission_id"], unique=False)
    op.create_index(op.f("ix_manual_reviews_teacher_id"), "manual_reviews", ["teacher_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_manual_reviews_teacher_id"), table_name="manual_reviews")
    op.drop_index(op.f("ix_manual_reviews_submission_id"), table_name="manual_reviews")
    op.drop_index(op.f("ix_manual_reviews_student_id"), table_name="manual_reviews")
    op.drop_index(op.f("ix_manual_reviews_class_id"), table_name="manual_reviews")
    op.drop_index(op.f("ix_manual_reviews_assignment_id"), table_name="manual_reviews")
    op.drop_table("manual_reviews")
