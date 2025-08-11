# Splitzy

A full-stack application for receipt analysis, expense tracking, and bill splitting among friends.

## Overview

Splitzy is a web application that allows users to upload receipts or bills, analyzes them using AI to extract line items and amounts, and provides an interface to split expenses among friends. The application consists of a Flask backend API that processes receipt images using OpenAI's vision capabilities, and a React frontend that provides a user-friendly interface.

## Features

- **Receipt Analysis**: Upload receipt images and extract structured data including merchant, date, line items, tax, and totals
- **Bill Splitting**: Assign items to different people and calculate how much each person owes
- **User Authentication**: Register and login to save and access your receipts
- **Expense History**: View past receipts and their analyses
- **Responsive Design**: Mobile-friendly interface works on all devices
- **Dark/Light Mode**: Toggle between light and dark themes
- **Tax Distribution**: Automatically distributes tax proportionally based on item assignments

## Project Structure

```
project-root/
├── app.py                  # Flask backend application
├── image_analyzer.py       # Receipt analysis logic using OpenAI
├── requirements.txt        # Python dependencies
├── uploads/                # Directory for uploaded receipt images
└── frontend/               # React frontend application
    ├── src/                # React source code
    ├── public/             # Static assets
    ├── package.json        # Node.js dependencies
    └── tailwind.config.js  # Tailwind CSS configuration
```

## Technology Stack

### Backend
- **Flask**: Python web framework for the API
- **OpenAI API**: AI for receipt image analysis
- **SQLite**: Database for storing user information and receipts
- **Flask-CORS**: Cross-Origin Resource Sharing support

### Frontend
- **React**: JavaScript library for building user interfaces
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **Lucide React**: Icon library
- **Shadcn UI**: UI component library

## Setup Instructions

### Backend Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows, use: venv\Scripts\activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the root directory with the following variables:
   ```
   AZURE_OPENAI_KEY=your_azure_openai_key
   AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
   AZURE_OPENAI_DEPLOYMENT=your_azure_openai_deployment
   SECRET_KEY=your_flask_secret_key
   ```

5. Run the Flask application:
   ```bash
   python app.py
   ```
   The backend will start at http://localhost:5000

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will start at http://localhost:5173

## API Endpoints

### Authentication
- `POST /api/register`: Register a new user
- `POST /api/login`: Login a user
- `POST /api/logout`: Logout the current user
- `GET /api/user`: Get the current user information

### Receipt Management
- `POST /api/analyze-receipt`: Upload and analyze a receipt
- `GET /api/user/receipts`: Get all receipts for the current user
- `GET /api/user/receipts/<receipt_id>`: Get a specific receipt
- `DELETE /api/user/receipts/<receipt_id>`: Delete a specific receipt
- `GET /api/user/receipts/<receipt_id>/image`: Get the image for a specific receipt

### System
- `GET /api/health`: Check if the API is healthy

## Usage

1. Register or login to your account
2. Upload a receipt image from your device
3. The AI will analyze the receipt and extract items and amounts
4. Add the names of people who participated in the expense
5. Assign items to different people
6. View how much each person owes, with tax automatically distributed

## Development

### Running Tests
```bash
# Backend tests
pytest

# Frontend tests
cd frontend
npm test
```

## License

[MIT License](LICENSE)

## Acknowledgements

- OpenAI for the vision API capabilities
- All open-source libraries and frameworks used in this project 