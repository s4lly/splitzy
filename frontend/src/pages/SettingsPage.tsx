import { useContext, useState } from "react";
import { ChevronRight, ArrowLeft, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useMobile } from "@/hooks/use-mobile";
import {
  useFeatureFlag,
  useFeatureFlagDispatch,
  FeatureFlagStateContext,
} from "@/context/FeatureFlagProvider";

export default function SettingsPage() {
  const [selectedCategory, setSelectedCategory] = useState("feature-flags");
  const [showDetails, setShowDetails] = useState(false);
  const isMobile = useMobile();

  const categories = [
    { id: "feature-flags", name: "Feature Flags" },
    // { id: "account", name: "Account" },
    // { id: "notifications", name: "Notifications" },
    // { id: "privacy", name: "Privacy & Security" },
    // { id: "appearance", name: "Appearance" },
    // { id: "billing", name: "Billing" },
  ];

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
    <div className="container mx-auto py-6 px-4 md:px-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Categories List - Hidden on mobile when details are shown */}
        {(!isMobile || !showDetails) && (
          <div className="md:w-1/4 w-full">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="p-2">
                <nav className="grid gap-1">
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={
                        selectedCategory === category.id ? "secondary" : "ghost"
                      }
                      className="justify-start h-auto py-3 px-4 w-full"
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
          <div className="md:w-3/4 w-full">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              {isMobile && showDetails && (
                <div className="p-4 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackClick}
                    className="mb-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Settings
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
    case "feature-flags":
      return <FeatureFlagsSettings />;
    case "account":
      return <AccountSettings />;
    case "notifications":
      return <NotificationSettings />;
    case "privacy":
      return <PrivacySettings />;
    case "appearance":
      return <AppearanceSettings />;
    case "billing":
      return <BillingSettings />;
    default:
      return <div>Select a category</div>;
  }
}

function FeatureFlagsSettings() {
  const dispatch = useFeatureFlagDispatch();

  const receiptDesktopTable = useFeatureFlag("receipt-desktop-table");
  const { isOverridden } = useContext(FeatureFlagStateContext);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Feature Flags</h3>
          <p className="text-sm text-muted-foreground">
            Enable or disable features in your application.
          </p>
        </div>
        {isOverridden && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                dispatch({
                  type: "CLEAR_FLAGS",
                });
              }}
            >
              <TriangleAlert className="h-4 w-4" />
              Reset All Flags
            </Button>
          </div>
        )}
      </div>
      <Separator />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="beta-features">Receipt Desktop Table</Label>
            <p className="text-sm text-muted-foreground">
              Use new desktop table design for receipts.
            </p>
          </div>
          <Switch
            id="beta-features"
            checked={receiptDesktopTable}
            onCheckedChange={() => {
              dispatch({
                type: "SET_FLAG",
                name: "receipt-desktop-table",
                value: {
                  location: "local",
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
        <h3 className="text-lg font-medium">Account Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account information and preferences.
        </p>
      </div>
      <Separator />
      <p className="text-sm">Account settings content would go here.</p>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notification Settings</h3>
        <p className="text-sm text-muted-foreground">
          Control how and when you receive notifications.
        </p>
      </div>
      <Separator />
      <p className="text-sm">Notification settings content would go here.</p>
    </div>
  );
}

function PrivacySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Privacy & Security</h3>
        <p className="text-sm text-muted-foreground">
          Manage your privacy and security settings.
        </p>
      </div>
      <Separator />
      <p className="text-sm">Privacy settings content would go here.</p>
    </div>
  );
}

function AppearanceSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Customize the look and feel of the application.
        </p>
      </div>
      <Separator />
      <p className="text-sm">Appearance settings content would go here.</p>
    </div>
  );
}

function BillingSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Billing</h3>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and payment methods.
        </p>
      </div>
      <Separator />
      <p className="text-sm">Billing settings content would go here.</p>
    </div>
  );
}
