import json
import logging
import os
import re
from pathlib import Path

import google.generativeai as genai
from dotenv import load_dotenv

from schemas.receipt import (
    FieldMetadata,
    NotAReceipt,
    ReceiptFieldsMetadata,
    RegularReceipt,
    TransportationTicket,
)


# Set up module-level logger
logger = logging.getLogger(__name__)


class ImageAnalysisError(Exception):
    """Domain-specific exception for image analysis failures"""

    pass


class ImageAnalyzerConfigError(Exception):
    """Exception raised when ImageAnalyzer configuration is invalid"""

    pass


# Load environment variables from backend .env file
backend_dir = Path(__file__).resolve().parent
env_path = backend_dir / ".env"
load_dotenv(env_path)

# Module-level flag to track if configuration has been done
_configured = False


def configure_image_analyzer():
    """
    Configure the image analyzer with Google API key.
    Must be called before using ImageAnalyzer.

    Raises:
        ImageAnalyzerConfigError: If API key is missing or invalid
    """
    global _configured

    if _configured:
        return  # Already configured

    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        logger.error("GOOGLE_API_KEY environment variable is missing or empty")
        raise ImageAnalyzerConfigError(
            "GOOGLE_API_KEY environment variable is required but not found"
        )

    try:
        logger.info("Configuring Google Generative AI with provided API key")
        genai.configure(api_key=google_api_key)
        _configured = True
    except Exception as e:
        logger.error(f"Failed to configure Google Generative AI: {str(e)}")
        raise ImageAnalyzerConfigError(
            f"Failed to configure Google Generative AI: {str(e)}"
        ) from e


