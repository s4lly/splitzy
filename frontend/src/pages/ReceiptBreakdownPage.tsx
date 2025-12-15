import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { ReceiptResponseSchema } from '@/lib/receiptSchemas';
import receiptService from '@/services/receiptService';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';

const ReceiptBreakdownPage = () => {
  const { receiptId } = useParams();
  // const queryClient = useQueryClient();
  const [namesText, setNamesText] = useState('');

  const [receipt, setReceipt] = useState<
    z.infer<typeof ReceiptResponseSchema> | undefined
  >(undefined);

  useEffect(() => {
    receiptService.getSingleReceipt(parseInt(receiptId!)).then((data) => {
      setReceipt(data);
    });
  }, []);

  console.log(receipt);

  const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
    receipt?.receipt.receipt_data.line_items || []
  );
  console.log('new assignments', itemSplits);

  const personItemTotals =
    calculations.pretax.getAllPersonItemTotals(itemSplits);
  console.log('personItemTotals', personItemTotals);

  const names = namesText
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  // --

  const handleAssignmentChange = (
    lineItemId: string,
    name: string,
    checked: boolean
  ) => {
    const lineItem = receipt?.receipt.receipt_data.line_items.find(
      (item: any) => item.id === lineItemId
    );

    if (!lineItem) return;

    const currentAssignments = lineItem.assignments || [];

    const newAssignments = checked
      ? [...currentAssignments, name]
      : currentAssignments.filter((n: string) => n !== name);

    setReceipt((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        receipt: {
          ...prev.receipt,
          receipt_data: {
            ...prev.receipt.receipt_data,
            line_items: prev.receipt.receipt_data.line_items.map((item: any) =>
              item.id === lineItemId
                ? { ...item, assignments: newAssignments }
                : item
            ),
          },
        },
      };
    });
  };

  if (!receipt) {
    return (
      <div className="container mx-auto p-4">
        <p>Loading...</p>
      </div>
    );
  }

  // --

  const personTotals = calculations.final.getPersonTotals(
    receipt?.receipt.receipt_data,
    {
      itemSplits,
    }
  );
  console.log('personTotals', personTotals);

  // --

  const finalTotal = calculations.final.getReceiptTotal(
    receipt?.receipt.receipt_data
  );
  console.log(
    'finalTotal',
    finalTotal,
    finalTotal.toNumber(),
    formatCurrency(finalTotal)
  );

  // --

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <label className="mb-2 block font-medium">
          Names (comma-separated):
        </label>
        <textarea
          className="w-full rounded-md border border-gray-300 p-2"
          rows={3}
          placeholder="e.g., Alice, Bob, Charlie"
          value={namesText}
          onChange={(e) => setNamesText(e.target.value)}
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <label>pre tax total:</label>
        <input
          className="rounded-md border border-gray-300 p-1 text-right"
          disabled
          value={receipt?.receipt.receipt_data.pretax_total?.toString() || '0'}
        />
      </div>

      {receipt?.receipt.receipt_data.line_items.map(
        (item: any, idx: number) => (
          <div key={item.id || idx} className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="font-medium">{item.name}</span> &times;{' '}
                <span>{item.quantity}</span>
              </div>
              <div>
                <span className="text-right">
                  ${item.price_per_item.toFixed(2)}
                </span>
              </div>
            </div>
            {names.length > 0 && (
              <div className="ml-4 flex flex-wrap gap-3">
                {names.map((name) => {
                  const isChecked = (item.assignments || []).includes(name);
                  return (
                    <label
                      key={name}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          handleAssignmentChange(
                            item.id,
                            name,
                            e.target.checked
                          )
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span>{name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      <div className="flex items-center justify-between">
        <label>items total:</label>
        <input
          className="rounded-md border border-gray-300 p-1 text-right"
          disabled
          value={calculations.pretax
            .getTotalForAllItems(receipt?.receipt.receipt_data)
            .toNumber()}
        />
      </div>

      <div className="flex items-center justify-between">
        <label>tax rate:</label>
        <input
          className="rounded-md border border-gray-300 p-1 text-right"
          disabled
          value={calculations.tax
            .getRate(receipt?.receipt.receipt_data)
            .toNumber()}
        />
      </div>

      <div className="flex items-center justify-between">
        <label>tax amount:</label>
        <input
          className="rounded-md border border-gray-300 p-1 text-right"
          disabled
          value={calculations.pretax
            .getTotalForAllItems(receipt?.receipt.receipt_data)
            .mul(calculations.tax.getRate(receipt?.receipt.receipt_data))
            .toNumber()}
        />
      </div>

      <div className="flex items-center justify-between">
        <label>final total:</label>
        <input
          className="rounded-md border border-gray-300 p-1 text-right"
          disabled
          value={formatCurrency(
            calculations.final.getReceiptTotal(receipt?.receipt.receipt_data)
          )}
        />
      </div>

      {/* formatCurrency(calculations.final.getReceiptTotal(receipt_data)) */}

      {/* BURDEN SHARING CALCULATIONS */}
      {names.map((name) => (
        <div key={name}>
          <h3>{name}</h3>
          <p>
            item total:{' '}
            {calculations.pretax
              .getPersonSplitTotal(name, itemSplits)
              .toNumber()}
          </p>
          <p>
            percentage:{' '}
            {calculations.pretax
              .getPersonSplitTotal(name, itemSplits)
              .div(
                calculations.pretax.getTotalForAllItems(
                  receipt?.receipt.receipt_data
                )
              )
              .mul(100)
              .toNumber()}
          </p>
          <progress
            value={calculations.pretax
              .getPersonSplitTotal(name, itemSplits)
              .div(
                calculations.pretax.getTotalForAllItems(
                  receipt?.receipt.receipt_data
                )
              )
              .mul(100)
              .toNumber()}
            max={100}
            className="w-full"
          />
        </div>
      ))}
    </div>
  );
};

export default ReceiptBreakdownPage;
