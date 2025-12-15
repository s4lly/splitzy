import { Receipt } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card/40 py-2">
      <div className="flex flex-col items-center justify-between gap-2 px-1 sm:container md:flex-row">
        <div className="flex items-center gap-1">
          <Receipt className="h-4 w-4" />
          <p className="text-xs font-medium">
            © {new Date().getFullYear()} Splitzy
          </p>
        </div>
      </div>
    </footer>
  );
}
