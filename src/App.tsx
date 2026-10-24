import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { StoreProvider, useStore } from './lib/store/StoreProvider';
import { Ask } from './pages/Ask';
import { Family } from './pages/Family';
import { Help } from './pages/Help';
import { Log, LogEntry, LogNew } from './pages/Log';
import { Me } from './pages/Me';
import { Now } from './pages/Now';
import { PaperMaker, Papers } from './pages/Papers';
import { SignIn } from './pages/SignIn';
import { Start } from './pages/Start';
import { AboutThem, Contacts, Crisis, KeptPapers, Them } from './pages/Them';
import { Medicines } from './pages/Medicines';
import { Today } from './pages/Today';

function NeedsCircle({ children }: { children: ReactNode }) {
  const { ready, circle } = useStore();
  if (!ready) return <p className="muted p-6">Opening…</p>;
  if (!circle) return <Navigate to="/start" replace />;
  return children;
}

export function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/start" element={<Start />} />
          <Route path="/signin" element={<SignIn />} />
          <Route
            element={
              <NeedsCircle>
                <Layout />
              </NeedsCircle>
            }
          >
            <Route index element={<Today />} />
            <Route path="now" element={<Now />} />
            <Route path="log" element={<Log />} />
            <Route path="log/new/:kind" element={<LogNew />} />
            <Route path="log/:id" element={<LogEntry />} />
            <Route path="them" element={<Them />} />
            <Route path="them/about" element={<AboutThem />} />
            <Route path="them/medicines" element={<Medicines />} />
            <Route path="them/crisis" element={<Crisis />} />
            <Route path="them/contacts" element={<Contacts />} />
            <Route path="them/papers" element={<KeptPapers />} />
            <Route path="family" element={<Family />} />
            <Route path="papers" element={<Papers />} />
            <Route path="papers/:kind" element={<PaperMaker />} />
            <Route path="help" element={<Help />} />
            <Route path="ask" element={<Ask />} />
            <Route path="me" element={<Me />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
