import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ConsolePage from './pages/ConsolePage';
import SituationReportPage from './pages/SituationReportPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ConsolePage />} />
          <Route path="/situation-report" element={<SituationReportPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
