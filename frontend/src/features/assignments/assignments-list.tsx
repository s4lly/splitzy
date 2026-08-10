import { useAuth } from '@clerk/react-router';
import { Trans, useLingui } from '@lingui/react/macro';
import Decimal from 'decimal.js';
import React, { useReducer, useState } from 'react';

import { getAvatarChipColors } from '@/components/Receipt/utils/avatar-chip-colors';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFeatureFlag } from '@/context/FeatureFlagProvider';
import { ClaimReceiptUserDialog } from '@/features/assignments/ClaimReceiptUserDialog';
import AddPersonPanel from '@/features/assignments/components/AddPersonPanel';
import AssignedList from '@/features/assignments/components/AssignedList';
import { SignInToClaimDialog } from '@/features/assignments/SignInToClaimDialog';
import SplitPercentTab from '@/features/assignments/SplitPercentTab';
import { SwitchReceiptUserDialog } from '@/features/assignments/SwitchReceiptUserDialog';
import type { Assignment } from '@/models/Assignment';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';
import { getReceiptUserDisplayName } from '@/utils/user-display';

// ── Dialog state machine ────────────────────────────────────────────────────

type DialogState =
  | { kind: 'none' }
  | { kind: 'claim'; id: string; name: string }
  | { kind: 'signIn'; id: string; name: string }
  | {
      kind: 'switch';
      previousId: string;
      previousName: string;
      newId: string;
      newName: string;
    };

type DialogAction = { type: 'open'; dialog: DialogState } | { type: 'close' };

function dialogReducer(_state: DialogState, action: DialogAction): DialogState {
  return action.type === 'open' ? action.dialog : { kind: 'none' };
}

// ── Props ───────────────────────────────────────────────────────────────────

interface AssignmentsListProps {
  receiptId: number;
  possiblePeople: string[]; // ULID receipt user IDs
  onAddExistingPerson: (receiptUserId: string) => void;
  onAddNewPerson: (displayName: string) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  item: ReceiptLineItem;
  formPricePerItem: Decimal;
  formQuantity: Decimal;
  allAssignments?: readonly Assignment[]; // All assignments across the receipt (optional)
}

// ── Component ───────────────────────────────────────────────────────────────

