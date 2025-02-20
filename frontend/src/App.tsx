import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext';
import { ContractProvider } from './contexts/ContractContext';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';

// Pages
import Dashboard from './pages/Dashboard';
import LoanMarket from './pages/LoanMarket';
import CreditScore from './pages/CreditScore';
import HedgeMonitor from './components/HedgeMonitor';
import Navigation from './components/Navigation';
import WalletConnect from './components/WalletConnect';

// Constants
import { APTOS_NODE_URL, MODULE_ADDRESS } from './config';

function App() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WalletProvider>
        <ContractProvider
          nodeUrl={APTOS_NODE_URL}
          moduleAddress={MODULE_ADDRESS}
        >
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Navigation />
              
              {!isWalletConnected ? (
                <WalletConnect onConnect={() => setIsWalletConnected(true)} />
              ) : (
                <div className="container mx-auto px-4 py-8">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/loans" element={<LoanMarket />} />
                    <Route path="/credit" element={<CreditScore />} />
                    <Route path="/hedge" element={<HedgeMonitor />} />
                  </Routes>
                </div>
              )}
            </div>
          </Router>
        </ContractProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
