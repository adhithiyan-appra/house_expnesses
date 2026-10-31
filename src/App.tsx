import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppProvider';
import Layout from './components/Layout';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import Labour from './pages/Labour';
import Materials from './pages/Materials';
import OtherExpenses from './pages/OtherExpenses';
import History from './pages/History';
import Budget from './pages/Budget';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Toast />
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/labour" element={<Labour />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/other" element={<OtherExpenses />} />
            <Route path="/history" element={<History />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
}
