import { Trans, useLingui } from '@lingui/react/macro';
import Decimal from 'decimal.js';
import { Lock, Unlock } from 'lucide-react';
import React from 'react';

import {
  type AvatarChipColor,
  DEFAULT_CHIP_COLOR,
} from '@/components/Receipt/utils/avatar-chip-colors';
import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useSplitPercent } from '@/features/assignments/hooks/useSplitPercent';
import { getInitials } from '@/lib/get-initials';
import { cn } from '@/lib/utils';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';

interface SplitPercentTabProps {
  item: ReceiptLineItem;
  chipColors: Map<string, AvatarChipColor>;
  formPricePerItem: Decimal;
  formQuantity: Decimal;
}

const SplitPercentTab: React.FC<SplitPercentTabProps> = ({
  item,
  chipColors,
  formPricePerItem,
  formQuantity,
}) => {
  const { t } = useLingui();
  const {
    entries,
    roundedPercents,
    handleChange,
    handleToggleLock,
    handleReset,
  } = useSplitPercent({ item });

  const itemTotal = calculations.pretax.getIndividualItemTotalPrice(item, {
    pricePerItem: formPricePerItem,
    quantity: formQuantity,
  });

  if (entries.length < 2) {
    return (
      <div className="rounded-md p-4 text-center text-sm text-muted-foreground">
        <Trans>Assign 2+ people to customize the split.</Trans>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-2">
      <ul className="flex flex-col gap-5">
        {entries.map((entry, idx) => {
          const chipColor =
            chipColors.get(entry.receiptUserId) ?? DEFAULT_CHIP_COLOR;
          const dollar = itemTotal.mul(entry.share).div(100);
          const percentDisplay = roundedPercents[idx] ?? 0;
          return (
            <li key={entry.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Avatar
                  className={cn('ring-1', chipColor.ring)}
                  title={entry.displayName}
                >
                  <AvatarFallback className={cn(chipColor.bg, chipColor.text)}>
                    {getInitials(entry.displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate">{entry.displayName}</span>
                <div
                  className={cn(
                    'flex items-center gap-1 rounded-full bg-muted px-3 py-1',
                    entry.locked && 'opacity-60'
                  )}
                >
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={percentDisplay}
                    disabled={entry.locked}
                    onChange={(event) => {
                      const parsed = Number(event.target.value);
                      if (Number.isFinite(parsed)) {
                        // Only forward finite numbers so a partially-typed or
                        // cleared input doesn't blow up the rebalance math.
                        handleChange(entry.id, new Decimal(parsed));
                      }
                    }}
                    className="w-10 bg-transparent text-right text-base outline-none md:text-sm"
                    aria-label={t`${entry.displayName} percent`}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <span className="w-16 text-right tabular-nums">
                  {formatCurrency(dollar)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Slider
                  value={[entry.share.toNumber()]}
                  min={0}
                  max={100}
                  step={1}
                  disabled={entry.locked}
                  onValueChange={(vals) =>
                    handleChange(entry.id, new Decimal(vals[0] ?? 0))
                  }
                  className="flex-1"
                  aria-label={t`${entry.displayName} share slider`}
                />
                <Button
                  type="button"
                  variant={entry.locked ? 'default' : 'secondary'}
                  size="icon"
                  className="size-11 shrink-0"
                  onClick={() => handleToggleLock(entry.id)}
                  aria-label={
                    entry.locked
                      ? t`Unlock ${entry.displayName}`
                      : t`Lock ${entry.displayName}`
                  }
                  title={
                    entry.locked
                      ? t`Unlock ${entry.displayName}`
                      : t`Lock ${entry.displayName}`
                  }
                >
                  {entry.locked ? <Lock /> : <Unlock />}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-center">
        <Button type="button" variant="link" size="sm" onClick={handleReset}>
          <Trans>Reset to even split</Trans>
        </Button>
      </div>
    </div>
  );
};

export default SplitPercentTab;
