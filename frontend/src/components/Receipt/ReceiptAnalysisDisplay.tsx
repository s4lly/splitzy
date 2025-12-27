import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BillSplitSection } from '@/features/bill-split/BillSplitSection';
import { LineItemAddFormAdapter } from '@/features/line-items/adapters/tanstack/LineItemAddFormAdapter';
import { LineItemsTableDesktopAdapter } from '@/features/line-items/adapters/tanstack/LineItemsTableDesktopAdapter';
import { LineItemsTableMobileAdapter } from '@/features/line-items/adapters/tanstack/LineItemsTableMobileAdapter';
import { NoLineItemsMessage } from '@/features/line-items/components/NoLineItemsMessage';
import { ReceiptDetailsCard } from '@/features/receipt-viewer/ReceiptDetailsCard';
import { useMobile } from '@/hooks/use-mobile';
import type { Receipt } from '@/models/Receipt';
import Decimal from 'decimal.js';
import { motion } from 'framer-motion';
import { Plus, Receipt as ReceiptIcon, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  receipt,
  receiptId,
}: {
  receipt: Receipt;
  receiptId: string;
}) => {
  /**
   * TODO looks like used to keep track of all people, including those not assigned to any items
   * this is being used by the button at the bottom of the page. doese not break main flow but
   * should also persist this list of people in the backend. leaving this here for now.
   */
  const [people, setPeople] = useState(() => {
    return getPeopleFromLineItems(receipt.lineItems);
  });

  const [searchInputs, setSearchInputs] = useState<Record<string, string>>({});
  const [isAddingItem, setIsAddingItem] = useState(false);
  const updateItemAssignmentsMutation = useItemAssignmentsUpdateMutation();
  const isMobile = useMobile();

  // Update people state when receipt changes (e.g., when line items are deleted)
  useEffect(() => {
    setPeople(getPeopleFromLineItems(receipt.lineItems));
  }, [receipt.lineItems]);

  if (!receipt) return null;

  // Check if we need to use equal split mode (no line items or no assignments made)
  const receiptHasLineItems = hasLineItems(receipt);
  const useEqualSplit = shouldUseEqualSplit(receipt);

  // --

  const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
    receipt.lineItems
  );

  // --

  // Pre-tax item totals for each person (without tax, tip, gratuity, etc.)
  const personPretaxTotals =
    calculations.pretax.getAllPersonItemTotals(itemSplits);

  // Calculate total receipt amount including assigned items and unassigned items
  const receiptTotal = calculations.final.getReceiptTotal(receipt);

  // Calculate the amount each person owes
  const personTotals = calculations.final.getPersonTotals(receipt, {
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
  const isFullyAssigned = areAllItemsAssigned(receipt);

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

    // Persist to backend - remove person from all items
    receipt.lineItems.forEach((item) => {
      if (item.assignments.includes(personToRemove)) {
        updateItemAssignmentsMutation.mutate({
          receiptId,
          lineItemId: item.id,
          assignments: item.assignments.filter((p) => p !== personToRemove),
        });
      }
    });
  };

  const togglePersonAssignment = async (itemId: string, person: string) => {
    const item = receipt.lineItems.find((item) => item.id === itemId);

    if (!item) {
      console.error(`Item with id ${itemId} not found`);
      return;
    }

    const currentAssignments = item.assignments;
    const newAssignments = currentAssignments.includes(person)
      ? currentAssignments.filter((p) => p !== person)
      : [...currentAssignments, person];

    if (currentAssignments.includes(person)) {
      console.info(`Removing person ${person} from item ${itemId}`);
    } else {
      console.info(`Adding person ${person} to item ${itemId}`);
    }

    // Persist to backend
    updateItemAssignmentsMutation.mutate({
      receiptId,
      lineItemId: itemId,
      assignments: newAssignments,
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
        <ReceiptIcon className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Document Analysis</h2>
      </div>

      {/* Document Details Card - Now first */}
      <ReceiptDetailsCard merchant={receipt.merchant} date={receipt.date} />

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
              <LineItemAddFormAdapter
                receiptId={receiptId}
                onAddCancel={() => setIsAddingItem(false)}
              />
            </LineItemCard>
          )}

          {receipt.lineItems && receipt.lineItems.length > 0 ? (
            <>
              {isMobile ? (
                <LineItemsTableMobileAdapter
                  line_items={receipt.lineItems}
                  receipt={receipt}
                  people={people}
                  togglePersonAssignment={togglePersonAssignment}
                />
              ) : (
                <LineItemsTableDesktopAdapter
                  line_items={receipt.lineItems}
                  people={people}
                  receipt={receipt}
                  togglePersonAssignment={togglePersonAssignment}
                />
              )}
            </>
          ) : (
            <NoLineItemsMessage merchant={receipt.merchant} />
          )}
        </CardContent>
      </Card>

      {/* Summary Card - Third position */}
      <SummaryCard receiptId={receiptId} receipt={receipt} />

      {/* People Manager Section - Now at the bottom */}
      <BillSplitSection
        people={people}
        receiptId={receiptId}
        receipt={receipt}
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
