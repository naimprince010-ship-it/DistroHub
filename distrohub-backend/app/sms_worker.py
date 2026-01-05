"""
Background worker for processing SMS queue
Processes queued SMS messages in batches with retry logic
"""
import asyncio
import logging
from datetime import datetime
from typing import List, Dict
from app.sms_service import SmsService, SmsQueueManager
from app.database import db

logger = logging.getLogger(__name__)

class SmsWorker:
    """Background worker to process SMS queue"""
    
    def __init__(self, db_instance):
        self.sms_service = SmsService()
        self.queue_manager = SmsQueueManager(db_instance)
        self.db = db_instance
        self.running = False
        self.batch_size = 10
        self.process_interval = 60  # Process queue every 60 seconds
        self.max_retries = 3
    
    async def process_queue(self):
        """Process pending SMS items from queue"""
        try:
            # Get pending items
            pending_items = await self.queue_manager.get_pending_items(limit=self.batch_size)
            
            if not pending_items:
                return
            
            logger.info(f"Processing {len(pending_items)} SMS items from queue")
            
            for item in pending_items:
                try:
                    # Update status to processing
                    await self.queue_manager.update_queue_status(item["id"], "processing")
                    
                    # Send SMS
                    result = await self.sms_service.send_sms(
                        recipient_phone=item["recipient_phone"],
                        message=item["message"]
                    )
                    
                    # Check result
                    if result.get("status") == "Success":
                        # Mark as sent
                        await self.queue_manager.update_queue_status(item["id"], "sent")
                        
                        # Create log entry
                        log_data = {
                            "recipient_phone": item["recipient_phone"],
                            "message": item["message"],
                            "event_type": item["event_type"],
                            "status": "sent",
                            "trxn_id": result.get("trxnId")
                        }
                        self.db.create_sms_log(log_data)
                        
                        logger.info(f"SMS sent successfully to {item['recipient_phone']}")
                    else:
                        # Failed - check retry count
                        retry_count = item.get("retry_count", 0)
                        if retry_count < self.max_retries:
                            # Retry
                            await self.queue_manager.update_queue_status(
                                item["id"],
                                "pending",
                                error_message=result.get("responseResult", "Unknown error")
                            )
                            logger.warning(f"SMS failed, will retry (attempt {retry_count + 1}/{self.max_retries})")
                        else:
                            # Max retries reached - mark as failed
                            await self.queue_manager.update_queue_status(
                                item["id"],
                                "failed",
                                error_message=result.get("responseResult", "Max retries reached")
                            )
                            
                            # Create log entry
                            log_data = {
                                "recipient_phone": item["recipient_phone"],
                                "message": item["message"],
                                "event_type": item["event_type"],
                                "status": "failed",
                                "error_message": result.get("responseResult", "Max retries reached")
                            }
                            self.db.create_sms_log(log_data)
                            
                            logger.error(f"SMS failed after {self.max_retries} retries to {item['recipient_phone']}")
                
                except Exception as e:
                    logger.error(f"Error processing SMS queue item {item.get('id')}: {e}")
                    # Mark as failed
                    await self.queue_manager.update_queue_status(
                        item["id"],
                        "failed",
                        error_message=str(e)
                    )
        
        except Exception as e:
            logger.error(f"Error processing SMS queue: {e}")
            import traceback
            traceback.print_exc()
    
    async def start(self):
        """Start the SMS worker"""
        self.running = True
        logger.info("SMS worker started")
        
        while self.running:
            try:
                await self.process_queue()
            except Exception as e:
                logger.error(f"Error in SMS worker loop: {e}")
            
            # Wait before next iteration
            await asyncio.sleep(self.process_interval)
    
    def stop(self):
        """Stop the SMS worker"""
        self.running = False
        logger.info("SMS worker stopped")

# Global worker instance
_worker: SmsWorker = None

def get_sms_worker(db_instance) -> SmsWorker:
    """Get or create SMS worker instance"""
    global _worker
    if _worker is None:
        _worker = SmsWorker(db_instance)
    return _worker

async def start_sms_worker(db_instance):
    """Start SMS worker in background"""
    worker = get_sms_worker(db_instance)
    if not worker.running:
        asyncio.create_task(worker.start())

