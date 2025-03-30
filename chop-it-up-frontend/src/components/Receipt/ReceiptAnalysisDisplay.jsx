import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Calendar, ShoppingBag, Tag, Receipt, Users, Plus, X, UserPlus, Check, AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '../ui/dialog';

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

// Define color pairs for consistent theming - each contains:
// [bg-light-mode, text-light-mode, bg-dark-mode, text-dark-mode]
const COLOR_PAIRS = [
  ['bg-purple-100', 'text-purple-800', 'bg-purple-700/50', 'text-purple-100'],
  ['bg-teal-100', 'text-teal-800', 'bg-teal-700/50', 'text-teal-100'],
  ['bg-amber-100', 'text-amber-800', 'bg-amber-700/50', 'text-amber-100'],
  ['bg-pink-100', 'text-pink-800', 'bg-pink-700/50', 'text-pink-100'],
  ['bg-green-100', 'text-green-800', 'bg-green-700/50', 'text-green-100'],
  ['bg-rose-100', 'text-rose-800', 'bg-rose-700/50', 'text-rose-100'],
  ['bg-indigo-100', 'text-indigo-800', 'bg-indigo-700/50', 'text-indigo-100'],
  ['bg-cyan-100', 'text-cyan-800', 'bg-cyan-700/50', 'text-cyan-100'],
  ['bg-orange-100', 'text-orange-800', 'bg-orange-700/50', 'text-orange-100'],
  ['bg-blue-100', 'text-blue-800', 'bg-blue-700/50', 'text-blue-100'],
];

// Get a deterministic color based on a name and position
const getColorForName = (name, index = 0, totalPeople = 1) => {
  // Always use index-based selection to ensure consistent color assignments
  // For single person or first person, use a safe default color
  if (totalPeople === 1 || index === 0) {
    // Use the first color in our reordered array, which is purple and looks good in dark mode
    return COLOR_PAIRS[0];
  }
  
  // For multiple people, distribute colors evenly
  if (totalPeople <= COLOR_PAIRS.length) {
    return COLOR_PAIRS[index % COLOR_PAIRS.length];
  }
  
  // For larger groups, use a combination of name hash and index
  let nameHash = 0;
  for (let i = 0; i < name.length; i++) {
    nameHash = ((nameHash << 5) - nameHash) + name.charCodeAt(i);
    nameHash = nameHash & nameHash; // Convert to 32bit integer
  }
  
  // Combine name hash with index for better distribution
  const combinedHash = (nameHash + index * 7) % COLOR_PAIRS.length;
  return COLOR_PAIRS[combinedHash];
};

// Component for rendering a person's badge with appropriate colors
const PersonBadge = ({ name, personIndex, totalPeople, size = "md", onClick }) => {
  // Get color pair for this person
  const colorPair = getColorForName(name, personIndex, totalPeople);
  
  // Size classes
  const sizeClasses = {
    sm: "h-5 w-5 text-[10px]",
    md: "h-6 w-6 text-xs",
    lg: "h-8 w-8 text-sm"
  };

  return (
    <div 
      className={`
        flex items-center justify-center rounded-full font-medium cursor-pointer 
        ${sizeClasses[size]}
        ${colorPair[0]} ${colorPair[1]}
        dark:${colorPair[2]} dark:${colorPair[3]}
      `}
      onClick={onClick}
      title={name}
    >
      {name.substring(0, 1).toUpperCase()}
    </div>
  );
};

