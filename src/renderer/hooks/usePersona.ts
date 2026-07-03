import { useState, useEffect, useCallback } from 'react';
import type { Persona } from '../../shared/types';
import { PERSONA_TEMPLATES } from '../../shared/types';
import { api } from '../lib/api';

export function usePersona() {
  const [persona, setPersona] = useState<Persona>(PERSONA_TEMPLATES.academic);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPersona().then(p => {
      if (p) setPersona(p);
      setLoading(false);
    });
  }, []);

  const savePersona = useCallback(async (p: Persona) => {
    await api.setPersona(p);
    setPersona(p);
  }, []);

  return { persona, setPersona, savePersona, loading };
}
