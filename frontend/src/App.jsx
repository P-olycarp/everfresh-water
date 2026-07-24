import { useEffect, useState } from 'react';

import Login from './Login';

import DailyEntry from './DailyEntry.jsx';
import MpesaEntry from './MpesaEntry.jsx';
import Bottles from './Bottles.jsx';
import Debts from './Debts.jsx';
import History from './History.jsx';
import Capital from './Capital.jsx';
import Expenses from './Expenses.jsx';
import Reports from './Reports.jsx';

const ATTENDANT_TABS = [
  { id: 'entry', label: 'Daily Entry' },
  { id: 'mpesa', label: 'M-Pesa Agent' },
  { id: 'bottles', label: 'Bottle Sales' },
  { id: 'debts', label: 'Debts' },
  { id: 'history', label: 'History' },
];

const ADMIN_TABS = [
  ...ATTENDANT_TABS,
  { id: 'capital', label: 'Capital & Water' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'reports', label: 'Reports' },
];

const TAB_COMPONENTS = {
  entry: DailyEntry,
  mpesa: MpesaEntry,
  bottles: Bottles,
  debts: Debts,
  history: History,
  capital: Capital,
  expenses: Expenses,
  reports: Reports,
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('entry');

  useEffect(() => {
    const saved = localStorage.getItem('user');

    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setActiveTab('entry');
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const role = user.role;

  const tabs =
    role === 'admin'
      ? ADMIN_TABS
      : ATTENDANT_TABS;

  const ActiveComponent =
    TAB_COMPONENTS[activeTab] || DailyEntry;

  const today = new Date().toLocaleDateString(
    'en-GB',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  );

  return (
    <div className="app">

      <div className="topbar">

        <div className="topbar-left">

          <div className="topbar-wordmark">
            EVER<span>FRESH</span> WATER
          </div>

          <div className="topbar-date">
            {today}
          </div>

        </div>

        <div className="topbar-right">

          <span className="role-badge">
            {user.name} ({user.role})
          </span>

          <button
            className="switch-role-btn"
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </div>

      <div className="tabs">

        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${
              activeTab === tab.id ? 'active' : ''
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}

      </div>

      <div className="main">
        <ActiveComponent />
      </div>

    </div>
  );
}