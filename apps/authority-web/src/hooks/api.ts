/**
 * Thin TanStack Query wrappers over services/api — this is what components should
 * actually import (never the mocks, never `api` directly, never fetch()). Swapping
 * VITE_USE_REAL_API doesn't require touching any of this file or its callers.
 */
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api, getPriorityRanking } from '../services/api';
import type { PrioritizationInputDto, ReportVerifyAction } from '../services/api/types';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.getDashboardSummary(),
    refetchInterval: 3000,
  });
}

export function useRiskGrid(bbox?: string) {
  return useQuery({
    queryKey: ['risk-grid', bbox],
    queryFn: () => api.getRiskGrid(bbox),
    refetchInterval: 5000,
  });
}

export function useZoneSummaries() {
  return useQuery({ queryKey: ['zone-summaries'], queryFn: () => api.getZoneSummaries(), refetchInterval: 10000 });
}

export function useZoneDetail(cellId: string | null) {
  return useQuery({
    queryKey: ['zone-detail', cellId],
    queryFn: () => api.getZoneDetail(cellId as string),
    enabled: cellId != null,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.getAlerts(),
    refetchInterval: 3000,
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { cell_id: string; severity: string; trigger_reason: string; zone_name?: string }) =>
      api.createAlert(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useApproveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, approverName }: { alertId: string; approverName: string }) =>
      api.approveAlert(alertId, approverName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, resolverName }: { alertId: string; resolverName: string }) =>
      api.resolveAlert(alertId, resolverName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: () => api.getReports(),
    refetchInterval: 3000,
  });
}

export function useVerifyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, action, rejectionReason }: { reportId: string; action: ReportVerifyAction; rejectionReason?: string }) =>
      api.verifyReport(reportId, action, rejectionReason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });
}

export function usePriorityRanking() {
  return useQuery({ queryKey: ['priority-ranking'], queryFn: () => getPriorityRanking(api) });
}

export function useEvaluatePriority(input: PrioritizationInputDto | null) {
  return useQuery({
    queryKey: ['priority-evaluate', input],
    queryFn: () => api.evaluatePriority(input as PrioritizationInputDto),
    enabled: input != null,
  });
}
