import { Receipt } from 'lucide-react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex h-[calc(100vh-58px)] flex-col">
      <div className="flex-1"></div>
      <div className="mx-auto mb-10 w-full max-w-md">
        <div className="mb-4 text-center">
          <div className="mb-1 flex items-center justify-center gap-2">
            <Receipt className="h-6 w-6" />
            <h1 className="text-xl font-bold">Splitzy</h1>
          </div>
          <p className="text-sm text-muted-foreground">Receipt Analysis Tool</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
