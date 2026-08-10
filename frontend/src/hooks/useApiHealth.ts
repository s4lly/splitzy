import { useQuery } from '@tanstack/react-query';

const API_URL =
  import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export type ApiHealthStatus = 'checking' | 'healthy' | 'unhealthy';

const fetchApiHealth = async (): Promise<'healthy' | 'unhealthy'> => {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) {
    return 'unhealthy';
  }
  const data = await response.json();
  return data.status === 'healthy' ? 'healthy' : 'unhealthy';
};

/**
 * Polls the backend health endpoint. Every caller must go through this hook:
 * React Query dedupes by key, so a second `['api-health']` query with a
 * different return shape would hand its value to whichever consumer rendered
 * first and misreport the API status.
 */
export function useApiHealth(): ApiHealthStatus {
  const { data, isError } = useQuery({
    queryKey: ['api-health'],
    queryFn: fetchApiHealth,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isError) {
    return 'unhealthy';
  }

  return data ?? 'checking';
}
