"""add manual review replies table

Revision ID: 20260219_0005
Revises: 20260219_0004
Create Date: 2026-02-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260219_0005"
down_revision: str | None = "20260219_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "manual_review_replies",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("manual_review_id", sa.String(length=36), nullable=False),
        sa.Column("submission_id", sa.String(length=36), nullable=False),
        sa.Column("assignment_id", sa.String(length=36), nullable=False),
        sa.Column("class_id", sa.String(length=36), nullable=False),
        sa.Column("student_id", sa.String(length=36), nullable=False),
        sa.Column("teacher_id", sa.String(length=36), nullable=False),
        sa.Column("author_role", sa.String(length=20), nullable=False),
        sa.Column("author_id", sa.String(length=36), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assignment_id"], ["assignments.id"]),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"]),
        sa.ForeignKeyConstraint(["manual_review_id"], ["manual_reviews.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_manual_review_replies_assignment_id"), "manual_review_replies", ["assignment_id"], unique=False)
    op.create_index(op.f("ix_manual_review_replies_author_id"), "manual_review_replies", ["author_id"], unique=False)
    op.create_index(op.f("ix_manual_review_replies_class_id"), "manual_review_replies", ["class_id"], unique=False)
    op.create_index(op.f("ix_manual_review_replies_manual_review_id"), "manual_review_replies", ["manual_review_id"], unique=False)
    op.create_index(op.f("ix_manual_review_replies_student_id"), "manual_review_replies", ["student_id"], unique=False)
    op.create_index(op.f("ix_manual_review_replies_submission_id"), "manual_review_replies", ["submission_id"], unique=False)
    op.create_index(op.f("ix_manual_review_replies_teacher_id"), "manual_review_replies", ["teacher_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_manual_review_replies_teacher_id"), table_name="manual_review_replies")
    op.drop_index(op.f("ix_manual_review_replies_submission_id"), table_name="manual_review_replies")
    op.drop_index(op.f("ix_manual_review_replies_student_id"), table_name="manual_review_replies")
    op.drop_index(op.f("ix_manual_review_replies_manual_review_id"), table_name="manual_review_replies")
    op.drop_index(op.f("ix_manual_review_replies_class_id"), table_name="manual_review_replies")
    op.drop_index(op.f("ix_manual_review_replies_author_id"), table_name="manual_review_replies")
    op.drop_index(op.f("ix_manual_review_replies_assignment_id"), table_name="manual_review_replies")
    op.drop_table("manual_review_replies")