class ImageAnalyzer:
    def __init__(self):
        """Initialize ImageAnalyzer and ensure it's configured."""
        if not _configured:
            configure_image_analyzer()

    def analyze_image(self, image_data_or_path):
        """
        Analyze a receipt image using Google Gemini
        Args:
            image_data_or_path: Either binary image data (bytes) or file path (str)
        Returns a Pydantic model (RegularReceipt, TransportationTicket, or NotAReceipt)
        Raises:
            ImageAnalysisError: When image analysis fails
        """
        try:
            return self._analyze_image_with_gemini(image_data_or_path)
        except (FileNotFoundError, json.JSONDecodeError, ValueError) as e:
            # Handle expected exceptions with specific error messages
            logger.error(f"Image analysis failed: {str(e)}")
            raise ImageAnalysisError(f"Analysis failed: {str(e)}") from e
        except Exception as e:
            # Handle unexpected exceptions
            logger.error(f"Unexpected error during image analysis: {str(e)}")
            raise ImageAnalysisError(
                f"Analysis failed due to unexpected error: {str(e)}"
            ) from e

    def _analyze_image_with_gemini(self, image_data_or_path):
        """Analyze image using Google Gemini"""
        # Handle both binary data and file path
        if isinstance(image_data_or_path, bytes):
            image_data = image_data_or_path
        else:
            # It's a file path
            if not os.path.exists(image_data_or_path):
                raise FileNotFoundError("Image not found")
            with open(image_data_or_path, "rb") as image_file:
                image_data = image_file.read()

        # Create the model
        model = genai.GenerativeModel("models/gemini-2.5-flash-lite")

        # Create the content parts
        content_parts = [
            self._get_system_prompt(),
            "Analyze this image and extract all relevant payment information. This might be a receipt, invoice, or transportation ticket. Pay special attention to any monetary amounts shown.",
            {"mime_type": "image/jpeg", "data": image_data},
        ]

        # Generate content
        response = model.generate_content(content_parts)

        return self._process_response(response.text)

    def _with_structured_output(self, analysis_text: str):
        """
        Validate and structure the AI response using Pydantic models
        Returns a Pydantic model (RegularReceipt, TransportationTicket, or NotAReceipt)
        """
        try:
            # Try to parse the JSON response
            json_response = json.loads(analysis_text)

            # Determine the document type and validate with appropriate schema
            if json_response.get("is_receipt", False) == False:
                # Not a receipt
                return NotAReceipt(**json_response)
            elif json_response.get("document_type") == "transportation_ticket":
                # Transportation ticket - add processing logic
                if "fare" not in json_response or json_response["fare"] is None:
                    json_response["fare"] = json_response.get("total", 0)
                if "total" not in json_response or json_response["total"] is None:
                    json_response["total"] = json_response.get("fare", 0)

                self._wrap_fields_metadata(json_response)
                return TransportationTicket(**json_response)
            else:
                # Regular receipt - add processing logic
                if "items" in json_response and "line_items" not in json_response:
                    json_response["line_items"] = json_response.pop("items")

                # Clean up line items to ensure required fields are never None
                cleaned_line_items = []
                for idx, item in enumerate(json_response.get("line_items", [])):
                    cleaned_item = item.copy()

                    # Handle name field (required, no default in schema)
                    if cleaned_item.get("name") is None:
                        cleaned_item["name"] = f"Item {idx}"
                        logger.warning(
                            f"Line item at index {idx} has None name, defaulting to 'Item {idx}'"
                        )

                    item_name = cleaned_item.get("name", f"Item {idx}")

                    # Handle quantity field (default is 1.0 in schema)
                    if cleaned_item.get("quantity") is None:
                        logger.warning(
                            f"Line item '{item_name}' has None quantity, defaulting to 1.0"
                        )
                        cleaned_item["quantity"] = 1.0

                    # Convert None values to 0.00 for price fields
                    if cleaned_item.get("price_per_item") is None:
                        logger.warning(
                            f"Line item '{item_name}' has None price_per_item, defaulting to 0.00"
                        )
                        cleaned_item["price_per_item"] = 0.00
                    if cleaned_item.get("total_price") is None:
                        logger.warning(
                            f"Line item '{item_name}' has None total_price, defaulting to 0.00"
                        )
                        cleaned_item["total_price"] = 0.00

                    cleaned_line_items.append(cleaned_item)
                json_response["line_items"] = cleaned_line_items

                self._wrap_fields_metadata(json_response)

                # Calculate totals
                items_total = sum(
                    item.get("total_price", 0) or 0
                    for item in json_response.get("line_items", [])
                )

                # Set calculated values (these override defaults)
                json_response["items_total"] = items_total
                json_response["display_subtotal"] = json_response.get(
                    "subtotal", items_total
                )
                json_response["pretax_total"] = json_response.get(
                    "subtotal", items_total
                )

                # Calculate post-tax total
                tax = json_response.get("tax", 0) or 0
                pretax = (
                    json_response.get("pretax_total", json_response.get("subtotal", 0))
                    or 0
                )
                json_response["posttax_total"] = pretax + tax

                # Set final total
                json_response["final_total"] = json_response.get("total", 0) or 0
                if "total" not in json_response:
                    json_response["total"] = json_response.get("final_total", 0) or 0

                return RegularReceipt(**json_response)

        except json.JSONDecodeError as e:
            # If initial parsing fails, try to extract JSON from the response
            json_match = re.search(r"\{.*\}", analysis_text, re.DOTALL)
            if json_match:
                try:
                    return self._with_structured_output(json_match.group())
                except (json.JSONDecodeError, Exception):
                    pass

            raise ImageAnalysisError(
                f"Could not parse structured output: {str(e)}"
            ) from e
        except Exception as e:
            raise ImageAnalysisError(f"Schema validation failed: {str(e)}") from e

    def _wrap_fields_metadata(self, json_response: dict) -> None:
        """
        Convert a raw fields_metadata list from the Gemini response into the
        nested ReceiptFieldsMetadata shape that Pydantic expects.
        Mutates json_response in place. Silently clears the key on any parse
        error so that core receipt extraction is never blocked by metadata issues.
        """
        raw = json_response.get("fields_metadata")
        if not raw:
            json_response.pop("fields_metadata", None)
            return
        if isinstance(raw, list):
            json_response["fields_metadata"] = {"fields": raw}
        elif isinstance(raw, dict):
            if isinstance(raw.get("fields"), list):
                pass  # already the expected shape
            else:
                logger.warning(
                    "fields_metadata is a dict without a 'fields' list; wrapping as single element"
                )
                json_response["fields_metadata"] = {"fields": [raw]}
        else:
            logger.warning("fields_metadata has an unrecognised shape; ignoring metadata")
            json_response.pop("fields_metadata", None)
            return
        valid_fields = []
        for entry in json_response["fields_metadata"]["fields"]:
            try:
                FieldMetadata.model_validate(entry)
                valid_fields.append(entry)
            except Exception as e:
                logger.warning("Dropping invalid fields_metadata entry: %s — %s", entry, e)
        if valid_fields:
            json_response["fields_metadata"] = {"fields": valid_fields}
        else:
            logger.warning("No valid fields_metadata entries; ignoring metadata")
            json_response.pop("fields_metadata", None)

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
              "total_price": 21.98,
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

        BOUNDING BOX AND PII DETECTION:
        For every field you extract, also provide its pixel-level bounding box on the image and whether it contains personally identifiable information (PII).

        Add a "fields_metadata" array at the top level of your JSON response (alongside all the other fields). Each entry in the array has:
        - "field_name": The field path using dot notation.
          - Top-level fields use the field name directly: "merchant", "date", "subtotal", "tax", "tip", "gratuity", "total", "payment_method"
          - Line item sub-fields: "line_items.<index>.<field>" (e.g. "line_items.0.name", "line_items.0.quantity", "line_items.0.price_per_item", "line_items.0.total_price", "line_items.1.name", etc.)
          - Transportation ticket fields: "carrier", "ticket_number", "origin", "destination", "passenger", "fare", "currency"
          - For PII detected on the document that does NOT map to any standard extracted field, use a descriptive name such as "cardholder_name", "card_number_partial", "server_name", "cashier_name", "phone_number", "email", "address", "loyalty_number", "membership_id"
        - "bbox": An object with "x", "y", "width", "height" in pixels representing the bounding box of that field's text on the image. The origin (0, 0) is the top-left corner of the image. Provide your best estimate — exact pixel-perfect accuracy is not required.
        - "is_pii": Boolean. true if the field contains personally identifiable information, false otherwise.
        - "pii_category": If is_pii is true, exactly one of the following strings: "payment_card_details", "personal_names", "contact_info", "account_identifiers". Set to null if is_pii is false.

        PII category definitions — use these to classify PII fields:
        - "payment_card_details": Full or partial credit/debit card numbers, cardholder name when shown on a card line, card expiry dates, CVV/security codes
        - "personal_names": Customer names, passenger names, server names, cashier names, or any other named individual visible on the document
        - "contact_info": Phone numbers, email addresses, physical street addresses (merchant address or customer address)
        - "account_identifiers": Loyalty program numbers, rewards membership IDs, frequent flyer numbers, order IDs, confirmation numbers, ticket numbers, account numbers

        Rules for fields_metadata:
        1. Include an entry for EVERY standard field you extract (e.g. merchant, date, each line item sub-field, subtotal, tax, total, payment_method, etc.) — even fields that are not PII.
        2. Also include entries for any additional PII you detect on the document that falls outside the standard extracted fields (e.g. a cardholder name printed near the payment section, a phone number in the merchant header, a loyalty card number).
        3. If a field is not visible or was not present on the document, omit it from fields_metadata rather than guessing a location.
        4. For line items, provide separate metadata entries for name, quantity, price_per_item, and total_price of each item — they may appear in different columns.

        Example fields_metadata for a regular receipt:
        "fields_metadata": [
          {"field_name": "merchant", "bbox": {"x": 100, "y": 20, "width": 220, "height": 28}, "is_pii": false, "pii_category": null},
          {"field_name": "date", "bbox": {"x": 50, "y": 60, "width": 140, "height": 20}, "is_pii": false, "pii_category": null},
          {"field_name": "line_items.0.name", "bbox": {"x": 40, "y": 110, "width": 180, "height": 20}, "is_pii": false, "pii_category": null},
          {"field_name": "line_items.0.quantity", "bbox": {"x": 230, "y": 110, "width": 30, "height": 20}, "is_pii": false, "pii_category": null},
          {"field_name": "line_items.0.price_per_item", "bbox": {"x": 270, "y": 110, "width": 50, "height": 20}, "is_pii": false, "pii_category": null},
          {"field_name": "line_items.0.total_price", "bbox": {"x": 330, "y": 110, "width": 55, "height": 20}, "is_pii": false, "pii_category": null},
          {"field_name": "subtotal", "bbox": {"x": 280, "y": 300, "width": 60, "height": 20}, "is_pii": false, "pii_category": null},
          {"field_name": "tax", "bbox": {"x": 280, "y": 325, "width": 60, "height": 20}, "is_pii": false, "pii_category": null},
          {"field_name": "total", "bbox": {"x": 280, "y": 355, "width": 60, "height": 20}, "is_pii": false, "pii_category": null},
          {"field_name": "payment_method", "bbox": {"x": 40, "y": 390, "width": 200, "height": 20}, "is_pii": false, "pii_category": null},
          {"field_name": "card_number_partial", "bbox": {"x": 40, "y": 415, "width": 130, "height": 20}, "is_pii": true, "pii_category": "payment_card_details"},
          {"field_name": "server_name", "bbox": {"x": 40, "y": 440, "width": 120, "height": 18}, "is_pii": true, "pii_category": "personal_names"}
        ]
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
                    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", analysis_text)
                    if match:
                        analysis_text = match.group(1).strip()

            # Use structured output validation
            return self._with_structured_output(analysis_text)

        except Exception as e:
            logger.error(f"Error processing response: {str(e)}")
            raise ImageAnalysisError(f"Error processing response: {str(e)}") from e
