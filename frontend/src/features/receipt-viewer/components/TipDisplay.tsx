import { Trans, useLingui } from '@lingui/react/macro';
import Decimal from 'decimal.js';

import PercentageTipButton from '@/components/Receipt/components/PercentageTipButton';
import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { Badge } from '@/components/ui/badge';
import EditableDetail from '@/features/summary-card/EditableDetail';

interface TipDisplayProps {
  receiptTip: Decimal;
  tipBase: Decimal;
  activePercentage: number | null;
  isOriginalTip: boolean;
  tipAfterTax: boolean;
  handleEditTip: () => void;
  handleQuickPercentageTip: (amount: Decimal) => void;
}

const TipDisplay = ({
  receiptTip,
  tipBase,
  activePercentage,
  isOriginalTip,
  tipAfterTax,
  handleEditTip,
  handleQuickPercentageTip,
}: TipDisplayProps) => {
  const { t } = useLingui();

  return (
    <>
      <EditableDetail
        label={t`Tip`}
        value={formatCurrency(receiptTip)}
        onClick={handleEditTip}
      />
      <div className="grid grid-flow-col gap-2 px-2 pb-2">
        <PercentageTipButton
          percentage={10}
          itemsTotal={tipBase}
          onTipSelect={handleQuickPercentageTip}
          isActive={activePercentage === 10}
        />
        <PercentageTipButton
          percentage={15}
          itemsTotal={tipBase}
          onTipSelect={handleQuickPercentageTip}
          isActive={activePercentage === 15}
        />
        <PercentageTipButton
          percentage={20}
          itemsTotal={tipBase}
          onTipSelect={handleQuickPercentageTip}
          isActive={activePercentage === 20}
        />
      </div>
      <div className="flex justify-end gap-1.5 px-2 pb-2">
        {isOriginalTip && (
          <Badge variant="outline" className="font-normal">
            <Trans>Original</Trans>
          </Badge>
        )}
        <Badge variant="outline" className="font-normal">
          {tipAfterTax ? <Trans>After tax</Trans> : <Trans>Before tax</Trans>}
        </Badge>
      </div>
    </>
  );
};

export default TipDisplay;
