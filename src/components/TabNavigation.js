import React from 'react';

const TabNavigation = ({ tabs, activeTab, setActiveTab }) => (
  <div className="">
    <nav className="flex border-b border-border" aria-label="Data Navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`text-left mr-4 py-3 text-sm font-medium -mb-px transition-colors ${
            activeTab === tab.id
              ? 'border-green-600 text-green-600 border-b-2'
              : 'border-transparent text-muted-foreground hover:text-green-600 hover:border-green-600'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  </div>
);

export default TabNavigation; 