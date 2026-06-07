import Decimal from 'decimal.js';

import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { cn } from '@/lib/utils';

interface PercentageTipButtonProps {
  percentage: number;
  itemsTotal: Decimal;
  onTipSelect: (amount: Decimal) => void;
  isActive?: boolean;
}

const PercentageTipButton = ({
  percentage,
  itemsTotal,
  onTipSelect,
  isActive = false,
}: PercentageTipButtonProps) => {
  const tipAmount = itemsTotal.mul(new Decimal(percentage).div(100));

  const handleClick = () => {
    onTipSelect(tipAmount);
  };

  return (
    <button
      type="button"
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-sm border p-2 transition-colors hover:bg-muted focus:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        isActive && 'border-primary bg-primary/10'
      )}
      aria-label={`Set tip to ${percentage}%`}
      onClick={handleClick}
    >
      <div className="text-xl font-semibold">{percentage}%</div>
      <div className="text-sm text-muted-foreground">
        {formatCurrency(tipAmount)}
      </div>
    </button>
  );
};

export default PercentageTipButton;
