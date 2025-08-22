import os
from pathlib import Path
import base64
from dotenv import load_dotenv
import openai
import google.generativeai as genai
import requests
import json
import re
import uuid
from enum import Enum
from typing import List, Optional, Union
from pydantic import BaseModel, Field, validator

# Load environment variables from backend .env file
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path(__file__).resolve().parent
env_path = backend_dir / '.env'
load_dotenv(env_path)

class AIProvider(Enum):
    AZURE = "azure"
    GEMINI = "gemini"

# Pydantic models for structured output validation
class LineItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    quantity: int = 1
    price_per_item: float = 0.0
    total_price: float = 0.0
    assignments: List[str] = Field(default_factory=list)
    
    @validator('price_per_item', 'total_price')
    def validate_prices(cls, v):
        return float(v) if v is not None else 0.0

class TransportationTicket(BaseModel):
    document_type: str = "transportation_ticket"
    is_receipt: bool = True
    carrier: Optional[str] = None
    ticket_number: Optional[str] = None
    date: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    passenger: Optional[str] = None
    class_: Optional[str] = Field(None, alias='class')
    fare: float = 0.0
    currency: Optional[str] = None
    taxes: float = 0.0
    total: float = 0.0
    
    @validator('fare', 'taxes', 'total')
    def validate_amounts(cls, v):
        return float(v) if v is not None else 0.0

class RegularReceipt(BaseModel):
    is_receipt: bool = True
    merchant: Optional[str] = None
    date: Optional[str] = None
    line_items: List[LineItem] = Field(default_factory=list)
    subtotal: float = 0.0
    tax: float = 0.0
    tip: float = 0.0
    gratuity: float = 0.0
    total: float = 0.0
    payment_method: Optional[str] = None
    tax_included_in_items: bool = False
    display_subtotal: float = 0.0
    items_total: float = 0.0
    pretax_total: float = 0.0
    posttax_total: float = 0.0
    final_total: float = 0.0
    
    @validator('subtotal', 'tax', 'tip', 'gratuity', 'total', 'display_subtotal', 'items_total', 'pretax_total', 'posttax_total', 'final_total')
    def validate_amounts(cls, v):
        return float(v) if v is not None else 0.0

class NotAReceipt(BaseModel):
    is_receipt: bool = False

# Union type for all possible receipt types
ReceiptData = Union[TransportationTicket, RegularReceipt, NotAReceipt]

