import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export function useCrud(endpoint) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/${endpoint}/`);
      setData(Array.isArray(res.data) ? res.data : (res.data.results ?? []));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { refetch(); }, [refetch]);

  const create = async (payload) => {
    await api.post(`/${endpoint}/`, payload);
    await refetch();
  };

  const update = async (id, payload) => {
    await api.put(`/${endpoint}/${id}/`, payload);
    await refetch();
  };

  const remove = async (id) => {
    await api.delete(`/${endpoint}/${id}/`);
    await refetch();
  };

  return { data, loading, error, refetch, create, update, remove };
}
