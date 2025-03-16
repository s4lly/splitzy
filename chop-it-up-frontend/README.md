# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)




# Chop it up - React Frontend

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

- Node.js 16+
- npm or yarn
- Receipt Analysis API backend running

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

### Development

Start the development server:

```bash
npm start
```

### Building for Production

```bash
npm run build
```

## Project Structure

```
├── public/                 # Static files
├── src/                    # Source files
│   ├── components/         # React components
│   │   ├── Receipt/        # Receipt-related components
│   │   ├── Session/        # Session-related components
│   │   ├── User/           # User-related components
│   │   └── common/         # Common UI components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── pages/              # Page components
│   ├── services/           # API and other services
│   ├── utils/              # Utility functions
│   ├── App.js              # Main App component
│   └── index.js            # Entry point
└── package.json            # Dependencies
```

## Integration with Backend API

This frontend connects to the Receipt Analysis API. The main integration points are:

1. **Receipt Analysis**: Sends images to `/api/analyze-receipt` to extract receipt data
2. **Session Management**: Creates and manages bill splitting sessions
3. **User Management**: Handles user authentication and profiles

## Technologies Used

- React
- React Spectrum (Adobe's design system)
- React Router
- Axios for API requests
- React Context for state management 