import PersonBadge from '@/components/Receipt/PersonBadge';
import { getColorForName, getColorStyle } from '@/components/Receipt/utils/get-color-for-name';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';
import { useMobile } from '@/hooks/use-mobile';

interface PeopleManagerFormProps {
  people: string[];
  newPersonName: string;
  onNewPersonNameChange: (name: string) => void;
  onAddPerson: () => void;
  onRemovePerson: (person: string) => void;
}

export const PeopleManagerForm = ({
  people,
  newPersonName,
  onNewPersonNameChange,
  onAddPerson,
  onRemovePerson,
}: PeopleManagerFormProps) => {
  const isMobile = useMobile();

  return (
    <div className="mb-4 rounded-lg border bg-muted/20 p-3">
      <h3 className="mb-2 font-medium">Add People to Split With</h3>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Enter name"
          value={newPersonName}
          onChange={(e) => onNewPersonNameChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddPerson()}
          className="w-full sm:max-w-xs"
        />
        <Button onClick={onAddPerson} size="sm" className="w-full sm:w-auto">
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {people.map((person, idx) => {
          const colorPair = getColorForName(person, idx, people.length);
          const colorStyle = getColorStyle(colorPair);
          return (
            <div
              key={idx}
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
                onClick={() => onRemovePerson(person)}
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

