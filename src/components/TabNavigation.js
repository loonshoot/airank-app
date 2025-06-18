import React from 'react';

const TabNavigation = ({ tabs, activeTab, setActiveTab }) => (
  <div className="">
    <nav className="flex border-b border-gray-100" aria-label="Data Navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`text-left mr-4 py-3 text-sm font-medium -mb-px ${
            activeTab === tab.id
              ? 'border-gray-900 text-gray-900 border-b-2'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  </div>
);

export default TabNavigation; 