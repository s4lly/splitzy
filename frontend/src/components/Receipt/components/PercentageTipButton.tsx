import { truncateFloatByNDecimals } from '../utils/format-currency';

interface PercentageTipButtonProps {
  percentage: number;
  itemsTotal: number;
  onTipSelect: (amount: number) => void;
}

const PercentageTipButton = ({
  percentage,
  itemsTotal,
  onTipSelect,
}: PercentageTipButtonProps) => {
  const tipAmount = truncateFloatByNDecimals(
    itemsTotal * (percentage / 100),
    2
  );

  const handleClick = () => {
    onTipSelect(tipAmount);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTipSelect(tipAmount);
    }
  };

  return (
    <div
      className="flex cursor-pointer flex-col items-center justify-center rounded-sm border p-2 transition-colors hover:bg-muted focus:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      tabIndex={0}
      role="button"
      aria-label={`Set tip to ${percentage}%`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="text-xl font-semibold">{percentage}%</div>
      <div className="text-sm text-muted-foreground">
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(tipAmount)}
      </div>
    </div>
  );
};

export default PercentageTipButton;
