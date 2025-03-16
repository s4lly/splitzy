import { cn } from "../../lib/utils";

/**
 * Skeleton component for loading states
 */
const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
};

export { Skeleton }; 