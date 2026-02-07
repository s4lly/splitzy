import { getAvatarChipColors } from '@/components/Receipt/utils/avatar-chip-colors';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMobile } from '@/hooks/useMobile';
import { getInitials } from '@/lib/get-initials';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';

interface PeopleManagerFormProps {
  people: string[];
  receiptId: number;
  newPersonName: string;
  onNewPersonNameChange: (name: string) => void;
  onAddPerson: () => void;
  onRemovePerson: (person: string) => void;
}

export const PeopleManagerForm = ({
  people,
  receiptId,
  newPersonName,
  onNewPersonNameChange,
  onAddPerson,
  onRemovePerson,
}: PeopleManagerFormProps) => {
  const isMobile = useMobile();
  const chipColors =
    people.length > 0 ? getAvatarChipColors(receiptId, people) : null;

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
        {people.map((person) => {
          const c = chipColors?.get(person);
          return (
            <div
              key={person}
              className="flex items-center rounded-full px-3 py-1"
            >
              <Avatar className={cn('ring-1', c?.ring)} title={person}>
                <AvatarFallback className={cn(c?.bg, c?.text)}>
                  {getInitials(person)}
                </AvatarFallback>
              </Avatar>
              <span className="ml-1 text-sm">{person}</span>
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
