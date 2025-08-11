# Splitzy - React Frontend

This is the React frontend for the Receipt Splitting App, built with React Spectrum. It allows users to upload receipts for analysis, create splitting sessions, and collaborate with friends to divide bills.

## Features

- Modern UI built with React Spectrum
- Receipt upload and analysis
- Bill splitting functionality
- Real-time collaboration
- Session sharing
- Responsive design for mobile and desktop

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Receipt Analysis API backend running

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in `splitzy-frontend`:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

### Building for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Running Tests

This project uses [Vitest](https://vitest.dev/) and [Testing Library](https://testing-library.com/) for unit and component tests.

- Run all tests:
  ```bash
  npm test
  ```
- Run tests in interactive UI mode:
  ```bash
  npm run test:ui
  ```

### Project Structure

```
├── public/                 # Static files
├── src/                    # Source files
│   ├── components/         # React components
│   ├── context/            # React contexts
│   ├── pages/              # Page components
│   ├── services/           # API and other services
│   ├── utils/              # Utility functions
│   ├── App.js              # Main App component
│   └── index.js            # Entry point
├── vite.config.mjs         # Vite configuration
└── package.json            # Dependencies
```

## Integration with Backend API

This frontend connects to the Receipt Analysis API. The main integration points are:

1. **Receipt Analysis**: Sends images to `/api/analyze-receipt` to extract receipt data
2. **Session Management**: Creates and manages bill splitting sessions
3. **User Management**: Handles user authentication and profiles

## Technologies Used

- React
- Vite
- React Spectrum (Adobe's design system)
- React Router
- Axios for API requests
- React Context for state management
- Tailwind CSS
- Vitest & Testing Library for tests 