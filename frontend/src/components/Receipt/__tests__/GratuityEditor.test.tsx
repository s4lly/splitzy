import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../test-utils';
import GratuityEditor from '../GratuityEditor';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

// Mock the format-currency utility
vi.mock('../utils/format-currency', () => ({
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
}));

describe('GratuityEditor', () => {
  const defaultProps = {
    receiptId: 'test-receipt-123',
    receiptGratuity: 5.0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders as ClickableRow when gratuity has value', () => {
      render(<GratuityEditor {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /edit gratuity: \$5\.00/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Gratuity:')).toBeInTheDocument();
      expect(screen.getByText('$5.00')).toBeInTheDocument();
    });

    it('renders as AddableRow when gratuity is 0', () => {
      render(<GratuityEditor {...defaultProps} receiptGratuity={0} />);

      expect(
        screen.getByRole('button', { name: /add gratuity/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Gratuity:')).toBeInTheDocument();
    });

    it('renders as AddableRow when gratuity is undefined', () => {
      render(
        <GratuityEditor {...defaultProps} receiptGratuity={undefined as any} />
      );

      expect(
        screen.getByRole('button', { name: /add gratuity/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Gratuity:')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('enters edit mode when ClickableRow is clicked', async () => {
      const user = userEvent.setup();
      render(<GratuityEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /edit gratuity: \$5\.00/i,
      });
      await user.click(editButton);

      expect(
        screen.getByRole('spinbutton', { name: /gratuity/i })
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue('5.00')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });

    it('enters edit mode when AddableRow is clicked', async () => {
      const user = userEvent.setup();
      render(<GratuityEditor {...defaultProps} receiptGratuity={0} />);

      const addButton = screen.getByRole('button', { name: /add gratuity/i });
      await user.click(addButton);

      expect(screen.getByLabelText(/gratuity/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('0.00')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });

    it('shows delete button when gratuity has value', async () => {
      const user = userEvent.setup();
      render(<GratuityEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /edit gratuity: \$5\.00/i,
      });
      await user.click(editButton);

      expect(
        screen.getByRole('button', { name: /delete gratuity/i })
      ).toBeInTheDocument();
    });

    it('does not show delete button when gratuity is 0', async () => {
      const user = userEvent.setup();
      render(<GratuityEditor {...defaultProps} receiptGratuity={0} />);

      const addButton = screen.getByRole('button', { name: /add gratuity/i });
      await user.click(addButton);

      expect(
        screen.queryByRole('button', { name: /delete gratuity/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    it('accepts valid decimal input', async () => {
      const user = userEvent.setup();
      render(<GratuityEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /edit gratuity: \$5\.00/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /gratuity/i });
      await user.clear(input);
      await user.type(input, '12.50');

      expect(input).toHaveValue(12.5);
    });

    it('rejects invalid input patterns', async () => {
      const user = userEvent.setup();
      render(<GratuityEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /edit gratuity: \$5\.00/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /gratuity/i });
      await user.clear(input);
      await user.type(input, '12.345'); // More than 2 decimal places

      // Should not accept more than 2 decimal places
      expect(input).not.toHaveValue('12.345');
    });

    it('handles empty input', async () => {
      const user = userEvent.setup();
      render(<GratuityEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /edit gratuity: \$5\.00/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /gratuity/i });
      await user.clear(input);

      expect(input).toHaveValue(null);
    });

    it('prevents negative values', async () => {
      const user = userEvent.setup();
      render(<GratuityEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /edit gratuity: \$5\.00/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /gratuity/i });
      await user.clear(input);
      await user.type(input, '-5.00');

      // Should convert negative to 0
      expect(input).toHaveValue(0);
    });
  });

  describe('Save Functionality', () => {
    it('saves gratuity when value changes', async () => {
      const user = userEvent.setup();
      render(<GratuityEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /edit gratuity: \$5\.00/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /gratuity/i });
      await user.clear(input);
      await user.type(input, '10.00');

      const saveButton = screen.getByRole('button', { name: /done/i });
      await user.click(saveButton);

      // The component should exit edit mode after successful save
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /edit gratuity: \$5\.00/i })
        ).toBeInTheDocument();
      });
    });

    it('does not save when value is unchanged', async () => {
      const user = userEvent.setup();
      render(<GratuityEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /edit gratuity: \$5\.00/i,
      });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /done/i });
      await user.click(saveButton);

      // Should exit edit mode without making API call
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /edit gratuity: \$5\.00/i })
        ).toBeInTheDocument();
      });
    });

    it('handles save errors gracefully', async () => {
      // Mock API error
      server.use(
        http.put('*/user/receipts/*/receipt-data', () => {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        })
      );

      const user = userEvent.setup();
      render(<GratuityEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /edit gratuity: \$5\.00/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /gratuity/i });
      await user.clear(input);
      await user.type(input, '10.00');

      const saveButton = screen.getByRole('button', { name: /done/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/request failed with status code 500/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('cancels edit and reverts to original value', async () => {
      const user = userEvent.setup();
      render(<GratuityEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /edit gratuity: \$5\.00/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /gratuity/i });
      await user.clear(input);
      await user.type(input, '10.00');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /edit gratuity: \$5\.00/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe('Delete Functionality', () => {
    it('deletes gratuity when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<GratuityEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /edit gratuity: \$5\.00/i,
      });
      await user.click(editButton);

      const deleteButton = screen.getByRole('button', {
        name: /delete gratuity/i,
      });
      await user.click(deleteButton);

      // The component should exit edit mode after successful delete
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /edit gratuity: \$5\.00/i })
        ).toBeInTheDocument();
      });
    });

    it('handles delete errors gracefully', async () => {
      // Mock API error
      server.use(
        http.put('*/user/receipts/*/receipt-data', () => {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        })
      );

      const user = userEvent.setup();
      render(<GratuityEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /edit gratuity: \$5\.00/i,
      });
      await user.click(editButton);

      const deleteButton = screen.getByRole('button', {
        name: /delete gratuity/i,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(
          screen.getByText(/request failed with status code 500/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('disables buttons during save operation', async () => {
      // Mock slow API response
      server.use(
        http.put('*/user/receipts/*/receipt-data', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({ success: true });
        })
      );

      const user = userEvent.setup();
      render(<GratuityEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /edit gratuity: \$5\.00/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /gratuity/i });
      await user.clear(input);
      await user.type(input, '10.00');

      const saveButton = screen.getByRole('button', { name: /done/i });
      await user.click(saveButton);

      // Buttons should be disabled during loading
      expect(saveButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      expect(input).toBeDisabled();
    });

    it('disables buttons during delete operation', async () => {
      // Mock slow API response
      server.use(
        http.put('*/user/receipts/*/receipt-data', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({ success: true });
        })
      );

      const user = userEvent.setup();
      render(<GratuityEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /edit gratuity: \$5\.00/i,
      });
      await user.click(editButton);

      const deleteButton = screen.getByRole('button', {
        name: /delete gratuity/i,
      });
      await user.click(deleteButton);

      // Buttons should be disabled during loading
      expect(deleteButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /done/i })).toBeDisabled();
    });
  });

  describe('Props Updates', () => {
    it('updates when receiptGratuity prop changes', () => {
      const { rerender } = render(<GratuityEditor {...defaultProps} />);

      expect(screen.getByText('$5.00')).toBeInTheDocument();

      rerender(<GratuityEditor {...defaultProps} receiptGratuity={10.0} />);

      expect(screen.getByText('$10.00')).toBeInTheDocument();
    });

    it('handles undefined receiptGratuity prop', () => {
      render(
        <GratuityEditor {...defaultProps} receiptGratuity={undefined as any} />
      );

      // When gratuity is undefined, it should show as AddableRow, not display $0.00
      expect(
        screen.getByRole('button', { name: /add gratuity/i })
      ).toBeInTheDocument();
    });
  });
});