class ImageAnalyzer:
    def __init__(self, provider=None):
        self.provider = provider or os.getenv("DEFAULT_AI_PROVIDER", "azure")
        self._configure_provider()

    def _configure_provider(self):
        if self.provider == AIProvider.AZURE.value:
            # Configure Azure OpenAI
            openai.api_key = os.getenv("AZURE_OPENAI_KEY")
            openai.api_base = os.getenv("AZURE_OPENAI_ENDPOINT")
            openai.api_type = "azure"
            openai.api_version = "2023-05-15"
        elif self.provider == AIProvider.GEMINI.value:
            # Configure Google Gemini
            genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        else:
            raise ValueError(f"Unsupported AI provider: {self.provider}")

    def encode_image(self, image_path):
        """Encode image to base64 string"""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    def analyze_image(self, image_path):
        """
        Analyze a receipt image using the selected AI provider
        Returns a dictionary with the analysis results
        """
        if not os.path.exists(image_path):
            return {"success": False, "error": "Image not found"}
        
        try:
            if self.provider == AIProvider.AZURE.value:
                return self._analyze_with_azure(image_path)
            else:
                return self._analyze_with_gemini(image_path)
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def _analyze_with_azure(self, image_path):
        """Analyze image using Azure OpenAI"""
        base64_image = self.encode_image(image_path)
        
        headers = {
            "Content-Type": "application/json",
            "api-key": os.getenv("AZURE_OPENAI_KEY")
        }
        
        deployment_id = os.getenv("AZURE_OPENAI_DEPLOYMENT")
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        url = f"{endpoint}openai/deployments/{deployment_id}/chat/completions?api-version=2023-05-15"
        
        payload = {
            "messages": [
                {
                    "role": "system",
                    "content": self._get_system_prompt()
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": "Analyze this image and extract all relevant payment information. This might be a receipt, invoice, or transportation ticket. Pay special attention to any monetary amounts shown."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 2000,
            "temperature": 0.3
        }
        
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        return self._process_response(response.json()["choices"][0]["message"]["content"])

    def _analyze_with_gemini(self, image_path):
        """Analyze image using Google Gemini"""
        # Read the image file
        with open(image_path, "rb") as image_file:
            image_data = image_file.read()
        
        # Create the model
        model = genai.GenerativeModel('models/gemini-2.0-flash-lite')
        
        # Create the content parts
        content_parts = [
            self._get_system_prompt(),
            "Analyze this image and extract all relevant payment information. This might be a receipt, invoice, or transportation ticket. Pay special attention to any monetary amounts shown.",
            {"mime_type": "image/jpeg", "data": image_data}
        ]
        
        # Generate content
        response = model.generate_content(content_parts)
        
        return self._process_response(response.text)

    def _with_structured_output(self, analysis_text: str) -> dict:
        """
        Validate and structure the AI response using Pydantic models
        """
        try:
            # Try to parse the JSON response
            json_response = json.loads(analysis_text)
            
            # Determine the document type and validate with appropriate schema
            if json_response.get('is_receipt', False) == False:
                # Not a receipt
                validated_data = NotAReceipt(**json_response)
                return {
                    "success": True,
                    "is_receipt": False,
                    "receipt_data": validated_data.dict()
                }
            elif json_response.get('document_type') == 'transportation_ticket':
                # Transportation ticket - add processing logic
                if 'fare' not in json_response or json_response['fare'] is None:
                    json_response['fare'] = json_response.get('total', 0)
                if 'total' not in json_response or json_response['total'] is None:
                    json_response['total'] = json_response.get('fare', 0)
                
                validated_data = TransportationTicket(**json_response)
                return {
                    "success": True,
                    "is_receipt": True,
                    "is_transportation_ticket": True,
                    "receipt_data": validated_data.dict()
                }
            else:
                # Regular receipt - add processing logic
                if 'items' in json_response and 'line_items' not in json_response:
                    json_response['line_items'] = json_response.pop('items')
                
                # Ensure line items have proper structure and unique, valid UUIDs for id
                seen_ids = set()
                for item in json_response.get('line_items', []):
                    # Validate or assign UUID
                    id_value = item.get('id')
                    try:
                        uuid_obj = uuid.UUID(str(id_value))
                        id_str = str(uuid_obj)
                    except Exception:
                        id_str = str(uuid.uuid4())
                    # Ensure uniqueness
                    while id_str in seen_ids:
                        id_str = str(uuid.uuid4())
                    item['id'] = id_str
                    seen_ids.add(id_str)
                    if 'assignments' not in item:
                        item['assignments'] = []
                
                # Set default values
                json_response.setdefault('tip', 0.0)
                json_response.setdefault('gratuity', 0.0)
                
                # Calculate totals
                items_total = sum(
                    item.get('total_price', 0) or 0 
                    for item in json_response.get('line_items', [])
                )
                json_response.setdefault('items_total', items_total)
                json_response.setdefault('display_subtotal', json_response.get('subtotal', items_total))
                json_response.setdefault('pretax_total', json_response.get('subtotal', items_total))
                
                # Calculate post-tax total
                tax = json_response.get('tax', 0) or 0
                pretax = json_response.get('pretax_total', json_response.get('subtotal', 0)) or 0
                json_response.setdefault('posttax_total', pretax + tax)
                
                # Set final total
                json_response.setdefault('final_total', json_response.get('total', 0) or 0)
                if 'total' not in json_response:
                    json_response['total'] = json_response.get('final_total', 0) or 0
                
                validated_data = RegularReceipt(**json_response)
                return {
                    "success": True,
                    "is_receipt": True,
                    "receipt_data": validated_data.dict()
                }
                
        except json.JSONDecodeError as e:
            # If initial parsing fails, try to extract JSON from the response
            json_match = re.search(r'\{.*\}', analysis_text, re.DOTALL)
            if json_match:
                try:
                    return self._with_structured_output(json_match.group())
                except (json.JSONDecodeError, Exception):
                    pass
            
            return {
                "success": False,
                "error": f"Could not parse structured output: {str(e)}",
                "raw_text": analysis_text
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Schema validation failed: {str(e)}",
                "raw_text": analysis_text
            }

    def _get_system_prompt(self):
        """Get the system prompt for receipt analysis"""
        return """
        You are a financial document analyzer, specializing in receipts, bills, invoices, transportation tickets, and similar payment documents. First, determine if the image contains any payment document (receipt, bill, invoice, ticket, order confirmation, etc.) with pricing information.
        
        If the image is a TRANSPORTATION TICKET (train, bus, flight, etc.):
        Extract this information in JSON format:
        {
          "document_type": "transportation_ticket",
          "is_receipt": true,
          "carrier": "Carrier Name (e.g., Eastern Railway)",
          "ticket_number": "Ticket ID number if visible",
          "date": "Date of travel if available",
          "origin": "Starting location if available",
          "destination": "Ending location if available",
          "passenger": "Passenger name if available",
          "class": "Travel class if available",
          "fare": 20.0,  # The ticket price/fare amount as a number
          "currency": "Currency code if identifiable",
          "taxes": 0.0,  # Any taxes listed separately
          "total": 20.0  # Total amount paid
        }
        
        If the image is NOT any payment document (contains no prices or payment information), respond with just: {"is_receipt": false}
        
        If it IS a REGULAR payment document (receipt, bill, invoice, order, etc.), extract the following information in JSON format:
        1. Store or merchant name
        2. Date of purchase/invoice/order
        3. List of items with:
           - Item name
           - Quantity (if available)
           - Price per item (0 if not present)
           - Total price for the item
           - Id uniquely generated UUID for each item
           - Assignments an empty array to be used for the people who are assigned to the item
        4. Subtotal (before tax)
        5. Tax amount
        6. Tip amount (if present)
        7. Gratuity or service charge (if present, as a separate field from tip)
        8. Total amount
        9. Payment method (if available)
        10. Special fields for different tax handling:
           - tax_included_in_items: (true/false) - Whether tax is already included in item prices
           - display_subtotal: The subtotal shown on document (may or may not include tax)
           - items_total: Sum of all line items (before any tax if tax is not included in items)
           - pretax_total: Total before tax (might be different from items_total if there are discounts)
           - posttax_total: Total after tax is applied (but before tip/gratuity)
           - final_total: The final total including everything (tax, tip, gratuity)

        Format your response as valid JSON like this:
        {
          "is_receipt": true,
          "merchant": "Store Name",
          "date": "YYYY-MM-DD",
          "line_items": [
            {
              "id": "cfe820aa-634e-4c99-8b78-571d5720a04e",
              "name": "Item 1",
              "quantity": 2,
              "price_per_item": 10.99,
              "total_price": 21.98,
              "assignments": []
            },
            ...
          ],
          "subtotal": 45.98,
          "tax": 3.67,
          "tip": 7.50,
          "gratuity": 5.00,
          "total": 62.15,
          "payment_method": "Credit Card",
          "tax_included_in_items": false,
          "display_subtotal": 45.98,
          "items_total": 45.98,
          "pretax_total": 45.98,
          "posttax_total": 49.65,
          "final_total": 62.15
        }
        
        For tips and gratuity:
        - Report "tip" for any discretionary amounts added by the customer
        - Report "gratuity" for any mandatory service charges added by the establishment
        - Pre-calculated tip options with one selected should be under "tip"
        - If no tip is found, set tip to 0.0
        - If no gratuity is found, you can omit that field or set it to 0.0
        
        For tax handling and totals:
        - Set "tax_included_in_items" to true if the document indicates tax is already included in item prices
        - "display_subtotal" should be the subtotal exactly as shown on the document
        - "items_total" should always be the raw sum of line item totals
        - "pretax_total" is the amount before tax is applied (may include discounts)
        - "posttax_total" is the amount after tax but before tip/gratuity
        - "final_total" is the very final amount including everything
        - "total" should be the final total (same as final_total) for backward compatibility
        
        If you can't determine some of these special fields, make your best estimation based on the values you can see.
        The most important thing is to correctly identify if tax is included in items or added separately.
        
        Use null for any other fields that cannot be determined and are not supposed to be numbers. Ensure all numbers are formatted as numbers, not strings.
        Use 0 for amounts that are not present or cannot be determined.
        Note: Use 'line_items' (not 'items') as the key for the list of purchased items.
        Note: For restaurant receipts, the line item can spread across multiple lines. For example Curry Chicken Sandwich with a side of salada can be in two lines because the side of salad was a part of the item itself. You can combine these two into one.
        Please use your best judgement to combine these into one line item.
        """

    def _process_response(self, analysis_text):
        """Process and validate the AI response using structured output"""
        try:
            # Check if response is wrapped in markdown code blocks
            if analysis_text.strip().startswith("```") and "```" in analysis_text:
                parts = analysis_text.split("```", 2)
                if len(parts) >= 3:
                    potential_json = parts[1]
                    if "\n" in potential_json:
                        potential_json = potential_json.split("\n", 1)[1]
                    analysis_text = potential_json.strip()
                else:
                    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', analysis_text)
                    if match:
                        analysis_text = match.group(1).strip()
            
            print(f"JSON response: {analysis_text}")
            
            # Use structured output validation
            return self._with_structured_output(analysis_text)
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error processing response: {str(e)}",
                "raw_text": analysis_text
            }

 