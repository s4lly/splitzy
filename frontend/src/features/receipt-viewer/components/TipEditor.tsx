import Decimal from 'decimal.js';
import { useCallback, useRef, useState } from 'react';

import TipDisplay from '@/features/receipt-viewer/components/TipDisplay';
import TipEditForm from '@/features/receipt-viewer/components/TipEditForm';
import { useReceiptMutation } from '@/features/receipt-viewer/hooks/useReceiptMutation';

interface TipEditorProps {
  receiptTip: Decimal;
  originalTip: Decimal | null;
  itemsTotal: Decimal;
  receiptTax: Decimal;
  tipAfterTax: boolean;
  receiptId: number;
  onTipPreview?: (tip: Decimal | null) => void;
}

/**
 * TipEditor component that allows editing and saving tip values.
 * Performs mutations using Zero mutators.
 */
const TipEditor = ({
  receiptTip = new Decimal(0),
  originalTip,
  itemsTotal,
  receiptTax,
  tipAfterTax: propTipAfterTax,
  receiptId,
  onTipPreview,
}: TipEditorProps) => {
  // `tip`, `inputValue` and `tipAfterTax` are editable drafts seeded from props
  // — this is a controlled editor with an explicit save action, so initializing
  // local state from the prop is intentional (not accidental derived state).
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [tip, setTip] = useState<Decimal>(receiptTip);
  const [inputValue, setInputValue] = useState(() => receiptTip.toFixed(2));
  const [isEditing, setIsEditing] = useState(false);
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [tipAfterTax, setTipAfterTax] = useState(propTipAfterTax);

  const focusInputOnMount = useCallback((node: HTMLInputElement | null) => {
    node?.focus();
    node?.select();
  }, []);

  const hasValueToDelete = !receiptTip.isZero();

  const tipBase = tipAfterTax ? itemsTotal.plus(receiptTax) : itemsTotal;

  const isOriginalTip =
    originalTip != null && receiptTip.eq(originalTip) && !receiptTip.isZero();

  const activePercentage = tipBase.gt(0)
    ? (() => {
        const ratio = receiptTip.div(tipBase).toNumber();
        for (const pct of [10, 15, 20]) {
          if (Math.abs(ratio - pct / 100) < 0.005) return pct;
        }
        return null;
      })()
    : null;

  const { mutate, isSaving } = useReceiptMutation({
    onSuccess: () => {
      setIsEditing(false);
      onTipPreview?.(null);
    },
  });

  // Sync the editable drafts when the corresponding props change, adjusting
  // state during render instead of in effects (avoids a stale intermediate
  // render). Focus-on-edit is handled by the `focusInputOnMount` ref callback.
  const prevReceiptTipRef = useRef(receiptTip);
  if (!receiptTip.equals(prevReceiptTipRef.current)) {
    prevReceiptTipRef.current = receiptTip;
    setTip(receiptTip);
    setInputValue(receiptTip.toFixed(2));
  }

  const prevPropTipAfterTaxRef = useRef(propTipAfterTax);
  if (propTipAfterTax !== prevPropTipAfterTaxRef.current) {
    prevPropTipAfterTaxRef.current = propTipAfterTax;
    setTipAfterTax(propTipAfterTax);
  }

  const setTipAndInput = (value: Decimal) => {
    setTip(value);
    setInputValue(value.toFixed(2));
    onTipPreview?.(value);
  };

  const handleEditTip = () => {
    setTipAndInput(receiptTip);
    setIsEditing(true);
  };

  const handleSaveTip = async () => {
    await mutate({
      id: receiptId,
      tip: tip.toNumber(),
      tip_after_tax: tipAfterTax,
    });
  };

  const handleTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    // Allow empty and partial decimal input for typing
    if (rawValue === '' || rawValue === '.') {
      setInputValue(rawValue);
      setTip(new Decimal(0));
      onTipPreview?.(new Decimal(0));
      return;
    }

    // Allow trailing dot or trailing dot-digits for mid-typing (e.g. "12." or "12.5")
    if (/^\d*\.?\d{0,2}$/.test(rawValue)) {
      setInputValue(rawValue);

      let parsedValue: Decimal;
      try {
        parsedValue = new Decimal(rawValue);
      } catch {
        return;
      }

      const clampedValue = Decimal.max(0, parsedValue);
      const roundedValue = clampedValue.toDP(2);
      setTip(roundedValue);
      onTipPreview?.(roundedValue);
    }
  };

  const handleInputBlur = () => {
    setInputValue(tip.toFixed(2));
  };

  const handleDeleteTip = async () => {
    await mutate({
      id: receiptId,
      tip: 0,
    });
  };

  const handleCancelTip = () => {
    setTipAndInput(receiptTip);
    setTipAfterTax(propTipAfterTax);
    setIsEditing(false);
    onTipPreview?.(null);
  };

  const handleQuickPercentageTip = (amount: Decimal) => {
    const roundedAmount = amount.toDP(2);
    mutate({
      id: receiptId,
      tip: roundedAmount.toNumber(),
      tip_after_tax: tipAfterTax,
    });
  };

  const handleTipAfterTaxChange = (value: string) => {
    const newTipAfterTax = value === 'after';
    setTipAfterTax(newTipAfterTax);

    // Recalculate tip amount preserving the percentage
    const oldBase = tipAfterTax ? itemsTotal.plus(receiptTax) : itemsTotal;
    const newBase = newTipAfterTax ? itemsTotal.plus(receiptTax) : itemsTotal;

    if (oldBase.gt(0)) {
      const ratio = tip.div(oldBase);
      const newTip = newBase.mul(ratio).toDP(2);
      setTipAndInput(newTip);
    }
  };

  return (
    <div className="-ml-2 -mr-2 rounded-sm border">
      {isEditing ? (
        <TipEditForm
          inputValue={inputValue}
          tipAfterTax={tipAfterTax}
          tipBase={tipBase}
          tip={tip}
          itemsTotal={itemsTotal}
          receiptTax={receiptTax}
          hasValueToDelete={hasValueToDelete}
          isSaving={isSaving}
          focusInputOnMount={focusInputOnMount}
          handleTipChange={handleTipChange}
          handleInputBlur={handleInputBlur}
          handleTipAfterTaxChange={handleTipAfterTaxChange}
          handleDeleteTip={handleDeleteTip}
          handleCancelTip={handleCancelTip}
          handleSaveTip={handleSaveTip}
        />
      ) : (
        <TipDisplay
          receiptTip={receiptTip}
          tipBase={tipBase}
          activePercentage={activePercentage}
          isOriginalTip={isOriginalTip}
          tipAfterTax={tipAfterTax}
          handleEditTip={handleEditTip}
          handleQuickPercentageTip={handleQuickPercentageTip}
        />
      )}
    </div>
  );
};

export default TipEditor;
