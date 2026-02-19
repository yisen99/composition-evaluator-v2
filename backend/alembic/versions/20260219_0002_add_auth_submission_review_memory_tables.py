"""add auth and submission related tables

Revision ID: 20260219_0002
Revises: 20260218_0001
Create Date: 2026-02-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260219_0002"
down_revision: str | None = "20260218_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "auth_accounts",
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("hashed_password", sa.String(length=1024), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_superuser", sa.Boolean(), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("phone", name="auth_accounts_phone_key"),
    )
    op.create_index("ix_auth_accounts_email", "auth_accounts", ["email"], unique=True)

    op.create_table(
        "submissions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("assignment_id", sa.String(length=36), nullable=False),
        sa.Column("class_id", sa.String(length=36), nullable=False),
        sa.Column("student_id", sa.String(length=36), nullable=False),
        sa.Column("content_type", sa.String(length=20), nullable=False),
        sa.Column("text_content", sa.Text(), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("file_url", sa.String(length=500), nullable=True),
        sa.Column("storage_provider", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assignment_id"], ["assignments.id"]),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_submissions_assignment_id"), "submissions", ["assignment_id"], unique=False)
    op.create_index(op.f("ix_submissions_class_id"), "submissions", ["class_id"], unique=False)
    op.create_index(op.f("ix_submissions_student_id"), "submissions", ["student_id"], unique=False)

    op.create_table(
        "submission_reviews",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("submission_id", sa.String(length=36), nullable=False),
        sa.Column("assignment_id", sa.String(length=36), nullable=False),
        sa.Column("class_id", sa.String(length=36), nullable=False),
        sa.Column("student_id", sa.String(length=36), nullable=False),
        sa.Column("teacher_id", sa.String(length=36), nullable=False),
        sa.Column("agent_name", sa.String(length=40), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("feedback", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.ForeignKeyConstraint(["assignment_id"], ["assignments.id"]),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_submission_reviews_assignment_id"), "submission_reviews", ["assignment_id"], unique=False)
    op.create_index(op.f("ix_submission_reviews_class_id"), "submission_reviews", ["class_id"], unique=False)
    op.create_index(op.f("ix_submission_reviews_student_id"), "submission_reviews", ["student_id"], unique=False)
    op.create_index(op.f("ix_submission_reviews_submission_id"), "submission_reviews", ["submission_id"], unique=False)
    op.create_index(op.f("ix_submission_reviews_teacher_id"), "submission_reviews", ["teacher_id"], unique=False)

    op.create_table(
        "student_memory_notes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("student_id", sa.String(length=36), nullable=False),
        sa.Column("teacher_id", sa.String(length=36), nullable=False),
        sa.Column("class_id", sa.String(length=36), nullable=False),
        sa.Column("source_submission_id", sa.String(length=36), nullable=False),
        sa.Column("source_review_id", sa.String(length=36), nullable=False),
        sa.Column("agent_name", sa.String(length=40), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("tags", sa.String(length=200), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"]),
        sa.ForeignKeyConstraint(["source_submission_id"], ["submissions.id"]),
        sa.ForeignKeyConstraint(["source_review_id"], ["submission_reviews.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_student_memory_notes_class_id"), "student_memory_notes", ["class_id"], unique=False)
    op.create_index(
        op.f("ix_student_memory_notes_source_review_id"),
        "student_memory_notes",
        ["source_review_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_student_memory_notes_source_submission_id"),
        "student_memory_notes",
        ["source_submission_id"],
        unique=False,
    )
    op.create_index(op.f("ix_student_memory_notes_student_id"), "student_memory_notes", ["student_id"], unique=False)
    op.create_index(op.f("ix_student_memory_notes_teacher_id"), "student_memory_notes", ["teacher_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_student_memory_notes_teacher_id"), table_name="student_memory_notes")
    op.drop_index(op.f("ix_student_memory_notes_student_id"), table_name="student_memory_notes")
    op.drop_index(op.f("ix_student_memory_notes_source_submission_id"), table_name="student_memory_notes")
    op.drop_index(op.f("ix_student_memory_notes_source_review_id"), table_name="student_memory_notes")
    op.drop_index(op.f("ix_student_memory_notes_class_id"), table_name="student_memory_notes")
    op.drop_table("student_memory_notes")

    op.drop_index(op.f("ix_submission_reviews_teacher_id"), table_name="submission_reviews")
    op.drop_index(op.f("ix_submission_reviews_submission_id"), table_name="submission_reviews")
    op.drop_index(op.f("ix_submission_reviews_student_id"), table_name="submission_reviews")
    op.drop_index(op.f("ix_submission_reviews_class_id"), table_name="submission_reviews")
    op.drop_index(op.f("ix_submission_reviews_assignment_id"), table_name="submission_reviews")
    op.drop_table("submission_reviews")

    op.drop_index(op.f("ix_submissions_student_id"), table_name="submissions")
    op.drop_index(op.f("ix_submissions_class_id"), table_name="submissions")
    op.drop_index(op.f("ix_submissions_assignment_id"), table_name="submissions")
    op.drop_table("submissions")

    op.drop_index("ix_auth_accounts_email", table_name="auth_accounts")
    op.drop_table("auth_accounts")
