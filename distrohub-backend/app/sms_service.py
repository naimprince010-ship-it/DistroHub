"""
SMS Service for mimsms.com API Integration
Handles SMS sending, template rendering, and queue management
"""
import os
import re
import httpx
from typing import List, Dict, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class SmsService:
    """Service for sending SMS via mimsms.com API"""
    
    def __init__(self):
        self.username = os.getenv("MIMSMS_USERNAME")
        self.api_key = os.getenv("MIMSMS_API_KEY")
        self.sender_name = os.getenv("MIMSMS_SENDER_NAME", "DistroHub")
        self.enabled = os.getenv("MIMSMS_ENABLED", "false").lower() == "true"
        self.api_url = "https://api.mimsms.com/api/SmsSending/OneToMany"
        
        if not self.enabled:
            logger.warning("SMS service is disabled (MIMSMS_ENABLED=false)")
        elif not self.username or not self.api_key:
            logger.warning("SMS service credentials not configured")
    
    def _validate_phone(self, phone: str) -> str:
        """Validate and format phone number for Bangladesh"""
        # Remove spaces, dashes, and other characters
        phone = re.sub(r'[^\d+]', '', phone)
        
        # If starts with +880, keep it
        if phone.startswith('+880'):
            return phone[1:]  # Remove +, keep 880
        
        # If starts with 880, keep it
        if phone.startswith('880'):
            return phone
        
        # If starts with 0, replace with 880
        if phone.startswith('0'):
            return '880' + phone[1:]
        
        # If starts with 1 (mobile number), add 880
        if phone.startswith('1') and len(phone) == 10:
            return '880' + phone
        
        # If already 11 digits starting with 880, return as is
        if len(phone) == 13 and phone.startswith('880'):
            return phone
        
        raise ValueError(f"Invalid phone number format: {phone}")
    
    async def send_sms(
        self,
        recipient_phone: str,
        message: str,
        transaction_type: str = "T"  # T = Transactional, P = Promotional
    ) -> Dict:
        """
        Send single SMS via mimsms.com API
        
        Args:
            recipient_phone: Phone number (will be validated and formatted)
            message: SMS message text
            transaction_type: "T" for transactional, "P" for promotional
        
        Returns:
            Dict with status, trxn_id, and response message
        """
        if not self.enabled:
            return {
                "status": "disabled",
                "statusCode": "400",
                "responseResult": "SMS service is disabled"
            }
        
        if not self.username or not self.api_key:
            return {
                "status": "error",
                "statusCode": "500",
                "responseResult": "SMS credentials not configured"
            }
        
        try:
            # Validate and format phone number
            formatted_phone = self._validate_phone(recipient_phone)
            
            # Prepare request payload
            payload = {
                "UserName": self.username,
                "Apikey": self.api_key,
                "MobileNumber": formatted_phone,
                "CampaignId": None,
                "SenderName": self.sender_name[:11],  # Max 11 characters
                "TransactionType": transaction_type,
                "Message": message
            }
            
            # Send request to mimsms.com API
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.api_url,
                    json=payload,
                    headers={"Content-Type": "application/json", "Accept": "application/json"}
                )
                response.raise_for_status()
                result = response.json()
                
                logger.info(f"SMS sent to {formatted_phone}: {result.get('status', 'unknown')}")
                return result
                
        except httpx.HTTPError as e:
            logger.error(f"HTTP error sending SMS: {e}")
            return {
                "status": "error",
                "statusCode": "500",
                "responseResult": f"HTTP error: {str(e)}"
            }
        except ValueError as e:
            logger.error(f"Invalid phone number: {e}")
            return {
                "status": "error",
                "statusCode": "400",
                "responseResult": f"Invalid phone number: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Error sending SMS: {e}")
            return {
                "status": "error",
                "statusCode": "500",
                "responseResult": f"Error: {str(e)}"
            }
    
    async def send_bulk_sms(
        self,
        recipient_phones: List[str],
        message: str,
        transaction_type: str = "T"
    ) -> List[Dict]:
        """
        Send SMS to multiple recipients
        
        Args:
            recipient_phones: List of phone numbers
            message: SMS message text
            transaction_type: "T" for transactional, "P" for promotional
        
        Returns:
            List of results for each recipient
        """
        results = []
        for phone in recipient_phones:
            result = await self.send_sms(phone, message, transaction_type)
            results.append({
                "phone": phone,
                "result": result
            })
        return results
    
    async def check_balance(self) -> Dict:
        """
        Check mimsms.com account balance
        
        Returns:
            Dict with balance information
        """
        if not self.enabled or not self.username or not self.api_key:
            return {
                "status": "error",
                "message": "SMS service not configured"
            }
        
        try:
            # mimsms.com balance check endpoint
            balance_url = f"http://api.mimsms.com/api/command"
            params = {
                "username": self.username,
                "password": self.api_key,  # Some APIs use password instead of apikey for balance
                "cmd": "Credits"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(balance_url, params=params)
                response.raise_for_status()
                return response.json()
                
        except Exception as e:
            logger.error(f"Error checking SMS balance: {e}")
            return {
                "status": "error",
                "message": f"Error: {str(e)}"
            }
    
    async def get_delivery_status(self, trxn_id: str) -> Dict:
        """
        Check delivery status by transaction ID
        
        Args:
            trxn_id: Transaction ID from mimsms.com
        
        Returns:
            Dict with delivery status
        """
        if not self.enabled or not self.username or not self.api_key:
            return {
                "status": "error",
                "message": "SMS service not configured"
            }
        
        try:
            # mimsms.com delivery status endpoint (adjust URL if different)
            status_url = f"http://api.mimsms.com/api/DeliveryStatus"
            params = {
                "username": self.username,
                "apikey": self.api_key,
                "trxnId": trxn_id
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(status_url, params=params)
                response.raise_for_status()
                return response.json()
                
        except Exception as e:
            logger.error(f"Error checking delivery status: {e}")
            return {
                "status": "error",
                "message": f"Error: {str(e)}"
            }


class SmsTemplateRenderer:
    """Renders SMS templates with variable substitution"""
    
    @staticmethod
    def render(template: str, variables: Dict[str, any]) -> str:
        """
        Render template with variable substitution
        
        Args:
            template: Template string with {variable_name} placeholders
            variables: Dict of variable values
        
        Returns:
            Rendered message string
        """
        message = template
        
        # Replace all {variable_name} with actual values
        for key, value in variables.items():
            placeholder = f"{{{key}}}"
            # Convert value to string, handle None
            str_value = str(value) if value is not None else ""
            message = message.replace(placeholder, str_value)
        
        return message
    
    @staticmethod
    def extract_variables(template: str) -> List[str]:
        """
        Extract variable names from template
        
        Args:
            template: Template string with {variable_name} placeholders
        
        Returns:
            List of variable names
        """
        pattern = r'\{(\w+)\}'
        variables = re.findall(pattern, template)
        return list(set(variables))  # Return unique variables


class SmsQueueManager:
    """Manages SMS queue for batch processing"""
    
    def __init__(self, db):
        self.db = db
    
    async def add_to_queue(
        self,
        recipient_phone: str,
        message: str,
        event_type: str,
        scheduled_at: Optional[datetime] = None
    ) -> str:
        """
        Add SMS to queue
        
        Returns:
            Queue item ID
        """
        return self.db.add_to_sms_queue(
            recipient_phone=recipient_phone,
            message=message,
            event_type=event_type,
            scheduled_at=scheduled_at or datetime.now()
        )
    
    async def get_pending_items(self, limit: int = 50) -> List[Dict]:
        """Get pending SMS items from queue"""
        return self.db.get_pending_sms_queue(limit=limit)
    
    async def update_queue_status(
        self,
        queue_id: str,
        status: str,
        error_message: Optional[str] = None
    ):
        """Update queue item status"""
        self.db.update_sms_queue_status(
            queue_id=queue_id,
            status=status,
            error_message=error_message
        )

