import os
import base64
from dotenv import load_dotenv
import openai
import google.generativeai as genai
import requests
import json
from enum import Enum

# Load environment variables
load_dotenv()

class AIProvider(Enum):
    AZURE = "azure"
    GEMINI = "gemini"

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
           - Price per item
           - Total price for the item
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
              "name": "Item 1",
              "quantity": 2,
              "price_per_item": 10.99,
              "total_price": 21.98
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
        
        Use null for any other fields that cannot be determined. Ensure all numbers are formatted as numbers, not strings.
        Note: Use 'line_items' (not 'items') as the key for the list of purchased items.

        """

    def _process_response(self, analysis_text):
        """Process and validate the AI response"""
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
                    import re
                    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', analysis_text)
                    if match:
                        analysis_text = match.group(1).strip()
            
            print(f"JSON response: {analysis_text}")
            
            receipt_data = json.loads(analysis_text)
            
            # Process the receipt data based on type
            if receipt_data.get('document_type') == 'transportation_ticket':
                return self._process_transportation_ticket(receipt_data)
            else:
                return self._process_regular_receipt(receipt_data)
                
        except json.JSONDecodeError:
            return {
                "success": True,
                "is_receipt": False,
                "error": "Could not parse receipt data",
                "raw_text": analysis_text
            }

    def _process_transportation_ticket(self, receipt_data):
        """Process transportation ticket data"""
        if 'fare' not in receipt_data or receipt_data['fare'] is None:
            receipt_data['fare'] = receipt_data.get('total', 0)
        
        if 'total' not in receipt_data or receipt_data['total'] is None:
            receipt_data['total'] = receipt_data.get('fare', 0)
        
        receipt_data['is_receipt'] = True
        
        return {
            "success": True,
            "is_receipt": True,
            "is_transportation_ticket": True,
            "receipt_data": receipt_data
        }

    def _process_regular_receipt(self, receipt_data):
        """Process regular receipt data"""
        # Handle backward compatibility
        if 'items' in receipt_data and 'line_items' not in receipt_data:
            receipt_data['line_items'] = receipt_data.pop('items')
        
        # Initialize default values
        receipt_data.setdefault('tip', 0.0)
        receipt_data.setdefault('gratuity', 0.0)
        
        # Process totals and tax information
        self._process_totals(receipt_data)
        
        return {
            "success": True,
            "is_receipt": receipt_data.get("is_receipt", False),
            "receipt_data": receipt_data
        }

    def _process_totals(self, receipt_data):
        """Process and validate totals in receipt data"""
        # Calculate items total if not present
        if 'items_total' not in receipt_data:
            items_total = sum(
                item.get('total_price', 0) or 0 
                for item in receipt_data.get('line_items', [])
            )
            receipt_data['items_total'] = items_total
        
        # Set default values for other total fields
        receipt_data.setdefault('display_subtotal', receipt_data.get('subtotal', receipt_data.get('items_total', 0)))
        receipt_data.setdefault('pretax_total', receipt_data.get('subtotal', receipt_data.get('items_total', 0)))
        
        # Calculate post-tax total
        tax = receipt_data.get('tax', 0) or 0
        pretax = receipt_data.get('pretax_total', receipt_data.get('subtotal', 0)) or 0
        receipt_data.setdefault('posttax_total', pretax + tax)
        
        # Set final total
        receipt_data.setdefault('final_total', receipt_data.get('total', 0) or 0)
        if 'total' not in receipt_data:
            receipt_data['total'] = receipt_data.get('final_total', 0) or 0 