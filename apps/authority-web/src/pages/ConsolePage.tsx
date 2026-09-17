import Header from '../components/layout/Header';
import KpiRow from '../components/kpi/KpiRow';
import ZoneTriagePanel from '../components/triage/ZoneTriagePanel';
import RiskMapPanel from '../components/map/RiskMapPanel';
import SelectedZonePanel from '../components/zone/SelectedZonePanel';
import AlertCenterPanel from '../components/alerts/AlertCenterPanel';
import CitizenReportQueuePanel from '../components/reports/CitizenReportQueuePanel';
import ReportReviewModal from '../components/reports/ReportReviewModal';
import ResponsePriorityPanel from '../components/priority/ResponsePriorityPanel';

export default function ConsolePage() {
  return (
    <div style={{ minHeight: '100%', background: 'var(--page-bg)' }}>
      <div style={{ maxWidth: 1760, margin: '0 auto', background: 'var(--page-bg)' }}>
        <Header runLabel="RUN 2026-09-13T14:30Z" updatedLabel="Updated 8 min ago" />

        <KpiRow />

        <div id="map-and-zone-row" className="grid-divider" style={{ gridTemplateColumns: '380px minmax(0,1fr) 340px', alignItems: 'stretch' }}>
          <ZoneTriagePanel />
          <RiskMapPanel />
          <SelectedZonePanel />
        </div>

        <div style={{ background: 'var(--panel-bg)', borderTop: '1px solid var(--hairline)' }}>
          <ResponsePriorityPanel />
        </div>

        <div className="grid-divider" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
          <AlertCenterPanel />
          <CitizenReportQueuePanel />
        </div>
      </div>

      <ReportReviewModal />
    </div>
  );
}
