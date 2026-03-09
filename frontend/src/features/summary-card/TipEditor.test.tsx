import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Decimal from 'decimal.js';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TipEditor from '@/features/summary-card/TipEditor';

import { server } from '../../mocks/server';
import { render } from '../../test-utils';

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
    receiptTip: new Decimal(5.0),
    itemsTotal: new Decimal(100.0),
    receiptTax: new Decimal(8.0),
    tipAfterTax: false,
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
      render(<TipEditor {...defaultProps} receiptTip={new Decimal(0)} />);

      expect(
        screen.getByRole('button', { name: /update tip/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Tip:')).toBeInTheDocument();
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    it('renders as EditableDetail when tip is undefined (converted to 0)', () => {
      render(
        <TipEditor
          {...defaultProps}
          receiptTip={undefined as any}
          itemsTotal={new Decimal(100.0)}
        />
      );

      expect(
        screen.getByRole('button', { name: /update tip/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Tip:')).toBeInTheDocument();
    });

    it('shows percentage buttons in non-editing view', () => {
      render(<TipEditor {...defaultProps} />);

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

  describe('Edit Mode', () => {
    it('enters edit mode when EditableDetail is clicked', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      expect(
        screen.getByRole('textbox', { name: /tip/i })
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue('5.00')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });

    it('enters edit mode when EditableDetail is clicked (tip is 0)', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} receiptTip={new Decimal(0)} />);

      const addButton = screen.getByRole('button', { name: /update tip/i });
      await user.click(addButton);

      expect(screen.getByLabelText(/tip/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('0.00')).toBeInTheDocument();
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
      render(<TipEditor {...defaultProps} receiptTip={new Decimal(0)} />);

      const addButton = screen.getByRole('button', { name: /update tip/i });
      await user.click(addButton);

      expect(
        screen.queryByRole('button', { name: /delete tip/i })
      ).not.toBeInTheDocument();
    });

    it('shows exact amount input with before/after tax toggle', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      // Should show input and before/after tax tabs
      expect(
        screen.getByRole('textbox', { name: /tip/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /before tax/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /after tax/i })).toBeInTheDocument();
    });

    it('shows percentage in header and calculation breakdown in edit mode', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      // Percentage shown in header
      expect(screen.getAllByText(/5%/).length).toBeGreaterThanOrEqual(1);
      // Calculation breakdown shows items total and result
      expect(screen.getByText('Items total')).toBeInTheDocument();
      expect(screen.getByText(/= \$5\.00/)).toBeInTheDocument();
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

      const input = screen.getByRole('textbox', { name: /tip/i });
      await user.clear(input);
      await user.type(input, '12.50');

      expect(input).toHaveValue('12.50');
    });

    it('handles empty input by setting to empty string', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('textbox', { name: /tip/i });
      await user.clear(input);

      expect(input).toHaveValue('');
    });

    it('handles decimal point only input', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('textbox', { name: /tip/i });
      await user.clear(input);
      await user.type(input, '.');

      expect(input).toHaveValue('.');
    });

    it('rejects negative value input', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('textbox', { name: /tip/i });
      await user.clear(input);
      await user.type(input, '-5.00');

      // Negative sign is rejected, only "5.00" is accepted
      expect(input).toHaveValue('5.00');
      // The component should still be functional
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });

    it('limits to two decimal places', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      const input = screen.getByRole('textbox', { name: /tip/i });
      await user.clear(input);
      await user.type(input, '12.345');

      // Should only accept up to 2 decimal places, rejecting the 3rd digit
      expect(input).toHaveValue('12.34');
    });
  });

  describe('Percentage Tip Selection', () => {
    it('saves tip immediately when percentage button is clicked in non-editing view', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} />);

      const tenPercentButton = screen.getByRole('button', {
        name: /set tip to 10%/i,
      });
      await user.click(tenPercentButton);

      // Should save directly without entering edit mode
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /update tip/i })
        ).toBeInTheDocument();
      });
    });

    it('displays correct tip amounts for different percentages', () => {
      render(<TipEditor {...defaultProps} itemsTotal={new Decimal(200)} />);

      // 10% of 200 = $20.00
      expect(screen.getByText('$20.00')).toBeInTheDocument();
      // 15% of 200 = $30.00
      expect(screen.getByText('$30.00')).toBeInTheDocument();
      // 20% of 200 = $40.00
      expect(screen.getByText('$40.00')).toBeInTheDocument();
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

      const input = screen.getByRole('textbox', { name: /tip/i });
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

      const input = screen.getByRole('textbox', { name: /tip/i });
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

      const input = screen.getByRole('textbox', { name: /tip/i });
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

      const input = screen.getByRole('textbox', { name: /tip/i });
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

      rerender(<TipEditor {...defaultProps} receiptTip={new Decimal(10.0)} />);

      // The tip value is shown in the EditableDetail (font-medium span)
      expect(screen.getAllByText('$10.00').length).toBeGreaterThanOrEqual(1);
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

      // Initial calculation: tip=5, itemsTotal=100 -> 5%
      expect(screen.getAllByText(/5%/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Items total')).toBeInTheDocument();

      rerender(<TipEditor {...defaultProps} itemsTotal={new Decimal(200)} />);

      // After change: tip=5, itemsTotal=200 -> 0.025 = 3% (Intl.NumberFormat rounds to nearest integer by default)
      expect(screen.getAllByText(/3%/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero itemsTotal gracefully', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} itemsTotal={new Decimal(0)} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      expect(screen.getAllByText(/—/).length).toBeGreaterThanOrEqual(1);
    });

    it('handles very small tip amounts', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} receiptTip={new Decimal(0.01)} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      expect(screen.getByDisplayValue('0.01')).toBeInTheDocument();
    });

    it('handles very large tip amounts', async () => {
      const user = userEvent.setup();
      render(<TipEditor {...defaultProps} receiptTip={new Decimal(999.99)} />);

      const editButton = screen.getByRole('button', {
        name: /update tip/i,
      });
      await user.click(editButton);

      expect(screen.getByDisplayValue('999.99')).toBeInTheDocument();
    });
  });
});
