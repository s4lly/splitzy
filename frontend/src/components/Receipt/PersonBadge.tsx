import { cn } from '@/lib/utils';

const PersonBadge = ({
  name,
  className,
  size = 'md',
  colorStyle,
}: {
  name: string;
  className?: string;
  size: 'sm' | 'md' | 'lg';
  colorStyle?: React.CSSProperties;
}) => {
  const sizeClasses = {
    sm: 'h-5 w-5 text-[10px]',
    md: 'h-6 w-6 text-xs',
    lg: 'h-8 w-8 text-sm',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-medium [background-color:var(--bg-light)] [color:var(--text-light)] dark:[background-color:var(--bg-dark)] dark:[color:var(--text-dark)]',
        sizeClasses[size as keyof typeof sizeClasses],
        className
      )}
      style={colorStyle}
      title={name}
    >
      {name.substring(0, 1).toUpperCase()}
    </div>
  );
};

export default PersonBadge;
