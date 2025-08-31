import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  ShoppingBag,
  Tag,
  Receipt,
  UserPlus,
  FileText,
  AlertCircle,
  Users,
  Check,
  Plus,
  X,
  QrCode,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from '../ui/dialog';
import { useItemAssignmentsUpdateMutation } from './hooks/useItemAssignmentsUpdateMutation';
import { useFeatureFlag } from '../../context/FeatureFlagProvider';
import PersonBadge from './PersonBadge';
import LineItemsTableMobile from './LineItemsTableMobile';
import LineItemsTableDesktop from './LineItemsTableDesktop';
import LineItemsTableDesktopV2 from './LineItemsTableDesktopV2';
import { getColorForName } from './utils/get-color-for-name';
import { Input } from '../ui/input';
import { LineItemSchema, ReceiptSchema } from '@/lib/receiptSchemas';
import { z } from 'zod';
import { formatCurrency } from './utils/format-currency';
import {
  getTotal,
  getPersonPreTaxItemTotals,
  getPersonFinalTotals,
} from './utils/receipt-calculation';
import { useMobile } from '../../hooks/use-mobile';
import LineItemCard from './components/LineItemCard';
import LineItemAddForm from './LineItemAddForm';
import SummaryCard from './SummaryCard';
import { QRCode } from '../ui/kibo-ui/qr-code';

