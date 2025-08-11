import { cn } from "@/lib/utils";

const PersonBadge = ({
  name,
  className,
  size = "md",
}: {
  name: string;
  className?: string;
  size: "sm" | "md" | "lg";
}) => {
  const sizeClasses = {
    sm: "h-5 w-5 text-[10px]",
    md: "h-6 w-6 text-xs",
    lg: "h-8 w-8 text-sm",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-medium",
        sizeClasses[size as keyof typeof sizeClasses],
        className
      )}
      title={name}
    >
      {name.substring(0, 1).toUpperCase()}
    </div>
  );
};

export default PersonBadge;
