import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ConsolePage from './pages/ConsolePage';
import SituationReportPage from './pages/SituationReportPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ConsolePage />} />
        <Route path="/situation-report" element={<SituationReportPage />} />
      </Routes>
    </BrowserRouter>
  );
}