const getPeopleFromLineItems = (
  lineItems: z.infer<typeof LineItemSchema>[]
) => {
  if (!lineItems) return [];

  const allAssignments = lineItems.flatMap((item) => item.assignments || []);

  return Array.from(new Set(allAssignments));
};

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

  const [newPersonName, setNewPersonName] = useState('');
  const [showPeopleManager, setShowPeopleManager] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [searchInputs, setSearchInputs] = useState<Record<string, string>>({});
  const [isAddingItem, setIsAddingItem] = useState(false);
  const updateItemAssignmentsMutation = useItemAssignmentsUpdateMutation();
  const editLineItemsEnabledRaw = useFeatureFlag('edit-line-items');
  const editLineItemsEnabled = !!editLineItemsEnabledRaw;
  const receiptDesktopTableV2Enabled = useFeatureFlag('receipt-desktop-table');
  const isMobile = useMobile();

  // Update people state when result changes (e.g., when line items are deleted)
  useEffect(() => {
    setPeople(getPeopleFromLineItems(result.receipt_data.line_items));
  }, [result.receipt_data.line_items]);

  if (!result) return null;
  const { receipt_data } = result;

  // Calculate the amount each person owes
  const personFinalTotals = getPersonFinalTotals(receipt_data, people, {
    editLineItemsEnabled,
  });
  const personPreTaxItemTotals = getPersonPreTaxItemTotals(
    receipt_data,
    people,
    { editLineItemsEnabled }
  );

  // Check if we need to use equal split mode (no line items or no assignments made)
  const hasLineItems =
    receipt_data.line_items && receipt_data.line_items.length > 0;
  const noAssignmentsMade =
    hasLineItems &&
    receipt_data.line_items.every(
      (item) => !item.assignments || item.assignments.length === 0
    );
  const useEqualSplit = !hasLineItems || noAssignmentsMade;

  // Calculate the total assigned and unassigned amounts
  const totalAssigned = Array.from(personFinalTotals.values()).reduce(
    (sum, amount) => sum + amount,
    0
  );
  const receiptTotal = editLineItemsEnabled
    ? getTotal(receipt_data)
    : (receipt_data.total ?? 0);
  const unassignedAmount = Math.max(0, receiptTotal - totalAssigned);
  const isFullyAssigned = Math.abs(totalAssigned - receiptTotal) < 0.01; // Account for floating point rounding

  const handleAddPerson = () => {
    if (newPersonName.trim() && !people.includes(newPersonName.trim())) {
      // see TODO above
      setPeople([...people, newPersonName.trim()]);

      setNewPersonName('');
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

  // Find all items assigned to a person and their costs
  const getPersonItems = (person: string) => {
    if (!receipt_data.line_items) return [];

    const personItems: {
      name: string;
      quantity: number;
      originalPrice: number;
      price: number;
      shared: boolean;
      sharedWith: string[];
    }[] = [];
    receipt_data.line_items.forEach((item) => {
      const assignedPeople = item.assignments || [];
      const totalPrice = item.price_per_item * item.quantity;

      if (assignedPeople.includes(person)) {
        const pricePerPerson = totalPrice / assignedPeople.length;
        personItems.push({
          name: item.name,
          quantity: item.quantity || 1,
          originalPrice: totalPrice,
          price: pricePerPerson,
          shared: assignedPeople.length > 1,
          sharedWith: assignedPeople.filter((p) => p !== person),
        });
      }
    });

    return personItems;
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
                  editLineItemsEnabled={editLineItemsEnabled}
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
      <SummaryCard
        receiptId={String(result.id)}
        receipt_data={receipt_data}
        editLineItemsEnabled={editLineItemsEnabled}
      />

      {/* People Manager Section - Now at the bottom */}
      <Card className="overflow-hidden rounded-none border-2 shadow-md sm:rounded-lg">
        <CardHeader className="px-3 pb-2 sm:px-6">
          <CardTitle className="flex items-center justify-between text-xl font-bold">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6" />
              Split with Friends
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPeopleManager(!showPeopleManager)}
            >
              {showPeopleManager ? 'Hide' : 'Manage People'}
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="px-3 sm:px-6">
          {/* Assignment Progress */}
          {people.length > 0 && (
            <div
              className={`mb-4 rounded-lg border p-2 sm:p-3 ${
                isFullyAssigned
                  ? 'border-green-300 bg-green-100 dark:border-green-700 dark:bg-green-900/30'
                  : 'border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-900/20'
              }`}
            >
              <div className="mb-2 flex flex-col justify-between sm:flex-row sm:items-center">
                <div className="mb-2 flex items-center gap-2 sm:mb-0">
                  {isFullyAssigned ? (
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  )}
                  <h3
                    className={`font-medium ${
                      isFullyAssigned
                        ? 'text-green-800 dark:text-green-300'
                        : 'text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {isFullyAssigned
                      ? 'All items assigned'
                      : 'Assignment in progress'}
                  </h3>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    isFullyAssigned
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {formatCurrency(totalAssigned as number)} /{' '}
                  {formatCurrency(receiptTotal)}
                </span>
              </div>

              {!isFullyAssigned && (
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-amber-700 dark:text-amber-400">
                    Unassigned amount:
                  </span>
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    {formatCurrency(unassignedAmount)}
                  </span>
                </div>
              )}

              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={`h-full rounded-full ${
                    isFullyAssigned
                      ? 'bg-green-500 dark:bg-green-600'
                      : 'bg-amber-500 dark:bg-amber-600'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      ((totalAssigned as number) / receiptTotal) * 100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          )}

          {/* Equal Split Banner */}
          {useEqualSplit && people.length > 0 && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/30 dark:bg-blue-900/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-medium text-blue-800 dark:text-blue-300">
                    Equal Split Mode
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    {!hasLineItems
                      ? "This receipt doesn't contain detailed line items, so the total amount has been divided equally among all people."
                      : 'No items have been assigned yet. The total has been divided equally among all people by default.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {showPeopleManager && (
            <div className="mb-4 rounded-lg border bg-muted/20 p-3">
              <h3 className="mb-2 font-medium">Add People to Split With</h3>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Enter name"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                  className="w-full sm:max-w-xs"
                />
                <Button
                  onClick={handleAddPerson}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {people.map((person, idx) => {
                  const colorPair = getColorForName(person, idx, people.length);
                  return (
                    <div
                      key={idx}
                      className={`flex items-center rounded-full px-3 py-1 ${colorPair[0]} ${colorPair[1]} dark:${colorPair[2]} dark:${colorPair[3]}`}
                    >
                      <PersonBadge
                        name={person}
                        personIndex={idx}
                        totalPeople={people.length}
                        size="sm"
                      />
                      <span className="ml-1 text-sm">{person}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-5 w-5 rounded-full p-0 hover:bg-destructive/20"
                        onClick={() => handleRemovePerson(person)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
                {people.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No people added yet. Add people to split the bill.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* People Summary */}
          <div>
            {people.length > 0 ? (
              <div className="space-y-2">
                <h3 className="mb-1 font-medium">Bill Breakdown</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {people.map((person, idx) => {
                    const colorPair = getColorForName(
                      person,
                      idx,
                      people.length
                    );
                    const personAmount = personFinalTotals.get(person) || 0;
                    const percentage =
                      receiptTotal > 0
                        ? ((personAmount / receiptTotal) * 100).toFixed(1)
                        : '0';
                    const personItems = getPersonItems(person);

                    return (
                      <Dialog key={idx}>
                        <DialogTrigger asChild>
                          <div
                            className={`rounded-lg border p-4 ${colorPair[0]}/5 ${colorPair[1]}/80 dark:${colorPair[2]}/20 dark:${colorPair[3]}/90 cursor-pointer transition-shadow hover:shadow-md`}
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <PersonBadge
                                name={person}
                                personIndex={idx}
                                totalPeople={people.length}
                                size="md"
                              />
                              <span className="truncate font-medium">
                                {person}
                              </span>
                            </div>

                            {useEqualSplit ? (
                              <>
                                <div className="flex items-end justify-between">
                                  <div className="text-lg font-semibold">
                                    {formatCurrency(
                                      personFinalTotals.get(person) || 0
                                    )}
                                  </div>
                                  <div className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-800/30 dark:text-blue-300">
                                    Equal split
                                  </div>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {people.length > 0
                                    ? `1/${people.length} of the total`
                                    : ''}
                                </div>
                              </>
                            ) : !receipt_data.tax_included_in_items &&
                              (receipt_data.tax ?? 0) > 0 ? (
                              <>
                                <div className="flex items-end justify-between">
                                  <div className="text-sm text-muted-foreground">
                                    Items subtotal:
                                  </div>
                                  <div className="text-sm font-medium">
                                    {formatCurrency(
                                      personPreTaxItemTotals.get(person) || 0
                                    )}
                                  </div>
                                </div>
                                <div className="mt-1 flex items-end justify-between">
                                  <div className="flex items-center text-sm text-muted-foreground">
                                    <span>Tax:</span>
                                  </div>
                                  <div className="text-sm font-medium">
                                    {(() => {
                                      const itemTotal =
                                        personPreTaxItemTotals.get(person) || 0;
                                      const taxRate =
                                        (receipt_data.tax ?? 0) /
                                          (receipt_data.pretax_total ??
                                            receipt_data.items_total ??
                                            1) || 0;
                                      const taxAmount = itemTotal * taxRate;
                                      return formatCurrency(taxAmount);
                                    })()}
                                  </div>
                                </div>
                                <div className="mt-1 flex items-end justify-between border-t pt-1">
                                  <div className="text-base font-semibold">
                                    Total:
                                  </div>
                                  <div className="text-lg font-semibold">
                                    {formatCurrency(personAmount)}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-end justify-between">
                                <div className="text-lg font-semibold">
                                  {formatCurrency(personAmount)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {percentage}% of total
                                </div>
                              </div>
                            )}

                            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                              {!useEqualSplit ? (
                                <>
                                  <FileText className="h-3 w-3" />
                                  {`${personItems.length} item${
                                    personItems.length !== 1 ? 's' : ''
                                  } assigned`}
                                </>
                              ) : (
                                'Equal amount split'
                              )}
                            </div>
                          </div>
                        </DialogTrigger>

                        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <PersonBadge
                                name={person}
                                personIndex={idx}
                                totalPeople={people.length}
                                size="md"
                              />
                              <span>{person}'s Items</span>
                            </DialogTitle>
                            <DialogDescription>
                              Detailed breakdown of items assigned to {person}.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="flex-grow overflow-y-auto">
                            {personItems.length > 0 ? (
                              <div className="overflow-hidden rounded-md border">
                                <table className="w-full">
                                  <thead>
                                    <tr className="bg-muted/50">
                                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                                        Item
                                      </th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                                        Qty
                                      </th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                                        Price
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {personItems.map((item, itemIdx) => (
                                      <tr
                                        key={itemIdx}
                                        className={`border-t ${
                                          itemIdx % 2 ? 'bg-muted/20' : ''
                                        }`}
                                      >
                                        <td className="px-3 py-2.5 align-top">
                                          <div className="max-w-[200px] overflow-x-auto text-sm">
                                            {item.name}
                                          </div>
                                          {item.shared && (
                                            <div className="mt-0.5 text-xs text-muted-foreground">
                                              Shared with{' '}
                                              {item.sharedWith.join(', ')}
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-3 py-2.5 text-right align-top text-sm">
                                          {item.quantity}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-right align-top text-sm">
                                          <div className="font-medium">
                                            {formatCurrency(item.price)}
                                          </div>
                                          {item.shared && (
                                            <div className="text-xs text-muted-foreground">
                                              of{' '}
                                              {formatCurrency(
                                                item.originalPrice
                                              )}
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-muted/50 font-medium">
                                    <tr className="border-t">
                                      <td
                                        colSpan={2}
                                        className="px-3 py-2 text-sm"
                                      >
                                        Subtotal
                                      </td>
                                      <td className="px-3 py-2 text-right text-sm">
                                        {formatCurrency(
                                          personPreTaxItemTotals.get(person) ||
                                            0
                                        )}
                                      </td>
                                    </tr>
                                    {!receipt_data.tax_included_in_items &&
                                      (receipt_data.tax ?? 0) > 0 && (
                                        <tr className="border-t">
                                          <td
                                            colSpan={2}
                                            className="px-3 py-2 text-sm"
                                          >
                                            Tax
                                          </td>
                                          <td className="px-3 py-2 text-right text-sm">
                                            {(() => {
                                              const itemTotal =
                                                personPreTaxItemTotals.get(
                                                  person
                                                ) || 0;
                                              const taxRate =
                                                (receipt_data.tax ?? 0) /
                                                  (receipt_data.pretax_total ??
                                                    receipt_data.items_total ??
                                                    1) || 0;
                                              const taxAmount =
                                                itemTotal * taxRate;
                                              return formatCurrency(taxAmount);
                                            })()}
                                          </td>
                                        </tr>
                                      )}
                                    {((receipt_data.tip ?? 0) > 0 ||
                                      (receipt_data.gratuity ?? 0) > 0) && (
                                      <tr className="border-t">
                                        <td
                                          colSpan={2}
                                          className="px-3 py-2 text-sm"
                                        >
                                          Tip
                                        </td>
                                        <td className="px-3 py-2 text-right text-sm">
                                          {(() => {
                                            const totalTip =
                                              (receipt_data.tip ?? 0) +
                                              (receipt_data.gratuity ?? 0);
                                            const tipPerPerson =
                                              totalTip / people.length;
                                            return formatCurrency(tipPerPerson);
                                          })()}
                                        </td>
                                      </tr>
                                    )}
                                    <tr className="border-t">
                                      <td
                                        colSpan={2}
                                        className="px-3 py-2 text-base font-semibold"
                                      >
                                        Total
                                      </td>
                                      <td className="px-3 py-2 text-right text-base font-semibold">
                                        {formatCurrency(personAmount)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            ) : (
                              <div className="py-12 text-center">
                                <p className="text-muted-foreground">
                                  {useEqualSplit
                                    ? 'Equal split - no specific items assigned'
                                    : 'No items assigned yet'}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex justify-end">
                            <DialogClose asChild>
                              <Button variant="outline">Close</Button>
                            </DialogClose>
                          </div>
                        </DialogContent>
                      </Dialog>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg bg-muted/30 p-6 text-center">
                <UserPlus className="mb-2 h-10 w-10 text-muted-foreground" />
                <h3 className="mb-1 text-lg font-medium">
                  Add People to Split the Bill
                </h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  Click "Manage People" to add friends and assign items to them.
                  Then tag each item with who should pay for it.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setShowPeopleManager(true)}
                >
                  <UserPlus className="mr-1 h-4 w-4" />
                  Manage People
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ReceiptAnalysisDisplay;
