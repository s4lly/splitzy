import { useMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export const AssignmentsContainer = ({
  children,
  className,
  isSelected,
  clickCallback,
}: {
  children: React.ReactNode;
  className?: string;
  isSelected?: boolean;
  clickCallback?: (e: React.MouseEvent) => void;
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
    >
      {children}
    </Container>
  );
};
