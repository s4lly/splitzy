import { formatCurrency } from "./utils/format-currency";
import PersonAssignmentSection from "./PersonAssignmentSection";
import { getIndividualItemTotalPrice } from "./utils/receipt-calculation";

export default function LineItemsTableDesktop({
  item,
  people,
  togglePersonAssignment,
}: {
  item: any;
  people: string[];
  togglePersonAssignment: (itemId: string, person: string) => void;
}) {
  return (
    <>
      <div className="hidden md:block col-span-5 truncate">
        <span className="text-base font-medium">{item.name}</span>
      </div>
      <div className="hidden md:block col-span-1 text-right">
        <span className="text-base font-medium">{item.quantity}</span>
      </div>
      <div className="hidden md:block col-span-2 text-right">
        <span className="text-base font-medium">
          {formatCurrency(item.price_per_item)}
        </span>
      </div>
      <div className="hidden md:block col-span-2 text-right font-medium">
        {formatCurrency(getIndividualItemTotalPrice(item))}
      </div>
      <div className="hidden md:flex col-span-2 justify-center">
        <PersonAssignmentSection
          item={item}
          people={people}
          togglePersonAssignment={togglePersonAssignment}
          className="justify-center"
        />
      </div>
    </>
  );
}
