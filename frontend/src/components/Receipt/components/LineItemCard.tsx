import clsx from "clsx";

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
        "border-4 rounded-lg border-border/40 overflow-hidden mb-3 text-base",
        selected && "ring-2 ring-accent ring-blue-300"
      )}
    >
      {children}
    </div>
  );
}