const ReceiptAnalysisDisplay = ({ result }) => {
  // State for people and item assignments
  const [people, setPeople] = useState([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [itemAssignments, setItemAssignments] = useState({});
  const [showPeopleManager, setShowPeopleManager] = useState(false);
  // Add state for search inputs for each item
  const [searchInputs, setSearchInputs] = useState({});
  
  if (!result) return null;
  
  const { receipt_data } = result;

  // Calculate the amount each person owes
  const personTotals = people.reduce((acc, person) => {
    acc[person] = 0;
    return acc;
  }, {});

  // Track item totals per person (before tax)
  const personItemsTotals = {};
  
  // Calculate totals for each person
  if (receipt_data.line_items && receipt_data.line_items.length > 0) {
    // Calculate the sum of all assigned items to determine tax distribution
    let totalAssignedItemsValue = 0;
    
    // First pass: calculate item values per person (without tax)
    receipt_data.line_items.forEach((item, index) => {
      const itemId = `item-${index}`;
      const assignedPeople = itemAssignments[itemId] || [];
      
      if (assignedPeople.length > 0) {
        const pricePerPerson = item.total_price / assignedPeople.length;
        assignedPeople.forEach(person => {
          personItemsTotals[person] = (personItemsTotals[person] || 0) + pricePerPerson;
          totalAssignedItemsValue += pricePerPerson;
        });
      }
    });
    
    // Initialize person totals with their item costs
    Object.keys(personItemsTotals).forEach(person => {
      personTotals[person] = personItemsTotals[person];
    });
    
    // Add tax if not already included in item prices
    if (!receipt_data.tax_included_in_items && receipt_data.tax > 0 && totalAssignedItemsValue > 0) {
      const taxAmount = receipt_data.tax || 0;
      const pretaxTotal = receipt_data.pretax_total || receipt_data.items_total || 0;
      
      // Calculate effective tax rate (handle case where pretax might be 0)
      let taxRate = 0;
      if (pretaxTotal > 0) {
        taxRate = taxAmount / pretaxTotal;
      }
      
      // Distribute tax proportionally based on each person's items total
      Object.keys(personItemsTotals).forEach(person => {
        const personItemTotal = personItemsTotals[person];
        const personTaxAmount = personItemTotal * taxRate;
        personTotals[person] += personTaxAmount;
      });
    }

    // Add tip and gratuity if present
    const totalTip = (receipt_data.tip || 0) + (receipt_data.gratuity || 0);
    if (totalTip > 0 && people.length > 0) {
      const tipPerPerson = totalTip / people.length;
      people.forEach(person => {
        personTotals[person] = (personTotals[person] || 0) + tipPerPerson;
      });
    }
  } else if (people.length > 0) {
    // No line items available or no assignments made - split total evenly
    const receiptTotal = receipt_data.final_total || receipt_data.total || 0;
    const splitAmount = receiptTotal / people.length;
    
    // Assign even split amount to each person
    people.forEach(person => {
      personTotals[person] = splitAmount;
    });
  }
  
  // Check if we need to use equal split mode (no line items or no assignments made)
  const hasLineItems = receipt_data.line_items && receipt_data.line_items.length > 0;
  const noAssignmentsMade = hasLineItems && Object.keys(itemAssignments).length === 0;
  const useEqualSplit = !hasLineItems || noAssignmentsMade;

  // Calculate the total assigned and unassigned amounts
  const totalAssigned = Object.values(personTotals).reduce((sum, amount) => sum + amount, 0);
  const receiptTotal = receipt_data.total || 0;
  const unassignedAmount = Math.max(0, receiptTotal - totalAssigned);
  const isFullyAssigned = Math.abs(totalAssigned - receiptTotal) < 0.01; // Account for floating point rounding

  const handleAddPerson = () => {
    if (newPersonName.trim() && !people.includes(newPersonName.trim())) {
      setPeople([...people, newPersonName.trim()]);
      setNewPersonName('');
    }
  };

  const handleRemovePerson = (personToRemove) => {
    setPeople(people.filter(person => person !== personToRemove));
    
    // Also remove this person from all item assignments
    const updatedAssignments = {};
    Object.keys(itemAssignments).forEach(itemId => {
      updatedAssignments[itemId] = itemAssignments[itemId].filter(
        person => person !== personToRemove
      );
    });
    setItemAssignments(updatedAssignments);
  };

  const togglePersonAssignment = (itemId, person) => {
    const currentAssignments = itemAssignments[itemId] || [];
    
    if (currentAssignments.includes(person)) {
      // Remove person from item
      setItemAssignments({
        ...itemAssignments,
        [itemId]: currentAssignments.filter(p => p !== person)
      });
    } else {
      // Add person to item
      setItemAssignments({
        ...itemAssignments,
        [itemId]: [...currentAssignments, person]
      });
    }
  };
  
  // Add a function to handle search input change
  const handleSearchInputChange = (itemId, value) => {
    setSearchInputs({
      ...searchInputs,
      [itemId]: value
    });
  };
  
  // Add a function to handle searching and creating a new person
  const handleSearchAndAssign = (itemId, searchValue) => {
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
      [itemId]: ''
    });
  };

  // Find all items assigned to a person and their costs
  const getPersonItems = (person) => {
    if (!receipt_data.line_items) return [];
    
    const personItems = [];
    receipt_data.line_items.forEach((item, index) => {
      const itemId = `item-${index}`;
      const assignedPeople = itemAssignments[itemId] || [];
      
      if (assignedPeople.includes(person)) {
        const pricePerPerson = item.total_price / assignedPeople.length;
        personItems.push({
          name: item.name,
          quantity: item.quantity || 1,
          originalPrice: item.total_price,
          price: pricePerPerson,
          shared: assignedPeople.length > 1,
          sharedWith: assignedPeople.filter(p => p !== person),
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
      className="space-y-4 px-0 sm:px-4 max-w-full"
    >
      <div className="flex items-center gap-3 mb-2 px-2 sm:px-0">
        <Receipt className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Document Analysis</h2>
      </div>

      {/* Document Details Card - Now first */}
      <Card className="shadow-md border-2 overflow-hidden rounded-none sm:rounded-lg">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-xl font-bold flex items-center gap-3">
            <ShoppingBag className="h-6 w-6" />
            Document Details
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <div className="flex items-center gap-3 overflow-hidden">
              <Tag className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span className="text-base font-medium whitespace-nowrap">Merchant:</span>
              <span className="text-base ml-auto font-semibold truncate">
                {receipt_data.merchant || 'Unknown'}
              </span>
            </div>
            
            <div className="flex items-center gap-3 overflow-hidden">
              <Calendar className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span className="text-base font-medium whitespace-nowrap">Date:</span>
              <span className="text-base ml-auto font-semibold truncate">
                {receipt_data.date || 'Unknown'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Items Card - Second position */}
      <Card className="shadow-md border-2 overflow-hidden rounded-none sm:rounded-lg">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-xl font-bold flex items-center gap-3">
            <ShoppingBag className="h-6 w-6" />
            Items
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {receipt_data.line_items && receipt_data.line_items.length > 0 ? (
            <div className="space-y-4">
              {/* Table headers - visible only on medium screens and up */}
              <div className="hidden md:grid md:grid-cols-12 border-b-2 border-border pb-3 gap-3 text-base font-medium">
                <div className="col-span-5">Item</div>
                <div className="col-span-1 text-right">Qty</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-2 text-center">Assigned To</div>
              </div>
              
              {receipt_data.line_items.map((item, index) => {
                const itemId = `item-${index}`;
                const assignedPeople = itemAssignments[itemId] || [];
                const searchValue = searchInputs[itemId] || '';
                
                // Filter people based on search input
                const filteredPeople = searchValue 
                  ? people.filter(p => !assignedPeople.includes(p) && p.toLowerCase().includes(searchValue.toLowerCase()))
                  : people.filter(p => !assignedPeople.includes(p));
                
                return (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border rounded-lg border-border/40 overflow-hidden mb-3 md:mb-0 md:border-0 md:rounded-none md:grid md:grid-cols-12 md:gap-3 text-base md:py-3 md:border-b md:last:border-0 md:items-center"
                  >
                    {/* Mobile layout */}
                    <div className="md:hidden">
                      <div className="p-2 bg-muted/10 border-b border-border/40 flex justify-between items-center">
                        <div className="font-medium truncate pr-2 max-w-[70%]">{item.name}</div>
                        <div className="text-right font-semibold">{formatCurrency(item.total_price)}</div>
                      </div>
                      <div className="p-2 sm:p-3 flex flex-col gap-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Quantity:</span>
                          <span>{item.quantity || 1}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Unit Price:</span>
                          <span>{formatCurrency(item.price_per_item)}</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-border/20">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Assigned to:</span>
                            {assignedPeople.length === 0 && people.length > 0 && (
                              <div className="flex justify-center items-center h-full">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="ml-auto">
                                      <Plus className="h-4 w-4 mr-1" />
                                      Assign
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent 
                                    align="end" 
                                    className="w-56 p-2" 
                                    onCloseAutoFocus={(e) => e.preventDefault()}
                                  >
                                    <div className="mb-2">
                                      <Input
                                        placeholder="Search or add new..."
                                        className="h-8"
                                        value={searchValue || ''}
                                        onChange={(e) => handleSearchInputChange(itemId, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && e.target.value.trim()) {
                                            handleSearchAndAssign(itemId, e.target.value);
                                          } else {
                                            e.stopPropagation();
                                          }
                                        }}
                                        autoFocus
                                      />
                                    </div>
                                    <div className="max-h-[150px] overflow-y-auto">
                                      {people.length > 0 ? (
                                        filteredPeople.length > 0 ? (
                                          filteredPeople.map((person, idx) => (
                                            <DropdownMenuItem 
                                              key={idx} 
                                              onClick={() => {
                                                togglePersonAssignment(itemId, person);
                                                handleSearchInputChange(itemId, '');
                                              }}
                                              onKeyDown={(e) => e.stopPropagation()}
                                              className="flex items-center gap-2"
                                            >
                                              <PersonBadge name={person} personIndex={people.indexOf(person)} totalPeople={people.length} size="sm" />
                                              <span>{person}</span>
                                            </DropdownMenuItem>
                                          ))
                                        ) : searchValue ? (
                                          <div className="px-2 py-1 text-xs text-muted-foreground">
                                            No matching people. Press Enter to add "{searchValue}".
                                          </div>
                                        ) : (
                                          <div className="px-2 py-1 text-xs text-muted-foreground">
                                            All people assigned
                                          </div>
                                        )
                                      ) : (
                                        <div className="px-2 py-1 text-xs text-muted-foreground">
                                          No people added yet
                                        </div>
                                      )}
                                    </div>
                                    <div className="border-t mt-2 pt-2">
                                      <div className="px-2 py-1 text-xs text-muted-foreground">
                                        Type a name and press Enter to add
                                      </div>
                                    </div>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>
                          {people.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {assignedPeople.map((person, personIdx) => (
                                <div key={personIdx} className="flex items-center gap-1 bg-muted/20 rounded py-1 px-2 group">
                                  <PersonBadge 
                                    name={person}
                                    personIndex={people.indexOf(person)}
                                    totalPeople={people.length}
                                    size="sm"
                                  />
                                  <span className="text-xs">{person}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-4 w-4 p-0 rounded-full opacity-60 group-hover:opacity-100" 
                                    onClick={() => togglePersonAssignment(itemId, person)}
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              ))}
                              {assignedPeople.length > 0 && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-6 w-6 p-0 rounded-full">
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent 
                                    align="end" 
                                    className="w-56 p-2" 
                                    onCloseAutoFocus={(e) => e.preventDefault()}
                                  >
                                    <div className="mb-2">
                                      <Input
                                        placeholder="Search or add new..."
                                        className="h-8"
                                        value={searchValue || ''}
                                        onChange={(e) => handleSearchInputChange(itemId, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && e.target.value.trim()) {
                                            handleSearchAndAssign(itemId, e.target.value);
                                          } else {
                                            e.stopPropagation();
                                          }
                                        }}
                                        autoFocus
                                      />
                                    </div>
                                    <div className="max-h-[150px] overflow-y-auto">
                                      {people.length > 0 ? (
                                        filteredPeople.length > 0 ? (
                                          filteredPeople.map((person, idx) => (
                                            <DropdownMenuItem 
                                              key={idx} 
                                              onClick={() => {
                                                togglePersonAssignment(itemId, person);
                                                handleSearchInputChange(itemId, '');
                                              }}
                                              onKeyDown={(e) => e.stopPropagation()}
                                              className="flex items-center gap-2"
                                            >
                                              <PersonBadge name={person} personIndex={people.indexOf(person)} totalPeople={people.length} size="sm" />
                                              <span>{person}</span>
                                            </DropdownMenuItem>
                                          ))
                                        ) : searchValue ? (
                                          <div className="px-2 py-1 text-xs text-muted-foreground">
                                            No matching people. Press Enter to add "{searchValue}".
                                          </div>
                                        ) : (
                                          <div className="px-2 py-1 text-xs text-muted-foreground">
                                            All people assigned
                                          </div>
                                        )
                                      ) : (
                                        <div className="px-2 py-1 text-xs text-muted-foreground">
                                          No people added yet
                                        </div>
                                      )}
                                    </div>
                                    <div className="border-t mt-2 pt-2">
                                      <div className="px-2 py-1 text-xs text-muted-foreground">
                                        Type a name and press Enter to add
                                      </div>
                                    </div>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          ) : (
                            <div className="flex justify-center items-center h-full">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-1" />
                                    Assign
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent 
                                  align="end" 
                                  className="w-56 p-2" 
                                  onCloseAutoFocus={(e) => e.preventDefault()}
                                >
                                  <div className="mb-2">
                                    <Input
                                      placeholder="Add a new person..."
                                      className="h-8"
                                      value={searchValue || ''}
                                      onChange={(e) => handleSearchInputChange(itemId, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                          handleSearchAndAssign(itemId, e.target.value);
                                        } else {
                                          e.stopPropagation();
                                        }
                                      }}
                                      autoFocus
                                    />
                                  </div>
                                  <div className="max-h-[150px] overflow-y-auto">
                                    {people.length > 0 ? (
                                      filteredPeople.length > 0 ? (
                                        filteredPeople.map((person, idx) => (
                                          <DropdownMenuItem 
                                            key={idx} 
                                            onClick={() => {
                                              togglePersonAssignment(itemId, person);
                                              handleSearchInputChange(itemId, '');
                                            }}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            className="flex items-center gap-2"
                                          >
                                            <PersonBadge name={person} personIndex={people.indexOf(person)} totalPeople={people.length} size="sm" />
                                            <span>{person}</span>
                                          </DropdownMenuItem>
                                        ))
                                      ) : searchValue ? (
                                        <div className="px-2 py-1 text-xs text-muted-foreground">
                                          No matching people. Press Enter to add "{searchValue}".
                                        </div>
                                      ) : (
                                        <div className="px-2 py-1 text-xs text-muted-foreground">
                                          All people assigned
                                        </div>
                                      )
                                    ) : (
                                      <div className="px-2 py-1 text-xs text-muted-foreground">
                                        No people added yet
                                      </div>
                                    )}
                                  </div>
                                  <div className="border-t mt-2 pt-2">
                                    <div className="px-2 py-1 text-xs text-muted-foreground">
                                      Type a name and press Enter to add
                                    </div>
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden md:block col-span-5 truncate">{item.name}</div>
                    <div className="hidden md:block col-span-1 text-right">{item.quantity || 1}</div>
                    <div className="hidden md:block col-span-2 text-right">{formatCurrency(item.price_per_item)}</div>
                    <div className="hidden md:block col-span-2 text-right font-medium">{formatCurrency(item.total_price)}</div>
                    <div className="hidden md:flex col-span-2 justify-center">
                      {people.length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {assignedPeople.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {assignedPeople.map((person, personIdx) => (
                                <PersonBadge 
                                  key={personIdx} 
                                  name={person}
                                  personIndex={people.indexOf(person)}
                                  totalPeople={people.length}
                                  onClick={() => togglePersonAssignment(itemId, person)}
                                />
                              ))}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-6 w-6 p-0 rounded-full">
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent 
                                  align="end" 
                                  className="w-56 p-2" 
                                  onCloseAutoFocus={(e) => e.preventDefault()}
                                >
                                  <div className="mb-2">
                                    <Input
                                      placeholder="Search or add new..."
                                      className="h-8"
                                      value={searchValue || ''}
                                      onChange={(e) => handleSearchInputChange(itemId, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                          handleSearchAndAssign(itemId, e.target.value);
                                        } else {
                                          e.stopPropagation();
                                        }
                                      }}
                                      autoFocus
                                    />
                                  </div>
                                  <div className="max-h-[150px] overflow-y-auto">
                                    {people.length > 0 ? (
                                      filteredPeople.length > 0 ? (
                                        filteredPeople.map((person, idx) => (
                                          <DropdownMenuItem 
                                            key={idx} 
                                            onClick={() => {
                                              togglePersonAssignment(itemId, person);
                                              handleSearchInputChange(itemId, '');
                                            }}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            className="flex items-center gap-2"
                                          >
                                            <PersonBadge name={person} personIndex={people.indexOf(person)} totalPeople={people.length} size="sm" />
                                            <span>{person}</span>
                                          </DropdownMenuItem>
                                        ))
                                      ) : searchValue ? (
                                        <div className="px-2 py-1 text-xs text-muted-foreground">
                                          No matching people. Press Enter to add "{searchValue}".
                                        </div>
                                      ) : (
                                        <div className="px-2 py-1 text-xs text-muted-foreground">
                                          All people assigned
                                        </div>
                                      )
                                    ) : (
                                      <div className="px-2 py-1 text-xs text-muted-foreground">
                                        No people added yet
                                      </div>
                                    )}
                                  </div>
                                  <div className="border-t mt-2 pt-2">
                                    <div className="px-2 py-1 text-xs text-muted-foreground">
                                      Type a name and press Enter to add
                                    </div>
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ) : (
                            <div className="flex justify-center items-center h-full">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-1" />
                                    Assign
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent 
                                  align="end" 
                                  className="w-56 p-2" 
                                  onCloseAutoFocus={(e) => e.preventDefault()}
                                >
                                  <div className="mb-2">
                                    <Input
                                      placeholder="Add a new person..."
                                      className="h-8"
                                      value={searchValue || ''}
                                      onChange={(e) => handleSearchInputChange(itemId, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                          handleSearchAndAssign(itemId, e.target.value);
                                        } else {
                                          e.stopPropagation();
                                        }
                                      }}
                                      autoFocus
                                    />
                                  </div>
                                  <div className="max-h-[150px] overflow-y-auto">
                                    {people.length > 0 ? (
                                      filteredPeople.length > 0 ? (
                                        filteredPeople.map((person, idx) => (
                                          <DropdownMenuItem 
                                            key={idx} 
                                            onClick={() => {
                                              togglePersonAssignment(itemId, person);
                                              handleSearchInputChange(itemId, '');
                                            }}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            className="flex items-center gap-2"
                                          >
                                            <PersonBadge name={person} personIndex={people.indexOf(person)} totalPeople={people.length} size="sm" />
                                            <span>{person}</span>
                                          </DropdownMenuItem>
                                        ))
                                      ) : searchValue ? (
                                        <div className="px-2 py-1 text-xs text-muted-foreground">
                                          No matching people. Press Enter to add "{searchValue}".
                                        </div>
                                      ) : (
                                        <div className="px-2 py-1 text-xs text-muted-foreground">
                                          All people assigned
                                        </div>
                                      )
                                    ) : (
                                      <div className="px-2 py-1 text-xs text-muted-foreground">
                                        No people added yet
                                      </div>
                                    )}
                                  </div>
                                  <div className="border-t mt-2 pt-2">
                                    <div className="px-2 py-1 text-xs text-muted-foreground">
                                      Type a name and press Enter to add
                                    </div>
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex justify-center items-center h-full">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Plus className="h-4 w-4 mr-1" />
                                Assign
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                              align="end" 
                              className="w-56 p-2" 
                              onCloseAutoFocus={(e) => e.preventDefault()}
                            >
                              <div className="mb-2">
                                <Input
                                  placeholder="Add a new person..."
                                  className="h-8"
                                  value={searchValue || ''}
                                  onChange={(e) => handleSearchInputChange(itemId, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                      handleSearchAndAssign(itemId, e.target.value);
                                    } else {
                                      e.stopPropagation();
                                    }
                                  }}
                                  autoFocus
                                />
                              </div>
                              <div className="max-h-[150px] overflow-y-auto">
                                {people.length > 0 ? (
                                  filteredPeople.length > 0 ? (
                                    filteredPeople.map((person, idx) => (
                                      <DropdownMenuItem 
                                        key={idx} 
                                        onClick={() => {
                                          togglePersonAssignment(itemId, person);
                                          handleSearchInputChange(itemId, '');
                                        }}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        className="flex items-center gap-2"
                                      >
                                        <PersonBadge name={person} personIndex={people.indexOf(person)} totalPeople={people.length} size="sm" />
                                        <span>{person}</span>
                                      </DropdownMenuItem>
                                    ))
                                  ) : searchValue ? (
                                    <div className="px-2 py-1 text-xs text-muted-foreground">
                                      No matching people. Press Enter to add "{searchValue}".
                                    </div>
                                  ) : (
                                    <div className="px-2 py-1 text-xs text-muted-foreground">
                                      All people assigned
                                    </div>
                                  )
                                ) : (
                                  <div className="px-2 py-1 text-xs text-muted-foreground">
                                    No people added yet
                                  </div>
                                )}
                              </div>
                              <div className="border-t mt-2 pt-2">
                                <div className="px-2 py-1 text-xs text-muted-foreground">
                                  Type a name and press Enter to add
                                </div>
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4 text-center">
              <AlertCircle className="h-10 w-10 mx-auto mb-2 text-amber-500 dark:text-amber-400" />
              <p className="text-base font-medium text-amber-800 dark:text-amber-200 mb-1">No Item Details Available</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This {receipt_data.merchant ? "document from " + receipt_data.merchant : "document"} doesn't include detailed line items. 
                The total amount has been equally divided among all people.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Summary Card - Third position */}
      <Card className="shadow-md border-2 overflow-hidden rounded-none sm:rounded-lg">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-xl font-bold flex items-center gap-3">
            <DollarSign className="h-6 w-6" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="space-y-4">
            {/* Tax Information Alert */}
            {receipt_data.tax_included_in_items && (
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-2 sm:p-3 rounded-md mb-3 text-sm flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Tax Included in Prices</p>
                  <p>The tax is already included in the individual item prices shown.</p>
                </div>
              </div>
            )}

            {!receipt_data.tax_included_in_items && receipt_data.tax > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-2 sm:p-3 rounded-md mb-3 text-sm flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Tax Calculation</p>
                  <p>
                    {(() => {
                      const pretaxTotal = receipt_data.pretax_total || receipt_data.items_total || 0;
                      const taxRate = pretaxTotal > 0 ? (receipt_data.tax / pretaxTotal) * 100 : 0;
                      return `Tax rate is approximately ${taxRate.toFixed(2)}% and has been distributed proportionally based on each person's items.`;
                    })()}
                  </p>
                </div>
              </div>
            )}

            {/* Items Total */}
            <div className="flex justify-between items-center py-2">
              <span className="text-base">Items Total:</span>
              <span className="text-base font-medium">{formatCurrency(receipt_data.items_total || 0)}</span>
            </div>
            
            {/* Displayed Subtotal if different from items total */}
            {Math.abs((receipt_data.display_subtotal || 0) - (receipt_data.items_total || 0)) > 0.01 && (
              <div className="flex justify-between items-center py-1 sm:py-2">
                <span className="text-base">Subtotal (as shown):</span>
                <span className="text-base font-medium">{formatCurrency(receipt_data.display_subtotal || 0)}</span>
              </div>
            )}
            
            {/* Show pretax total if different from subtotal */}
            {Math.abs((receipt_data.pretax_total || 0) - (receipt_data.display_subtotal || 0)) > 0.01 && (
              <div className="flex justify-between items-center py-1 sm:py-2">
                <span className="text-base">Pre-tax Total:</span>
                <span className="text-base font-medium">{formatCurrency(receipt_data.pretax_total || 0)}</span>
              </div>
            )}
            
            {/* Tax Amount */}
            <div className="flex justify-between items-center py-1 sm:py-2">
              <div className="flex items-center">
                <span className="text-base">Tax:</span>
                {receipt_data.tax_included_in_items && (
                  <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full">Included in prices</span>
                )}
              </div>
              <span className="text-base font-medium">{formatCurrency(receipt_data.tax || 0)}</span>
            </div>
            
            {/* Post-tax total if different from final total */}
            {(receipt_data.tip > 0 || receipt_data.gratuity > 0) && (
              <div className="flex justify-between items-center py-1 sm:py-2">
                <span className="text-base">Post-tax Total:</span>
                <span className="text-base font-medium">{formatCurrency(receipt_data.posttax_total || 0)}</span>
              </div>
            )}
            
            {/* Tip and Gratuity */}
            {receipt_data.tip > 0 && (
              <div className="flex justify-between items-center py-1 sm:py-2">
                <span className="text-base">Tip:</span>
                <span className="text-base font-medium">{formatCurrency(receipt_data.tip)}</span>
              </div>
            )}
            
            {receipt_data.gratuity > 0 && (
              <div className="flex justify-between items-center py-1 sm:py-2">
                <span className="text-base">Gratuity:</span>
                <span className="text-base font-medium">{formatCurrency(receipt_data.gratuity)}</span>
              </div>
            )}
            
            {/* Final Total */}
            <div className="flex justify-between items-center pt-3 border-t-2 border-border mt-2">
              <span className="font-semibold text-base">Final Total:</span>
              <span className="font-bold text-xl">{formatCurrency(receipt_data.final_total || receipt_data.total || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* People Manager Section - Now at the bottom */}
      <Card className="shadow-md border-2 overflow-hidden rounded-none sm:rounded-lg">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-xl font-bold flex items-center justify-between">
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
            <div className={`mb-4 p-2 sm:p-3 border rounded-lg ${isFullyAssigned ? 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/30'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                <div className="flex items-center gap-2 mb-2 sm:mb-0">
                  {isFullyAssigned ? (
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  )}
                  <h3 className={`font-medium ${isFullyAssigned ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'}`}>
                    {isFullyAssigned ? 'All items assigned' : 'Assignment in progress'}
                  </h3>
                </div>
                <span className={`text-sm font-semibold ${isFullyAssigned ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {formatCurrency(totalAssigned)} / {formatCurrency(receiptTotal)}
                </span>
              </div>
              
              {!isFullyAssigned && (
                <div className="flex justify-between items-center mt-1 text-sm">
                  <span className="text-amber-700 dark:text-amber-400">Unassigned amount:</span>
                  <span className="font-medium text-amber-700 dark:text-amber-400">{formatCurrency(unassignedAmount)}</span>
                </div>
              )}
              
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${isFullyAssigned ? 'bg-green-500 dark:bg-green-600' : 'bg-amber-500 dark:bg-amber-600'}`}
                  style={{ width: `${Math.min(100, (totalAssigned / receiptTotal) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Equal Split Banner */}
          {useEqualSplit && people.length > 0 && (
            <div className="mb-4 p-3 border rounded-lg bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-800 dark:text-blue-300">Equal Split Mode</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    {!hasLineItems 
                      ? "This receipt doesn't contain detailed line items, so the total amount has been divided equally among all people."
                      : "No items have been assigned yet. The total has been divided equally among all people by default."
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {showPeopleManager && (
            <div className="mb-4 p-3 border rounded-lg bg-muted/20">
              <h3 className="font-medium mb-2">Add People to Split With</h3>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <Input
                  placeholder="Enter name"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                  className="w-full sm:max-w-xs"
                />
                <Button onClick={handleAddPerson} size="sm" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {people.map((person, idx) => {
                  const colorPair = getColorForName(person, idx, people.length);
                  return (
                    <div key={idx} className={`py-1 px-3 rounded-full flex items-center ${colorPair[0]} ${colorPair[1]} dark:${colorPair[2]} dark:${colorPair[3]}`}>
                      <PersonBadge name={person} personIndex={idx} totalPeople={people.length} size="sm" />
                      <span className="ml-1 text-sm">{person}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 w-5 ml-1 hover:bg-destructive/20 rounded-full p-0" 
                        onClick={() => handleRemovePerson(person)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
                {people.length === 0 && (
                  <p className="text-sm text-muted-foreground">No people added yet. Add people to split the bill.</p>
                )}
              </div>
            </div>
          )}
          
          {/* People Summary */}
          <div>
            {people.length > 0 ? (
              <div className="space-y-2">
                <h3 className="font-medium mb-1">Bill Breakdown</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {people.map((person, idx) => {
                    const colorPair = getColorForName(person, idx, people.length);
                    const personAmount = personTotals[person] || 0;
                    const percentage = receiptTotal > 0 ? ((personAmount / receiptTotal) * 100).toFixed(1) : '0';
                    const personItems = getPersonItems(person);
                    
                    return (
                      <Dialog key={idx}>
                        <DialogTrigger asChild>
                          <div 
                            className={`p-4 border rounded-lg ${colorPair[0]}/5 ${colorPair[1]}/80 dark:${colorPair[2]}/20 dark:${colorPair[3]}/90 cursor-pointer hover:shadow-md transition-shadow`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <PersonBadge name={person} personIndex={idx} totalPeople={people.length} size="md" />
                              <span className="font-medium truncate">{person}</span>
                            </div>
                            
                            {useEqualSplit ? (
                              <>
                                <div className="flex items-end justify-between">
                                  <div className="text-lg font-semibold">
                                    {formatCurrency(personTotals[person] || 0)}
                                  </div>
                                  <div className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300 rounded-full">
                                    Equal split
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {people.length > 0 ? `1/${people.length} of the total` : ''}
                                </div>
                              </>
                            ) : !receipt_data.tax_included_in_items && receipt_data.tax > 0 ? (
                              <>
                                <div className="flex items-end justify-between">
                                  <div className="text-sm text-muted-foreground">Items subtotal:</div>
                                  <div className="text-sm font-medium">
                                    {formatCurrency(personItemsTotals[person] || 0)}
                                  </div>
                                </div>
                                <div className="flex items-end justify-between mt-1">
                                  <div className="flex items-center text-sm text-muted-foreground">
                                    <span>Tax:</span>
                                  </div>
                                  <div className="text-sm font-medium">
                                    {(() => {
                                      const itemTotal = personItemsTotals[person] || 0;
                                      const taxRate = (receipt_data.tax / (receipt_data.pretax_total || receipt_data.items_total || 1)) || 0;
                                      const taxAmount = itemTotal * taxRate;
                                      return formatCurrency(taxAmount);
                                    })()}
                                  </div>
                                </div>
                                <div className="flex items-end justify-between mt-1 pt-1 border-t">
                                  <div className="text-base font-semibold">Total:</div>
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
                            
                            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              {!useEqualSplit 
                                ? (
                                  <>
                                    <FileText className="h-3 w-3" />
                                    {`${personItems.length} item${personItems.length !== 1 ? 's' : ''} assigned`}
                                  </>
                                )
                                : "Equal amount split"
                              }
                            </div>
                          </div>
                        </DialogTrigger>
                        
                        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <PersonBadge name={person} personIndex={idx} totalPeople={people.length} size="md" />
                              <span>{person}'s Items</span>
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="overflow-y-auto flex-grow">
                            {personItems.length > 0 ? (
                              <div className="border rounded-md overflow-hidden">
                                <table className="w-full">
                                  <thead>
                                    <tr className="bg-muted/50">
                                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Item</th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Price</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {personItems.map((item, itemIdx) => (
                                      <tr key={itemIdx} className={`border-t ${itemIdx % 2 ? 'bg-muted/20' : ''}`}>
                                        <td className="px-3 py-2.5 align-top">
                                          <div className="max-w-[200px] overflow-x-auto text-sm">
                                            {item.name}
                                          </div>
                                          {item.shared && (
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                              Shared with {item.sharedWith.join(', ')}
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-3 py-2.5 text-right text-sm align-top">
                                          {item.quantity}
                                        </td>
                                        <td className="px-3 py-2.5 text-right text-sm whitespace-nowrap align-top">
                                          <div className="font-medium">{formatCurrency(item.price)}</div>
                                          {item.shared && (
                                            <div className="text-xs text-muted-foreground">
                                              of {formatCurrency(item.originalPrice)}
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-muted/50 font-medium">
                                    <tr className="border-t">
                                      <td colSpan="2" className="px-3 py-2 text-sm">Subtotal</td>
                                      <td className="px-3 py-2 text-right text-sm">{formatCurrency(personItemsTotals[person] || 0)}</td>
                                    </tr>
                                    {!receipt_data.tax_included_in_items && receipt_data.tax > 0 && (
                                      <tr className="border-t">
                                        <td colSpan="2" className="px-3 py-2 text-sm">Tax</td>
                                        <td className="px-3 py-2 text-right text-sm">
                                          {(() => {
                                            const itemTotal = personItemsTotals[person] || 0;
                                            const taxRate = (receipt_data.tax / (receipt_data.pretax_total || receipt_data.items_total || 1)) || 0;
                                            const taxAmount = itemTotal * taxRate;
                                            return formatCurrency(taxAmount);
                                          })()}
                                        </td>
                                      </tr>
                                    )}
                                    <tr className="border-t">
                                      <td colSpan="2" className="px-3 py-2 text-base font-semibold">Total</td>
                                      <td className="px-3 py-2 text-right text-base font-semibold">{formatCurrency(personAmount)}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            ) : (
                              <div className="py-12 text-center">
                                <p className="text-muted-foreground">
                                  {useEqualSplit 
                                    ? "Equal split - no specific items assigned" 
                                    : "No items assigned yet"}
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
              <div className="flex flex-col items-center justify-center p-6 text-center bg-muted/30 rounded-lg">
                <UserPlus className="h-10 w-10 text-muted-foreground mb-2" />
                <h3 className="text-lg font-medium mb-1">Add People to Split the Bill</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Click "Manage People" to add friends and assign items to them. 
                  Then tag each item with who should pay for it.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4" 
                  onClick={() => setShowPeopleManager(true)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
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