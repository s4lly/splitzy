import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QRCode } from '@/components/ui/kibo-ui/qr-code';
import { useFeatureFlag } from '@/context/FeatureFlagProvider';
import { BillSplitSection } from '@/features/bill-split/BillSplitSection';
import { useMobile } from '@/hooks/use-mobile';
import { ReceiptSchema } from '@/lib/receiptSchemas';
import Decimal from 'decimal.js';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  Plus,
  QrCode,
  Receipt,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import LineItemAddForm from './LineItemAddForm';
import LineItemsTableDesktop from './LineItemsTableDesktop';
import LineItemsTableDesktopV2 from './LineItemsTableDesktopV2';
import LineItemsTableMobile from './LineItemsTableMobile';
import SummaryCard from './SummaryCard';
import LineItemCard from './components/LineItemCard';
import { useItemAssignmentsUpdateMutation } from './hooks/useItemAssignmentsUpdateMutation';
import { getPeopleFromLineItems } from './utils/line-item-utils';
import { calculations } from './utils/receipt-calculation';
import {
  areAllItemsAssigned,
  hasLineItems,
  shouldUseEqualSplit,
} from './utils/receipt-conditions';

const ReceiptAnalysisDisplay = ({
  result,
}: {
  result: z.infer<typeof ReceiptSchema>;
}) => {
  /**
   * TODO looks like used to keep track of all people, including those not assigned to any items
   * this is being used by the button at the bottom of the page. doese not break main flow but
   * should also persist this list of people in the backend. leaving this here for now.
   */
  const [people, setPeople] = useState(() => {
    return getPeopleFromLineItems(result.receipt_data.line_items);
  });

  const [showQrCode, setShowQrCode] = useState(false);
  const [searchInputs, setSearchInputs] = useState<Record<string, string>>({});
  const [isAddingItem, setIsAddingItem] = useState(false);
  const updateItemAssignmentsMutation = useItemAssignmentsUpdateMutation();
  const receiptDesktopTableV2Enabled = useFeatureFlag('receipt-desktop-table');
  const isMobile = useMobile();

  // Update people state when result changes (e.g., when line items are deleted)
  useEffect(() => {
    setPeople(getPeopleFromLineItems(result.receipt_data.line_items));
  }, [result.receipt_data.line_items]);

  if (!result) return null;
  const { receipt_data } = result;

  // Check if we need to use equal split mode (no line items or no assignments made)
  const receiptHasLineItems = hasLineItems(receipt_data);
  const useEqualSplit = shouldUseEqualSplit(receipt_data);

  // --

  const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
    receipt_data.line_items
  );

  // --

  // Pre-tax item totals for each person (without tax, tip, gratuity, etc.)
  const personPretaxTotals =
    calculations.pretax.getAllPersonItemTotals(itemSplits);

  // Calculate total receipt amount including assigned items and unassigned items
  const receiptTotal = calculations.final.getReceiptTotal(receipt_data);

  // Calculate the amount each person owes
  const personTotals = calculations.final.getPersonTotals(receipt_data, {
    itemSplits,
  });

  // Sum of all person totals (used for fair rounding calculation)
  const personTotalsSum = personTotals.size
    ? Decimal.sum(...Array.from(personTotals.values()))
    : new Decimal(0);

  const personFairTotals = calculations.final.getPersonFairTotals(
    personTotalsSum,
    personTotals
  );

  // --

  const unassignedAmount = Decimal.max(0, receiptTotal.minus(personTotalsSum));
  const isFullyAssigned = areAllItemsAssigned(receipt_data);

  // --

  const handleAddPerson = (name: string) => {
    if (name.trim() && !people.includes(name.trim())) {
      // see TODO above
      setPeople([...people, name.trim()]);
    }
  };

  const handleRemovePerson = (personToRemove: string) => {
    // see TODO above
    setPeople(people.filter((person) => person !== personToRemove));

    // Also remove this person from all item assignments
    receipt_data.line_items.forEach((item) => {
      if (item.assignments && Array.isArray(item.assignments)) {
        item.assignments = item.assignments.filter(
          (person) => person !== personToRemove
        );
      }
    });

    // Persist to backend
    receipt_data.line_items.forEach((item) => {
      if (item.assignments && item.assignments.includes(personToRemove)) {
        updateItemAssignmentsMutation.mutate({
          receiptId: String(result.id),
          lineItemId: item.id,
          assignments: item.assignments.filter((p) => p !== personToRemove),
        });
      }
    });
  };

  const togglePersonAssignment = async (itemId: string, person: string) => {
    const item = receipt_data.line_items.find((item) => item.id === itemId);

    if (!item) {
      console.error(`Item with id ${itemId} not found`);
      return;
    }

    if (!item.assignments) item.assignments = [];

    if (item.assignments.includes(person)) {
      console.info(`Removing person ${person} from item ${itemId}`);
      item.assignments = item.assignments.filter((p) => p !== person);
    } else {
      console.info(`Adding person ${person} to item ${itemId}`);
      item.assignments = [...item.assignments, person];
    }

    setPeople(getPeopleFromLineItems(receipt_data.line_items));

    // Persist to backend
    updateItemAssignmentsMutation.mutate({
      receiptId: String(result.id),
      lineItemId: itemId,
      assignments: item.assignments,
    });
  };

  // Add a function to handle search input change
  const handleSearchInputChange = (itemId: string, value: string) => {
    setSearchInputs({
      ...searchInputs,
      [itemId]: value,
    });
  };

  // Add a function to handle searching and creating a new person
  const handleSearchAndAssign = (itemId: string, searchValue: string) => {
    // If no search value, do nothing
    if (!searchValue.trim()) return;

    const name = searchValue.trim();

    // Check if person already exists
    if (!people.includes(name)) {
      // Add the new person to the list
      setPeople([...people, name]);
    }

    // Assign the person to the item
    togglePersonAssignment(itemId, name);

    // Clear the search input for this item
    setSearchInputs({
      ...searchInputs,
      [itemId]: '',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-full space-y-4 px-0 sm:px-4"
    >
      <div className="mb-2 flex items-center gap-3 px-2 sm:px-0">
        <Receipt className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Document Analysis</h2>
      </div>

      {/* Document Details Card - Now first */}
      <Card className="overflow-hidden rounded-none border-2 shadow-md sm:rounded-lg">
        <CardHeader className="px-3 pb-2 sm:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <ShoppingBag className="h-6 w-6" />
              Document Details
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQrCode(!showQrCode)}
            >
              <QrCode className="mr-1 h-4 w-4" />
              {showQrCode ? 'Hide QR Code' : 'Show QR Code'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {showQrCode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center py-4"
            >
              <QRCode data={window.location.href} className="h-48 w-48" />
            </motion.div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <div className="flex items-center gap-3 overflow-hidden">
              <Tag className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span className="whitespace-nowrap text-base font-medium">
                Merchant:
              </span>
              <span className="ml-auto truncate text-base font-semibold">
                {receipt_data.merchant || 'Unknown'}
              </span>
            </div>

            <div className="flex items-center gap-3 overflow-hidden">
              <Calendar className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span className="whitespace-nowrap text-base font-medium">
                Date:
              </span>
              <span className="ml-auto truncate text-base font-semibold">
                {receipt_data.date || 'Unknown'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Card - Second position */}
      <Card className="overflow-hidden rounded-none border-2 shadow-md sm:rounded-lg">
        <CardHeader className="px-3 pb-2 sm:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <ShoppingBag className="h-6 w-6" />
              Items
            </CardTitle>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingItem(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {isAddingItem && (
            <LineItemCard selected={true}>
              <LineItemAddForm
                result={result}
                onAddCancel={() => setIsAddingItem(false)}
              />
            </LineItemCard>
          )}

          {receipt_data.line_items && receipt_data.line_items.length > 0 ? (
            <>
              {isMobile ? (
                <LineItemsTableMobile
                  line_items={receipt_data.line_items}
                  result={result}
                  people={people}
                  togglePersonAssignment={togglePersonAssignment}
                />
              ) : (
                <>
                  {receiptDesktopTableV2Enabled ? (
                    <LineItemsTableDesktopV2
                      line_items={receipt_data.line_items}
                      people={people}
                      result={result}
                      togglePersonAssignment={togglePersonAssignment}
                    />
                  ) : (
                    <LineItemsTableDesktop
                      line_items={receipt_data.line_items}
                      people={people}
                    />
                  )}
                </>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800/30 dark:bg-amber-900/20">
              <AlertCircle className="mx-auto mb-2 h-10 w-10 text-amber-500 dark:text-amber-400" />
              <p className="mb-1 text-base font-medium text-amber-800 dark:text-amber-200">
                No Item Details Available
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This{' '}
                {receipt_data.merchant
                  ? 'document from ' + receipt_data.merchant
                  : 'document'}{' '}
                doesn't include detailed line items. The total amount has been
                equally divided among all people.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Card - Third position */}
      <SummaryCard receiptId={String(result.id)} receipt_data={receipt_data} />

      {/* People Manager Section - Now at the bottom */}
      <BillSplitSection
        people={people}
        receiptId={String(result.id)}
        receiptData={receipt_data}
        receiptResult={result}
        personFairTotals={personFairTotals}
        personPretaxTotals={personPretaxTotals}
        personTotalsSum={personTotalsSum}
        receiptTotal={receiptTotal}
        unassignedAmount={unassignedAmount}
        isFullyAssigned={isFullyAssigned}
        useEqualSplit={useEqualSplit}
        receiptHasLineItems={receiptHasLineItems}
        onAddPerson={handleAddPerson}
        onRemovePerson={handleRemovePerson}
      />
    </motion.div>
  );
};

export default ReceiptAnalysisDisplay;
