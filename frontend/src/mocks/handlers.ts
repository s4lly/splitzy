import { http, HttpResponse } from 'msw';

const API_URL =
  import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const handlers = [
  // Mock receipt data update endpoint
  http.put(
    `${API_URL}/user/receipts/:receiptId/receipt-data`,
    ({ params, request }) => {
      const { receiptId } = params;
      return request.json().then((data) => {
        return HttpResponse.json({
          success: true,
          message: 'Receipt data updated successfully',
          receipt: {
            id: receiptId,
            receipt_data: data,
          },
        });
      });
    }
  ),

  // Mock receipt fetch endpoint
  http.get(`${API_URL}/user/receipts/:receiptId`, ({ params }) => {
    const { receiptId } = params;
    return HttpResponse.json({
      success: true,
      receipt: {
        id: receiptId,
        receipt_data: {
          merchant: 'Test Store',
          date: '2024-01-01',
          total: 100.0,
          subtotal: 90.0,
          tax: 8.0,
          gratuity: 2.0,
          tip: 0,
          line_items: [],
        },
        created_at: '2024-01-01T00:00:00Z',
      },
    });
  }),

  // Mock health check endpoint
  http.get(`${API_URL}/health`, () => {
    return HttpResponse.json({
      status: 'healthy',
    });
  }),
];
