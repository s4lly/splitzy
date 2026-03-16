import { http, HttpResponse } from 'msw';

const API_URL =
  import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const handlers = [
  // Mock health check endpoint
  http.get(`${API_URL}/health`, () => {
    return HttpResponse.json({
      status: 'healthy',
    });
  }),
];
