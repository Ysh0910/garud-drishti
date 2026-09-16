import { ReportCategory } from './enums';
import { RiskPointResponse } from './risk';

export type RootStackParamList = {
  Home: undefined;
  ReportHazard: { preselectedCategory?: ReportCategory } | undefined;
  ReportConfirmation: {
    reportId: string;
    clientReportId: string;
    capturedAt: string;
    category: string;
    latitude: number;
    longitude: number;
    isOfflineQueued: boolean;
  };
  MyReports: undefined;
  RiskDetail: { riskData?: RiskPointResponse } | undefined;
};
