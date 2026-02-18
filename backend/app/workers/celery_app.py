from celery import Celery

from app.core.config import settings

celery_app = Celery("composition_evaluator")
celery_app.conf.broker_url = settings.redis_url
celery_app.conf.result_backend = settings.redis_url
