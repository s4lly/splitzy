import { useMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';

export const AssignmentsContainer = ({
  children,
  className,
  isSelected,
  clickCallback,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  isSelected?: boolean;
  clickCallback?: (e: React.MouseEvent) => void;
  /** Accessible name when rendered as a button (desktop). */
  ariaLabel?: string;
}) => {
  const isMobile = useMobile();

  const Container = isMobile ? 'div' : 'button';

  const handleClick = (e: React.MouseEvent) => {
    clickCallback?.(e);
  };

  return (
    <Container
      className={cn(
        'flex w-full items-center gap-2 rounded-full',
        !isMobile && 'bg-gray-100 p-2 dark:bg-muted',
        isSelected && 'bg-gray-200 dark:bg-accent',
        className
      )}
      onClick={handleClick}
      {...(Container === 'button' && ariaLabel
        ? { 'aria-label': ariaLabel }
        : {})}
      {...(Container === 'button' && typeof isSelected === 'boolean'
        ? { 'aria-expanded': isSelected }
        : {})}
    >
      {children}
    </Container>
  );
};
