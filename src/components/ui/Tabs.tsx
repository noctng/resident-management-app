import React, { createContext, useContext, useState } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compound components must be used within <Tabs>');
  }
  return context;
}

interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value,
  onValueChange,
  children,
  className = '',
}) => {
  const [uncontrolledTab, setUncontrolledTab] = useState(defaultValue);
  const activeTab = value !== undefined ? value : uncontrolledTab;

  const handleTabChange = (newValue: string) => {
    if (value === undefined) {
      setUncontrolledTab(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className={`w-full ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`inline-flex items-center gap-1 p-1 bg-surface-alt/70 border border-brand-border rounded-xl shadow-inner ${className}`}
      role="tablist"
    >
      {children}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  icon,
  badge,
  disabled = false,
  className = '',
}) => {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(value)}
      className={[
        'inline-flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg',
        'transition-all duration-150 cursor-pointer select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        isActive
          ? 'bg-surface text-ink shadow-xs border border-brand-border/60'
          : 'text-ink-soft hover:text-ink hover:bg-surface/50',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
        className,
      ].join(' ')}
    >
      {icon && <span className={isActive ? 'text-accent' : 'text-ink-soft'}>{icon}</span>}
      <span>{children}</span>
      {badge && <span className="ml-0.5">{badge}</span>}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className = '' }) => {
  const { activeTab } = useTabs();
  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      className={`focus:outline-none animate-fade-in ${className}`}
    >
      {children}
    </div>
  );
};

export default Tabs;
