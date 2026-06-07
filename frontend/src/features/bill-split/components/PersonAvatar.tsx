import { useLingui } from '@lingui/react/macro';
import { Check } from 'lucide-react';

import { Avatar, AvatarBadge, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/get-initials';
import { cn } from '@/lib/utils';

export interface PersonAvatarProps {
  displayName: string;
  chipColors?: { ring?: string; bg?: string; text?: string };
  isLinkedToSignedInUser: boolean;
}

/**
 * Avatar for a person in the bill breakdown: colored initials with an optional
 * "linked to your account" badge. Rendered both in the person card and the
 * per-person items dialog header.
 */
export const PersonAvatar = ({
  displayName,
  chipColors: c,
  isLinkedToSignedInUser,
}: PersonAvatarProps) => {
  const { t } = useLingui();

  return (
    <Avatar
      className={cn(
        'ring-1',
        c?.ring,
        isLinkedToSignedInUser && 'overflow-visible'
      )}
      title={displayName}
    >
      <AvatarFallback className={cn(c?.bg, c?.text)}>
        {getInitials(displayName)}
      </AvatarFallback>
      {isLinkedToSignedInUser && (
        <AvatarBadge
          className="bg-green-600 text-white ring-2 ring-background dark:bg-green-700 dark:text-white"
          aria-label={t`Linked to your account`}
        >
          <Check className="size-2.5" aria-hidden />
        </AvatarBadge>
      )}
    </Avatar>
  );
};
