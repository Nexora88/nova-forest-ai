"""Long-running scheduler for server-side Web Push, SMS, and WhatsApp alerts."""
from __future__ import annotations
import asyncio
import logging
import os
import time
from app.api.notification_routes import background_push_cycle

logging.basicConfig(level=os.getenv("LOG_LEVEL","INFO"))
log=logging.getLogger("nexora-alert-scheduler")

def main():
    delay=max(60,int(os.getenv("NOVA_ALERT_INTERVAL_SECONDS","300")))
    log.info("Nexora alert scheduler started; interval=%s seconds",delay)
    while True:
        try:
            asyncio.run(background_push_cycle())
        except Exception:
            log.exception("Alert evaluation cycle failed")
        time.sleep(delay)

if __name__=="__main__":
    main()
