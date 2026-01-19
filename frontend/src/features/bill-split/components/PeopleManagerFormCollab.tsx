import PersonBadge from '@/components/Receipt/PersonBadge';
import {
  getColorForName,
  getColorStyle,
} from '@/components/Receipt/utils/get-color-for-name';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { peopleAtom } from '@/features/receipt-collab/atoms/receiptAtoms';
import { useMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';
import { useAtomValue } from 'jotai';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

export const PeopleManagerFormCollab = () => {
  const isMobile = useMobile();
  const people = useAtomValue(peopleAtom);
  const [newPersonName, setNewPersonName] = useState('');

  const handleAddPerson = () => {
    // Blank implementation - no operation
    if (newPersonName.trim() && !people.includes(newPersonName.trim())) {
      setNewPersonName('');
    }
  };

  const handleRemovePerson = (_person: string) => {
    // Blank implementation - no operation
  };

  return (
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
        {people.map((person, index) => {
          const colorPair = getColorForName(person, index, people.length);
          const colorStyle = getColorStyle(colorPair);
          return (
            <div
              key={person}
              className="flex items-center rounded-full px-3 py-1"
              style={colorStyle}
            >
              <PersonBadge
                name={person}
                size="sm"
                colorStyle={colorStyle}
                className={cn(!isMobile && 'border-2 border-white')}
              />
              <span className="ml-1 text-sm [color:var(--text-light)] dark:[color:var(--text-dark)]">
                {person}
              </span>
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
  );
};
