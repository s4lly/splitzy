import { DropdownMenuItem } from '../ui/dropdown-menu';
import { Plus } from 'lucide-react';

export default function AddAllMenuItem({
  people,
  filteredPeople,
  assignedPeople,
  onAddAll,
}: {
  people: string[];
  filteredPeople: string[];
  assignedPeople: string[];
  onAddAll: (person: string) => void;
}) {
  if (!(people.length > 0 && filteredPeople.length > 1)) return null;

  return (
    <DropdownMenuItem
      onClick={() => {
        filteredPeople.forEach((person) => {
          if (!assignedPeople.includes(person)) {
            onAddAll(person);
          }
        });
      }}
      className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300"
    >
      <Plus className="h-4 w-4" />
      Add all
    </DropdownMenuItem>
  );
}
