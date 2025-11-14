# filepath: frontend/src/pages/Dashboard/PatientRecord.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function PatientRecord() {
  const { id: routeId } = useParams<{ id?: string }>();
  const [patient, setPatient] = useState<any | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = routeId;
    if (!id) return;
    setLoadingPatient(true);
    setError(null);

    fetch(`/.netlify/functions/get-patient?id=${encodeURIComponent(id)}`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) { const txt = await res.text(); throw new Error(`${res.status} ${txt}`); }
        return res.json();
      })
      .then((data) => setPatient(data))
      .catch((err) => { console.error('Failed to load patient', err); setError(String(err)); })
      .finally(() => setLoadingPatient(false));
  }, [routeId]);

  if (loadingPatient) return <div>Carregando paciente...</div>;
  if (error) return <div>Erro: {error}</div>;
  if (!patient) return <div>Paciente não encontrado</div>;

  return (
    <div>
      <h2>{patient.name || '—'}</h2>
      <p>CPF: {patient.cpf || '—'}</p>
      <p>Telefone: {patient.phone || '—'}</p>
    </div>
  );
}
