import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import TipEditor from '@/features/summary-card/TipEditor';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

// Mock the format-currency utility
vi.mock('@/components/Receipt/utils/format-currency', () => ({
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  truncateFloatByNDecimals: (val: number, n: number) => {
    return Math.trunc(val * 10 ** n) / 10 ** n;
  },
  truncateToTwoDecimals: (val: number) => {
    const str = val.toString();
    if (str.includes('.')) {
      const [intPart, decPart] = str.split('.');
      return intPart + '.' + (decPart + '00').slice(0, 2);
    } else {
      return str + '.00';
    }
  },
}));

describe('TipEditor', () => {
  const defaultProps = {
    receiptId: 'test-receipt-123',
    receiptTip: 5.0,
    itemsTotal: 100.0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders as EditableDetail when tip has value', () => {
      render(<TipEditor {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /update tip/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Tip:')).toBeInTheDocument();
      expect(screen.getByText('$5.00')).toBeInTheDocument();
    });

    it('renders as EditableDetail when tip is 0', () => {
      render(<TipEditor {...defaultProps} receiptTip={0} />);

      expect(
        screen.getByRole('button', { name: /update tip/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Tip:')).toBeInTheDocument();
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    it('renders as EditableDetail when tip is undefined (converted to 0)', () => {
      render(<TipEditor {...defaultProps} receiptTip={undefined as any} />);

      expect(
        screen.getByRole('button', { name: /update tip/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Tip:')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('enters edit mode when EditableDetail is clicked', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      expect(
        screen.getByRole('spinbutton', { name: /tip/i })
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });

    it('enters edit mode when EditableDetail is clicked (tip is 0)', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} receiptTip={0} />);

      const addButton = screen.getByRole('button', { name: /update tip/i });
      await user.click(addButton);

      expect(screen.getByLabelText(/tip/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('0')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });

    it('shows delete button when tip has value', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      expect(
        screen.getByRole('button', { name: /delete tip/i })
      ).toBeInTheDocument();
    });

    it('does not show delete button when tip is 0', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} receiptTip={0} />);

      const addButton = screen.getByRole('button', { name: /update tip/i });
      await user.click(addButton);

      expect(
        screen.queryByRole('button', { name: /delete tip/i })
      ).not.toBeInTheDocument();
    });

    it('shows tabs for exact and percentage input', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      expect(screen.getByRole('tab', { name: /exact/i })).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /percentage/i })
      ).toBeInTheDocument();
    });

    it('shows percentage calculation in exact tab', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      expect(screen.getByText(/percentage of total/)).toBeInTheDocument();
      expect(screen.getByText(/5%/)).toBeInTheDocument();
    });

    it('shows percentage tip buttons in percentage tab', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const percentageTab = screen.getByRole('tab', { name: /percentage/i });
      await user.click(percentageTab);

      expect(
        screen.getByRole('button', { name: /set tip to 10%/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /set tip to 15%/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /set tip to 20%/i })
      ).toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    it('accepts valid decimal input', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /tip/i });
      await user.clear(input);
      await user.type(input, '12.50');

      expect(input).toHaveValue(12.5);
    });

    it('handles empty input by setting to 0', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /tip/i });
      await user.clear(input);

      expect(input).toHaveValue(0);
    });

    it('handles decimal point only input by setting to 0', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /tip/i });
      await user.clear(input);
      await user.type(input, '.');

      expect(input).toHaveValue(0);
    });

    it('handles negative value input gracefully', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /tip/i });
      await user.clear(input);
      await user.type(input, '-5.00');

      // The component should still be functional and not crash
      expect(
        screen.getByRole('spinbutton', { name: /tip/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });

    it('rounds to two decimal places', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /tip/i });
      await user.clear(input);
      await user.type(input, '12.345');

      // Should round to 2 decimal places
      expect(input).toHaveValue(12.35);
    });
  });

  describe('Percentage Tip Selection', () => {
    it('sets tip amount when percentage button is clicked', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const percentageTab = screen.getByRole('tab', { name: /percentage/i });
      await user.click(percentageTab);

      const tenPercentButton = screen.getByRole('button', {
        name: /set tip to 10%/i,
      });
      await user.click(tenPercentButton);

      // Switch back to exact tab to see the value
      const exactTab = screen.getByRole('tab', { name: /exact/i });
      await user.click(exactTab);

      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    it('calculates correct tip amounts for different percentages', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} itemsTotal={200} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const percentageTab = screen.getByRole('tab', { name: /percentage/i });
      await user.click(percentageTab);

      // Test 10% of 200 = 20
      const tenPercentButton = screen.getByRole('button', {
        name: /set tip to 10%/i,
      });
      await user.click(tenPercentButton);

      const exactTab = screen.getByRole('tab', { name: /exact/i });
      await user.click(exactTab);

      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('saves tip when value changes', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /tip/i });
      await user.clear(input);
      await user.type(input, '10.00');

      const saveButton = screen.getByRole('button', { name: /done/i });
      await user.click(saveButton);

      // The component should exit edit mode after successful save
      await waitFor(() => {
        // The component should exit edit mode and show the original value
        // (until parent re-renders with updated props)
        expect(
          screen.getByRole('button', { name: /update tip/i })
        ).toBeInTheDocument();
      });
    });

    it('does not save when value is unchanged', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /done/i });
      await user.click(saveButton);

      // Should exit edit mode without making API call
      await waitFor(() => {
        // The component should exit edit mode and show the original value
        // (until parent re-renders with updated props)
        expect(
          screen.getByRole('button', { name: /update tip/i })
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
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /tip/i });
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
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /tip/i });
      await user.clear(input);
      await user.type(input, '10.00');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        // The component should exit edit mode and show the original value
        // (cancel reverts to the prop value, not the edited value)
        expect(
          screen.getByRole('button', { name: /update tip/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe('Delete Functionality', () => {
    it('deletes tip when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const deleteButton = screen.getByRole('button', {
        name: /delete tip/i,
      });
      await user.click(deleteButton);

      // The component should exit edit mode after successful delete
      await waitFor(() => {
        // The component should exit edit mode and show the original value
        // (until parent re-renders with updated props after delete)
        expect(
          screen.getByRole('button', { name: /update tip/i })
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
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const deleteButton = screen.getByRole('button', {
        name: /delete tip/i,
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
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('spinbutton', { name: /tip/i });
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
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const deleteButton = screen.getByRole('button', {
        name: /delete tip/i,
      });
      await user.click(deleteButton);

      // Buttons should be disabled during loading
      expect(deleteButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /done/i })).toBeDisabled();
    });
  });

  describe('Props Updates', () => {
    it('updates when receiptTip prop changes', () => {
      const { rerender } = render(<TipEditor {...defaultProps} />);

      expect(screen.getByText('$5.00')).toBeInTheDocument();

      rerender(<TipEditor {...defaultProps} receiptTip={10.0} />);

      expect(screen.getByText('$10.00')).toBeInTheDocument();
    });

    it('handles undefined receiptTip prop', () => {
      render(<TipEditor {...defaultProps} receiptTip={undefined as any} />);

      // When tip is undefined, it gets converted to 0, so it shows as EditableDetail with $0.00
      expect(
        screen.getByRole('button', { name: /update tip/i })
      ).toBeInTheDocument();
    });

    it('updates percentage calculation when itemsTotal changes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<TipEditor {...defaultProps} />);

      // Enter edit mode to see the percentage calculation
      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      // Initial calculation should be 5% of 100 = 5%
      expect(screen.getByText(/percentage of total/)).toBeInTheDocument();
      expect(screen.getByText(/5%/)).toBeInTheDocument();

      rerender(<TipEditor {...defaultProps} itemsTotal={200} />);

      // After change should be 5% of 200 = 2.5%
      expect(screen.getByText(/percentage of total/)).toBeInTheDocument();
      expect(screen.getByText(/2\.5%/)).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches between exact and percentage tabs', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      // Should start on exact tab
      expect(
        screen.getByRole('spinbutton', { name: /tip/i })
      ).toBeInTheDocument();

      // Switch to percentage tab
      const percentageTab = screen.getByRole('tab', { name: /percentage/i });
      await user.click(percentageTab);

      expect(
        screen.queryByRole('spinbutton', { name: /tip/i })
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /set tip to 10%/i })
      ).toBeInTheDocument();

      // Switch back to exact tab
      const exactTab = screen.getByRole('tab', { name: /exact/i });
      await user.click(exactTab);

      expect(
        screen.getByRole('spinbutton', { name: /tip/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /set tip to 10%/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero itemsTotal gracefully', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} itemsTotal={0} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      expect(screen.getByText(/percentage of total/)).toBeInTheDocument();
      expect(screen.getByText(/—/)).toBeInTheDocument();
    });

    it('handles very small tip amounts', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} receiptTip={0.01} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      expect(screen.getByDisplayValue('0.01')).toBeInTheDocument();
    });

    it('handles very large tip amounts', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} receiptTip={999.99} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      expect(screen.getByDisplayValue('999.99')).toBeInTheDocument();
    });
  });
});