const AssignmentsList: React.FC<AssignmentsListProps> = ({
  receiptId,
  possiblePeople,
  onAddExistingPerson,
  onAddNewPerson,
  onRemoveAssignment,
  item,
  formPricePerItem,
  formQuantity,
  allAssignments,
}) => {
  const { t } = useLingui();
  const { userId: clerkUserId } = useAuth();

  // Single-state for the three mutually-exclusive dialogs
  const [dialog, dispatch] = useReducer(dialogReducer, { kind: 'none' });

  const [newPerson, setNewPerson] = useState('');
  const [selectedTab, setSelectedTab] = useState<'assignment' | 'split'>(
    'assignment'
  );

  const activeAssignments = item.assignments.filter(
    (assignment) => !assignment.deletedAt
  );
  const splitDisabled = activeAssignments.length < 2;
  // Derive the effective tab during render: when splitting is disabled the
  // 'split' tab collapses to 'assignment' without storing a corrected value.
  const tabValue =
    splitDisabled && selectedTab === 'split' ? 'assignment' : selectedTab;

  const newPersonSanitized = newPerson.trim();
  const assignmentsAddAllEnabled = !!useFeatureFlag('assignments-add-all');

  const assignedReceiptUserIds = item.assignments.map((a) => a.receiptUserId);
  const filteredReceiptUserIds = calculations.utils.filterPeople(
    possiblePeople,
    assignedReceiptUserIds
  );

  const chipColors = getAvatarChipColors(receiptId, possiblePeople);

  // Helper to get display name for a receiptUserId
  // Uses all assignments across receipt if available, otherwise falls back to item's assignments
  const getDisplayNameForReceiptUserId = (receiptUserId: string): string => {
    const assignmentsToUse = allAssignments ?? item.assignments;
    const assignment = assignmentsToUse.find(
      (a) => a.receiptUserId === receiptUserId
    );
    return getReceiptUserDisplayName(
      assignment?.receiptUser ?? null,
      receiptUserId
    );
  };

  const handleAddExisting = (receiptUserId: string) => {
    onAddExistingPerson(receiptUserId);
    setNewPerson('');
  };

  const handleAddNew = (displayName: string) => {
    onAddNewPerson(displayName);
    setNewPerson('');
  };

  // Derive typed dialog targets for the dialog components
  const claimTarget = dialog.kind === 'claim' ? dialog : null;
  const signInTarget = dialog.kind === 'signIn' ? dialog : null;
  const switchTarget = dialog.kind === 'switch' ? dialog : null;

  return (
    <>
      {claimTarget !== null && (
        <ClaimReceiptUserDialog
          open={claimTarget !== null}
          onOpenChange={(open) => !open && dispatch({ type: 'close' })}
          receiptUserId={claimTarget.id}
          displayName={claimTarget.name}
        />
      )}
      {signInTarget !== null && (
        <SignInToClaimDialog
          open={signInTarget !== null}
          onOpenChange={(open) => !open && dispatch({ type: 'close' })}
          displayName={signInTarget.name}
        />
      )}
      {switchTarget !== null && (
        <SwitchReceiptUserDialog
          open={switchTarget !== null}
          onOpenChange={(open) => !open && dispatch({ type: 'close' })}
          previousReceiptUser={{
            id: switchTarget.previousId,
            name: switchTarget.previousName,
          }}
          newReceiptUser={{
            id: switchTarget.newId,
            name: switchTarget.newName,
          }}
          receiptId={receiptId}
          possiblePeople={possiblePeople}
        />
      )}
      <Tabs
        value={tabValue}
        onValueChange={(v) => setSelectedTab(v as 'assignment' | 'split')}
        className="w-full"
      >
        <TabsList className="grid h-auto w-full grid-cols-2">
          <TabsTrigger value="assignment">
            <Trans>Assignment</Trans>
          </TabsTrigger>
          <TabsTrigger value="split" disabled={splitDisabled}>
            <Trans>Split %</Trans>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="assignment">
          <div className="flex flex-col gap-4 rounded-md p-2 md:flex-row">
            <AssignedList
              receiptId={receiptId}
              possiblePeople={possiblePeople}
              item={item}
              formPricePerItem={formPricePerItem}
              formQuantity={formQuantity}
              allAssignments={allAssignments}
              onRemoveAssignment={onRemoveAssignment}
              onClaimAction={(id, name) =>
                dispatch({ type: 'open', dialog: { kind: 'claim', id, name } })
              }
              onSignInAction={(id, name) =>
                dispatch({ type: 'open', dialog: { kind: 'signIn', id, name } })
              }
              onSwitchAction={(previousId, previousName, newId, newName) =>
                dispatch({
                  type: 'open',
                  dialog: {
                    kind: 'switch',
                    previousId,
                    previousName,
                    newId,
                    newName,
                  },
                })
              }
            />
            <AddPersonPanel
              newPerson={newPerson}
              onNewPersonChange={setNewPerson}
              filteredReceiptUserIds={filteredReceiptUserIds}
              assignmentsAddAllEnabled={assignmentsAddAllEnabled}
              getDisplayNameForReceiptUserId={getDisplayNameForReceiptUserId}
              onAddExisting={handleAddExisting}
              onAddNew={handleAddNew}
              onAddAll={() =>
                filteredReceiptUserIds.forEach((id) => handleAddExisting(id))
              }
            />
          </div>
        </TabsContent>
        <TabsContent value="split">
          <SplitPercentTab
            item={item}
            chipColors={chipColors}
            formPricePerItem={formPricePerItem}
            formQuantity={formQuantity}
          />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default AssignmentsList;
