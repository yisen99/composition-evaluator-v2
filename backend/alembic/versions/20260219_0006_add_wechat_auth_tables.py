"""add wechat auth related tables

Revision ID: 20260219_0006
Revises: 20260219_0005
Create Date: 2026-02-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260219_0006"
down_revision: str | None = "20260219_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "wechat_account_links",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("auth_account_id", sa.Uuid(), nullable=False),
        sa.Column("unionid", sa.String(length=128), nullable=True),
        sa.Column("openid", sa.String(length=128), nullable=False),
        sa.Column("nickname", sa.String(length=120), nullable=True),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["auth_account_id"], ["auth_accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("auth_account_id"),
        sa.UniqueConstraint("openid"),
        sa.UniqueConstraint("unionid"),
    )
    op.create_index(
        op.f("ix_wechat_account_links_auth_account_id"),
        "wechat_account_links",
        ["auth_account_id"],
        unique=True,
    )
    op.create_index(op.f("ix_wechat_account_links_openid"), "wechat_account_links", ["openid"], unique=True)
    op.create_index(op.f("ix_wechat_account_links_unionid"), "wechat_account_links", ["unionid"], unique=True)

    op.create_table(
        "wechat_bind_sessions",
        sa.Column("ticket", sa.String(length=64), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("unionid", sa.String(length=128), nullable=True),
        sa.Column("openid", sa.String(length=128), nullable=False),
        sa.Column("nickname", sa.String(length=120), nullable=True),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("next_path", sa.String(length=500), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("ticket"),
    )
    op.create_index(
        op.f("ix_wechat_bind_sessions_consumed_at"),
        "wechat_bind_sessions",
        ["consumed_at"],
        unique=False,
    )
    op.create_index(op.f("ix_wechat_bind_sessions_expires_at"), "wechat_bind_sessions", ["expires_at"], unique=False)
    op.create_index(op.f("ix_wechat_bind_sessions_openid"), "wechat_bind_sessions", ["openid"], unique=False)
    op.create_index(op.f("ix_wechat_bind_sessions_unionid"), "wechat_bind_sessions", ["unionid"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_wechat_bind_sessions_unionid"), table_name="wechat_bind_sessions")
    op.drop_index(op.f("ix_wechat_bind_sessions_openid"), table_name="wechat_bind_sessions")
    op.drop_index(op.f("ix_wechat_bind_sessions_expires_at"), table_name="wechat_bind_sessions")
    op.drop_index(op.f("ix_wechat_bind_sessions_consumed_at"), table_name="wechat_bind_sessions")
    op.drop_table("wechat_bind_sessions")

    op.drop_index(op.f("ix_wechat_account_links_unionid"), table_name="wechat_account_links")
    op.drop_index(op.f("ix_wechat_account_links_openid"), table_name="wechat_account_links")
    op.drop_index(op.f("ix_wechat_account_links_auth_account_id"), table_name="wechat_account_links")
    op.drop_table("wechat_account_links")
