import { Trans, useLingui } from '@lingui/react/macro';
import { ArrowLeft, ChevronRight, TriangleAlert } from 'lucide-react';
import { useContext, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  FeatureFlagStateContext,
  useFeatureFlag,
  useFeatureFlagDispatch,
} from '@/context/FeatureFlagProvider';
import { useMobile } from '@/hooks/useMobile';

export default function SettingsPage() {
  const [selectedCategory, setSelectedCategory] = useState('feature-flags');
  const [showDetails, setShowDetails] = useState(false);
  const isMobile = useMobile();
  const { t } = useLingui();

  const categories = [{ id: 'feature-flags', name: t`Feature Flags` }];

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (isMobile) {
      setShowDetails(true);
    }
  };

  const handleBackClick = () => {
    setShowDetails(false);
  };

  return (
    <div className="container mx-auto px-4 py-6 md:px-6">
      <h1 className="mb-6 text-2xl font-bold">
        <Trans>Settings</Trans>
      </h1>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Categories List - Hidden on mobile when details are shown */}
        {(!isMobile || !showDetails) && (
          <div className="w-full md:w-1/4">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="p-2">
                <nav className="grid gap-1">
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={
                        selectedCategory === category.id ? 'secondary' : 'ghost'
                      }
                      className="h-auto w-full justify-start px-4 py-3"
                      onClick={() => handleCategoryClick(category.id)}
                    >
                      <span className="flex-1 text-left">{category.name}</span>
                      {isMobile && <ChevronRight className="h-4 w-4" />}
                    </Button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Settings Details - Full width on mobile, shown conditionally */}
        {(!isMobile || showDetails) && (
          <div className="w-full md:w-3/4">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              {isMobile && showDetails && (
                <div className="border-b p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackClick}
                    className="mb-2"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    <Trans>Back to Settings</Trans>
                  </Button>
                </div>
              )}
              <div className="p-6">
                <SettingsContent categoryId={selectedCategory} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface SettingsContentProps {
  categoryId: string;
}

function SettingsContent({ categoryId }: SettingsContentProps) {
  switch (categoryId) {
    case 'feature-flags':
      return <FeatureFlagsSettings />;
    case 'account':
      return <AccountSettings />;
    case 'notifications':
      return <NotificationSettings />;
    case 'privacy':
      return <PrivacySettings />;
    case 'appearance':
      return <AppearanceSettings />;
    case 'billing':
      return <BillingSettings />;
    default:
      return (
        <div>
          <Trans>Select a category</Trans>
        </div>
      );
  }
}

function FeatureFlagsSettings() {
  const dispatch = useFeatureFlagDispatch();

  const receiptDesktopTable = useFeatureFlag('receipt-desktop-table');
  const { isOverridden } = useContext(FeatureFlagStateContext);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">
            <Trans>Feature Flags</Trans>
          </h3>
          <p className="text-sm text-muted-foreground">
            <Trans>Enable or disable features in your application.</Trans>
          </p>
        </div>
        {isOverridden && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                dispatch({
                  type: 'CLEAR_FLAGS',
                });
              }}
            >
              <TriangleAlert className="h-4 w-4" />
              <Trans>Reset All Flags</Trans>
            </Button>
          </div>
        )}
      </div>
      <Separator />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="beta-features">
              <Trans>Receipt Desktop Table</Trans>
            </Label>
            <p className="text-sm text-muted-foreground">
              <Trans>Use new desktop table design for receipts.</Trans>
            </p>
          </div>
          <Switch
            id="beta-features"
            checked={receiptDesktopTable}
            onCheckedChange={() => {
              dispatch({
                type: 'SET_FLAG',
                name: 'receipt-desktop-table',
                value: {
                  location: 'local',
                  value: !receiptDesktopTable,
                },
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}

function AccountSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">
          <Trans>Account Settings</Trans>
        </h3>
        <p className="text-sm text-muted-foreground">
          <Trans>Manage your account information and preferences.</Trans>
        </p>
      </div>
      <Separator />
      <p className="text-sm">
        <Trans>Account settings content would go here.</Trans>
      </p>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">
          <Trans>Notification Settings</Trans>
        </h3>
        <p className="text-sm text-muted-foreground">
          <Trans>Control how and when you receive notifications.</Trans>
        </p>
      </div>
      <Separator />
      <p className="text-sm">
        <Trans>Notification settings content would go here.</Trans>
      </p>
    </div>
  );
}

function PrivacySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">
          <Trans>Privacy & Security</Trans>
        </h3>
        <p className="text-sm text-muted-foreground">
          <Trans>Manage your privacy and security settings.</Trans>
        </p>
      </div>
      <Separator />
      <p className="text-sm">
        <Trans>Privacy settings content would go here.</Trans>
      </p>
    </div>
  );
}

function AppearanceSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">
          <Trans>Appearance</Trans>
        </h3>
        <p className="text-sm text-muted-foreground">
          <Trans>Customize the look and feel of the application.</Trans>
        </p>
      </div>
      <Separator />
      <p className="text-sm">
        <Trans>Appearance settings content would go here.</Trans>
      </p>
    </div>
  );
}

function BillingSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">
          <Trans>Billing</Trans>
        </h3>
        <p className="text-sm text-muted-foreground">
          <Trans>Manage your subscription and payment methods.</Trans>
        </p>
      </div>
      <Separator />
      <p className="text-sm">
        <Trans>Billing settings content would go here.</Trans>
      </p>
    </div>
  );
}
