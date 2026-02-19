from collections.abc import Iterator

import pytest

from app.core.config import settings


@pytest.fixture(autouse=True)
def force_fixed_auth_code_for_tests() -> Iterator[None]:
    previous = settings.auth_fixed_code
    settings.auth_fixed_code = "123456"
    try:
        yield
    finally:
        settings.auth_fixed_code = previous
