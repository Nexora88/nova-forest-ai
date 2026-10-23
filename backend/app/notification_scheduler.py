"""Persistent process for scheduled Web Push delivery; run as a dedicated service."""
from __future__ import annotations
import asyncio
import logging
from app.api.notification_routes import background_push_cycle
from app.services.push_service import configured
from app.api.message_routes import messaging_configured

logging.basicConfig(level=logging.INFO)
log=logging.getLogger("nexora-notification-scheduler")

async def main():
    interval=max(60,int(__import__("os").getenv("NEXORA_NOTIFICATION_INTERVAL_SECONDS","300")))
    if not configured() and not messaging_configured():
        log.error("Push provider/database secrets are not configured; scheduler will stay idle.")
    while True:
        try:
            if configured() or messaging_configured(): await background_push_cycle()
        except Exception:
            log.exception("Scheduled push cycle failed")
        await asyncio.sleep(interval)

if __name__=="__main__":
    asyncio.run(main())
