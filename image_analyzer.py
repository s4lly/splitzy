import os
import base64
from dotenv import load_dotenv
import openai
import requests
import json

# Load environment variables
load_dotenv()

# Configure OpenAI
openai.api_key = os.getenv("AZURE_OPENAI_KEY")
openai.api_base = os.getenv("AZURE_OPENAI_ENDPOINT")
openai.api_type = "azure"
openai.api_version = "2023-05-15"  # Update if needed

def encode_image(image_path):
    """Encode image to base64 string"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def analyze_image(image_path):
    """
    Analyze a receipt image using Azure OpenAI
    Returns a dictionary with the analysis results
    """
    # Check if image exists
    if not os.path.exists(image_path):
        return {"success": False, "error": "Image not found"}
    
    try:
        # Encode image to base64
        base64_image = encode_image(image_path)
        
        # Prepare the API call
        headers = {
            "Content-Type": "application/json",
            "api-key": os.getenv("AZURE_OPENAI_KEY")
        }
        
        # Prepare the API URL for Azure OpenAI
        deployment_id = os.getenv("AZURE_OPENAI_DEPLOYMENT")
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        url = f"{endpoint}openai/deployments/{deployment_id}/chat/completions?api-version=2023-05-15"
        
        # Prepare the system prompt for receipt analysis
        system_prompt = """
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
        
        # Prepare the payload
        payload = {
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
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
        
        # Make the API call
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        response_data = response.json()
        analysis_text = response_data["choices"][0]["message"]["content"]
        print("Analysis text: ", analysis_text)
        
        # Try to parse the JSON response
        try:
            # Check if response is wrapped in markdown code blocks
            if analysis_text.strip().startswith("```") and "```" in analysis_text:
                # Extract JSON from markdown code block
                print("Detected markdown code block, extracting JSON...")
                # Find content between first ``` and last ```
                parts = analysis_text.split("```", 2)
                if len(parts) >= 3:
                    # Get the content after the first ``` and before the last ```
                    potential_json = parts[1]
                    # Remove language identifier if present (e.g., "json")
                    if "\n" in potential_json:
                        potential_json = potential_json.split("\n", 1)[1]
                    analysis_text = potential_json.strip()
                else:
                    # If we can't split properly, try another approach
                    import re
                    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', analysis_text)
                    if match:
                        analysis_text = match.group(1).strip()
            
            # Add debug print to see exact response
            print(f"JSON response: {analysis_text}")
            
            receipt_data = json.loads(analysis_text)
            
            # Check if it's a transportation ticket
            if receipt_data.get('document_type') == 'transportation_ticket':
                # Ensure we have basic fields
                if 'fare' not in receipt_data or receipt_data['fare'] is None:
                    # Try to extract fare from total if available
                    receipt_data['fare'] = receipt_data.get('total', 0)
                
                if 'total' not in receipt_data or receipt_data['total'] is None:
                    # Use fare as total if total not provided
                    receipt_data['total'] = receipt_data.get('fare', 0)
                
                # Ensure is_receipt is true so frontend can process it
                receipt_data['is_receipt'] = True
                
                return {
                    "success": True,
                    "is_receipt": True,
                    "is_transportation_ticket": True,
                    "receipt_data": receipt_data
                }
            
            # Handle backward compatibility - if response has 'items' instead of 'line_items'
            if 'items' in receipt_data and 'line_items' not in receipt_data:
                receipt_data['line_items'] = receipt_data.pop('items')
            
            # Initialize tip and gratuity with defaults if not present
            if 'tip' not in receipt_data or receipt_data['tip'] is None:
                receipt_data['tip'] = 0.0
                
            # Check for gratuity or service charge
            gratuity_amount = receipt_data.get('gratuity', 0) or receipt_data.get('service_charge', 0) or 0
            # Ensure we have a gratuity field even if it wasn't in the original response
            receipt_data['gratuity'] = gratuity_amount
            
            # Remove service_charge field if it exists to avoid confusion
            if 'service_charge' in receipt_data:
                del receipt_data['service_charge']
            
            # Handle tax scenarios with defaults for new fields if not provided
            if 'tax_included_in_items' not in receipt_data:
                # Try to determine if tax is included in items by checking values
                subtotal = receipt_data.get('subtotal', 0) or 0
                items_total = 0
                for item in receipt_data.get('line_items', []):
                    item_total = item.get('total_price', 0) or 0
                    items_total += item_total
                
                # If there's a significant difference, tax is likely not included in items
                # Allow for small rounding errors
                tax_likely_included = abs(items_total - subtotal) < 0.1
                receipt_data['tax_included_in_items'] = tax_likely_included
            
            # Initialize the various total fields with reasonable values if not provided
            if 'items_total' not in receipt_data:
                items_total = 0
                for item in receipt_data.get('line_items', []):
                    item_total = item.get('total_price', 0) or 0
                    items_total += item_total
                receipt_data['items_total'] = items_total
            
            if 'display_subtotal' not in receipt_data:
                receipt_data['display_subtotal'] = receipt_data.get('subtotal', receipt_data.get('items_total', 0))
            
            if 'pretax_total' not in receipt_data:
                receipt_data['pretax_total'] = receipt_data.get('subtotal', receipt_data.get('items_total', 0))
            
            if 'posttax_total' not in receipt_data:
                tax = receipt_data.get('tax', 0) or 0
                pretax = receipt_data.get('pretax_total', receipt_data.get('subtotal', 0)) or 0
                receipt_data['posttax_total'] = pretax + tax
            
            if 'final_total' not in receipt_data:
                receipt_data['final_total'] = receipt_data.get('total', 0) or 0
            elif 'total' not in receipt_data:
                receipt_data['total'] = receipt_data.get('final_total', 0) or 0
                
            return {
                "success": True,
                "is_receipt": receipt_data.get("is_receipt", False),
                "receipt_data": receipt_data
            }
        except json.JSONDecodeError:
            # If we can't parse JSON, return the raw text
            return {
                "success": True,
                "is_receipt": False,
                "error": "Could not parse receipt data",
                "raw_text": analysis_text
            }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        } 