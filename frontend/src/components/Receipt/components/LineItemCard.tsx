import clsx from 'clsx';

export default function LineItemCard({
  selected,
  children,
}: {
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        'mb-3 overflow-hidden rounded-lg border-4 border-border/40 text-base',
        selected && 'ring-2 ring-accent ring-blue-300'
      )}
    >
      {children}
    </div>
  );
}
