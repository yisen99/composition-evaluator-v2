"""add assignment reminder and ux event tables

Revision ID: 20260220_0007
Revises: 20260219_0006
Create Date: 2026-02-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260220_0007"
down_revision: str | None = "20260219_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "assignment_reminders",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("assignment_id", sa.String(length=36), nullable=False),
        sa.Column("class_id", sa.String(length=36), nullable=False),
        sa.Column("teacher_id", sa.String(length=36), nullable=False),
        sa.Column("reminder_type", sa.String(length=32), nullable=False),
        sa.Column("target_student_count", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assignment_id"], ["assignments.id"]),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"]),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_assignment_reminders_assignment_id"),
        "assignment_reminders",
        ["assignment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_assignment_reminders_class_id"),
        "assignment_reminders",
        ["class_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_assignment_reminders_teacher_id"),
        "assignment_reminders",
        ["teacher_id"],
        unique=False,
    )

    op.create_table(
        "ux_event_logs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("event_name", sa.String(length=100), nullable=False),
        sa.Column("event_category", sa.String(length=50), nullable=False),
        sa.Column("page", sa.String(length=160), nullable=True),
        sa.Column("properties_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ux_event_logs_created_at"), "ux_event_logs", ["created_at"], unique=False)
    op.create_index(op.f("ix_ux_event_logs_event_category"), "ux_event_logs", ["event_category"], unique=False)
    op.create_index(op.f("ix_ux_event_logs_event_name"), "ux_event_logs", ["event_name"], unique=False)
    op.create_index(op.f("ix_ux_event_logs_page"), "ux_event_logs", ["page"], unique=False)
    op.create_index(op.f("ix_ux_event_logs_role"), "ux_event_logs", ["role"], unique=False)
    op.create_index(op.f("ix_ux_event_logs_user_id"), "ux_event_logs", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_ux_event_logs_user_id"), table_name="ux_event_logs")
    op.drop_index(op.f("ix_ux_event_logs_role"), table_name="ux_event_logs")
    op.drop_index(op.f("ix_ux_event_logs_page"), table_name="ux_event_logs")
    op.drop_index(op.f("ix_ux_event_logs_event_name"), table_name="ux_event_logs")
    op.drop_index(op.f("ix_ux_event_logs_event_category"), table_name="ux_event_logs")
    op.drop_index(op.f("ix_ux_event_logs_created_at"), table_name="ux_event_logs")
    op.drop_table("ux_event_logs")

    op.drop_index(op.f("ix_assignment_reminders_teacher_id"), table_name="assignment_reminders")
    op.drop_index(op.f("ix_assignment_reminders_class_id"), table_name="assignment_reminders")
    op.drop_index(op.f("ix_assignment_reminders_assignment_id"), table_name="assignment_reminders")
    op.drop_table("assignment_reminders")
