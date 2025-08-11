import { useFeatureFlagEnabled } from "posthog-js/react";
import {
  createContext,
  useReducer,
  useContext,
  ReactNode,
  Dispatch,
  useEffect,
  useState,
} from "react";
import { DBSchema, openDB } from "idb";

// Define the shape of your feature flags
type FlagValue = {
  location: "unset" | "local" | "remote";
  value: boolean;
};

interface FeatureFlags {
  "receipt-desktop-table": FlagValue;
  "edit-line-items": FlagValue;
}

// Define actions
interface SetFlagAction {
  type: "SET_FLAG";
  value: FlagValue;
  name: keyof FeatureFlags;
}

interface SetFlagsAction {
  type: "SET_FLAGS";
  flags: FeatureFlags;
}

interface ClearFlagsAction {
  type: "CLEAR_FLAGS";
}

type FeatureFlagAction = SetFlagAction | SetFlagsAction | ClearFlagsAction;

// IndexedDB helpers
const DB_NAME = "feature-flag-store";
const STORE_NAME = "flags";

interface FeatureFlagDB extends DBSchema {
  flags: {
    key: string;
    value: {
      name: string;
      value: FlagValue;
    };
  };
}

const createFeatureFlagDB = async () => {
  openDB<FeatureFlagDB>(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
};

async function getFlagsFromDB(): Promise<FeatureFlags> {
  const db = await openDB<FeatureFlagDB>(DB_NAME);

  const flags = await db.getAll(STORE_NAME);

  return flags.reduce((acc, flag) => {
    acc[flag.name as keyof FeatureFlags] = flag.value;
    return acc;
  }, {} as FeatureFlags);
}

async function setFlagInDB(flag: string, value: FlagValue) {
  const db = await openDB<FeatureFlagDB>(DB_NAME);
  await db.put(STORE_NAME, { name: flag, value }, flag);
}

async function clearFlagsFromDB() {
  const db = await openDB<FeatureFlagDB>(DB_NAME);
  await db.clear(STORE_NAME);
}

// Initial state
const initialFlags: FeatureFlags = {
  "receipt-desktop-table": { location: "unset", value: false },
  "edit-line-items": { location: "unset", value: false },
};

// Reducer
function featureFlagReducer(
  state: FeatureFlags,
  action: FeatureFlagAction
): FeatureFlags {
  switch (action.type) {
    case "SET_FLAGS":
      return action.flags;

    case "SET_FLAG":
      setFlagInDB(action.name, action.value);

      return {
        ...state,
        [action.name]: action.value,
      };

    case "CLEAR_FLAGS":
      clearFlagsFromDB();
      return initialFlags;

    default:
      return state;
  }
}

// Contexts
export const FeatureFlagStateContext = createContext<{
  featureFlags: FeatureFlags;
  isOverridden: boolean;
}>({ featureFlags: initialFlags, isOverridden: false });
const FeatureFlagDispatchContext = createContext<
  Dispatch<FeatureFlagAction> | undefined
>(undefined);

// Provider
export const FeatureFlagProvider = ({ children }: { children: ReactNode }) => {
  const [isDBCreated, setIsDBCreated] = useState(false);
  const [state, dispatch] = useReducer(featureFlagReducer, initialFlags);

  useEffect(() => {
    createFeatureFlagDB().then(() => {
      setIsDBCreated(true);
    });
  }, []);

  useEffect(() => {
    const fetchFlags = async () => {
      const flags = await getFlagsFromDB();
      dispatch({ type: "SET_FLAGS", flags });
    };

    if (isDBCreated) {
      fetchFlags();
    }
  }, [isDBCreated]);

  return (
    <FeatureFlagStateContext.Provider
      value={{
        featureFlags: state,
        isOverridden: Object.values(state).some(
          (flag) => flag.location !== "unset"
        ),
      }}
    >
      <FeatureFlagDispatchContext.Provider value={dispatch}>
        {children}
      </FeatureFlagDispatchContext.Provider>
    </FeatureFlagStateContext.Provider>
  );
};

// Hooks for consuming context

export function useFeatureFlag(flag: keyof FeatureFlags) {
  const { featureFlags } = useContext(FeatureFlagStateContext);
  const specificFeatureRemoteValue = useFeatureFlagEnabled(flag);

  if (!featureFlags[flag] || featureFlags[flag].location === "unset") {
    return specificFeatureRemoteValue;
  }

  return featureFlags[flag].location === "local"
    ? featureFlags[flag].value
    : specificFeatureRemoteValue;
}

export function useFeatureFlagDispatch() {
  const context = useContext(FeatureFlagDispatchContext);
  if (context === undefined) {
    throw new Error(
      "useFeatureFlagDispatch must be used within a FeatureFlagProvider"
    );
  }
  return context;
}
