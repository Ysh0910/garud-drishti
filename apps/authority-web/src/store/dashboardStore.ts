import { create } from 'zustand';

export type HorizonKey = 'current' | '6h' | '24h' | '48h' | '72h';
export const HORIZONS: HorizonKey[] = ['current', '6h', '24h', '48h', '72h'];
export const HORIZON_LABEL: Record<HorizonKey, string> = {
  current: 'Current',
  '6h': '6h',
  '24h': '24h',
  '48h': '48h',
  '72h': '72h',
};
/** Only current + 24h are trained/validated at hackathon scope — contracts/risk.md §5. */
export const HORIZON_VALIDATED: Record<HorizonKey, boolean> = {
  current: true,
  '6h': false,
  '24h': true,
  '48h': false,
  '72h': false,
};

export type ScrubKey = '-24h' | '-12h' | 'now' | '+6h' | '+24h' | '+48h' | '+72h';
export const SCRUB_STEPS: ScrubKey[] = ['-24h', '-12h', 'now', '+6h', '+24h', '+48h', '+72h'];
export const SCRUB_TO_HORIZON: Record<ScrubKey, HorizonKey> = {
  '-24h': 'current',
  '-12h': 'current',
  now: 'current',
  '+6h': '6h',
  '+24h': '24h',
  '+48h': '48h',
  '+72h': '72h',
};

export type RankBy = 'RISK_X_EXPOSURE' | 'SCORE' | 'TREND';

export type MapLayer = 'RISK' | 'INVENTORY' | 'RAINFALL' | 'SLOPE' | 'ROADS';

/** The eight NER states — real administrative names, not derived from mock zone data. */
export const NER_STATES = [
  'All States',
  'Arunachal Pradesh',
  'Assam',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Sikkim',
  'Tripura',
] as const;

interface DashboardState {
  selectedCellId: string;
  selectedState: string;
  selectedDistrict: string;
  horizon: HorizonKey;
  scrub: ScrubKey;
  coarse: boolean;
  confidenceTexture: boolean;
  rankBy: RankBy;
  reportFilter: 'PENDING' | 'ALL';
  activeReportId: string | null;
  activeMapLayer: MapLayer;

  selectZone: (cellId: string) => void;
  /** Select a zone AND bring its state/district filter along — for cross-scope jumps (e.g. from Response Priority). */
  jumpToZone: (cellId: string, state: string) => void;
  setSelectedState: (state: string) => void;
  setSelectedDistrict: (district: string) => void;
  setHorizon: (h: HorizonKey) => void;
  setScrub: (s: ScrubKey) => void;
  toggleCoarse: () => void;
  toggleTexture: () => void;
  setRankBy: (r: RankBy) => void;
  setReportFilter: (f: 'PENDING' | 'ALL') => void;
  openReport: (id: string | null) => void;
  setMapLayer: (l: MapLayer) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedCellId: 'CELL_NER_001',
  selectedState: 'All States',
  selectedDistrict: 'All districts',
  horizon: 'current',
  scrub: 'now',
  coarse: false,
  confidenceTexture: true,
  rankBy: 'RISK_X_EXPOSURE',
  reportFilter: 'PENDING',
  activeReportId: null,
  activeMapLayer: 'RISK',

  selectZone: (cellId) => set({ selectedCellId: cellId }),
  jumpToZone: (cellId, state) => set({ selectedCellId: cellId, selectedState: state, selectedDistrict: 'All districts' }),
  setSelectedState: (selectedState) => set({ selectedState, selectedDistrict: 'All districts' }),
  setSelectedDistrict: (selectedDistrict) => set({ selectedDistrict }),
  setHorizon: (horizon) => set({ horizon }),
  setScrub: (scrub) => set({ scrub, horizon: SCRUB_TO_HORIZON[scrub] }),
  toggleCoarse: () => set((s) => ({ coarse: !s.coarse })),
  toggleTexture: () => set((s) => ({ confidenceTexture: !s.confidenceTexture })),
  setRankBy: (rankBy) => set({ rankBy }),
  setReportFilter: (reportFilter) => set({ reportFilter }),
  openReport: (activeReportId) => set({ activeReportId }),
  setMapLayer: (activeMapLayer) => set({ activeMapLayer }),
}));
