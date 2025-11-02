"use client";
import React, { useEffect, useState } from 'react';

interface NotificationPayloadLab {
  doctorName: string;
  examDate: string;
  report: {
    fileName: string;
    fileContent: string;
  };
}

interface NotificationPayloadReport {
  reportId: string;
  title: string;
  protocol: string;
}

type NotificationUnion =
  | { id: string; payload: NotificationPayloadLab }
  | { id: string; payload: NotificationPayloadReport };

interface Professional {
  id: string;
  name: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  professionalId: string;
  files?: { slot: string; name: string; url: string }[];
}


interface AssociateNotificationModalProps {
  notification: NotificationUnion | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

export default function AssociateNotificationModal({ notification, open, onClose, onSuccess, userId }: AssociateNotificationModalProps) {

  useEffect(() => {
    if (open) {
      fetch('/api/professionals')
        .then(res => res.json())
        .then(data => setProfessionals(Array.isArray(data) ? data : []));
    }
  }, [open]);

  useEffect(() => {
    if (open && userId) {
      fetch(`/api/events?userId=${encodeURIComponent(userId)}`)
        .then(res => res.json())
        .then(data => setEvents(Array.isArray(data) ? data : []))
        .catch(() => setError('Erro ao buscar eventos.'));
    }
  }, [open, userId]);

  // ...restante do componente...

  // Detecta o tipo de payload
  const isLabPayload = (payload: any): payload is NotificationPayloadLab =>
    payload && typeof payload.doctorName === 'string' && typeof payload.examDate === 'string' && payload.report;
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [showOverwritePrompt, setShowOverwritePrompt] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  useEffect(() => {
    if (open) {
      fetch('/api/professionals')
        .then(res => res.json())
        .then(data => setProfessionals(Array.isArray(data) ? data : []));
    }
  }, [open]);

  useEffect(() => {
    if (open && userId) {
      fetch(`/api/events?userId=${encodeURIComponent(userId)}`)
        .then(res => res.json())
        .then(data => setEvents(Array.isArray(data) ? data : []))
        .catch(() => setError('Erro ao buscar eventos.'));
    }
  }, [open, userId]);

  const handleAssociate = async (overwrite = false) => {
    if (!selectedEvent || !notification) return;
    setLoading(true);
    setError(null);
      try {
        // Só executa se for payload de laudo
        if (isLabPayload(notification.payload)) {
          const event = events.find(ev => ev.id === selectedEvent);
          if (!event) throw new Error('Evento não encontrado.');

          // Primeiro, salvar o arquivo fisicamente
          const fileName = `result-${notification.payload.report.fileName}`;
          const fileContent = notification.payload.report.fileContent;

          const formData = new FormData();
          formData.append('file', new File([Buffer.from(fileContent, 'base64')], notification.payload.report.fileName));
          formData.append('slot', 'result');
          formData.append('eventId', event.id);

          await fetch('/api/upload-file', {
            method: 'POST',
            body: formData
          });

          // Adiciona o arquivo do laudo ao slot correto (result/Laudo/Resultado)
          const newFile = {
            slot: 'result',
            name: notification.payload.report.fileName,
            url: `/uploads/${event.id}/${fileName}`,
            uploadDate: new Date().toISOString().split('T')[0]
          };
          // Remove duplicatas do mesmo slot
          const files = [
            ...(event.files?.filter(f => f.slot !== 'result') || []),
            newFile
          ];
          const payload = {
            id: event.id,
            title: event.title,
            date: event.date,
            type: event.type,
            startTime: event.startTime,
            endTime: event.endTime,
            professionalId: event.professionalId,
            files,
            notificationId: notification.id
          };
          const res = await fetch('/api/events', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(overwrite ? { 'x-overwrite-result': 'true' } : {})
            },
            body: JSON.stringify(payload),
          });
          if (res.status === 409) {
            // Backend retornou conflito, perguntar ao usuário
            setShowOverwritePrompt(true);
            setPendingPayload(payload);
            setLoading(false);
            return;
          }
          // Atualizar status do laudo para VIEWED
          if (notification?.payload) {
            const reportId = (notification.payload as any).reportId;
            if (reportId) {
              try {
                console.log('Atualizando status do laudo para VIEWED (associação):', reportId);
                const response = await fetch(`/api/reports/${reportId}/status`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'VIEWED' })
                });
                if (response.ok) {
                  console.log('Status do laudo atualizado com sucesso para VIEWED (associação)');
                } else {
                  console.error('Erro na resposta da API:', response.status, response.statusText);
                }
              } catch (error) {
                console.error('Erro ao atualizar status do laudo:', error);
              }
            }
   
            // Marcar notificação como READ quando o laudo é associado
            try {
              await fetch(`/api/notifications/${notification.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'READ' })
              });
            } catch (error) {
              console.error('Erro ao marcar notificação como READ:', error);
            }
          }

          if (!res.ok) throw new Error('Erro ao associar notificação.');
          onSuccess();
          onClose();
        }
    } catch (e) {
      setError('Erro ao associar notificação.');
    } finally {
      setLoading(false);
    }
  };
  const reloadEvents = async () => {
    try {
      // Recarrega eventos
      const resEvents = await fetch(`/api/events?userId=${encodeURIComponent(userId)}`);
      const dataEvents = await resEvents.json();
      setEvents(Array.isArray(dataEvents) ? dataEvents : []);
      // Recarrega profissionais
      const resProfs = await fetch('/api/professionals');
      const dataProfs = await resProfs.json();
      setProfessionals(Array.isArray(dataProfs) ? dataProfs : []);
    } catch {
      setEvents([]);
      setProfessionals([]);
    }
  };

  const handleConfirmOverwrite = async () => {
    if (!pendingPayload) return;
    setShowOverwritePrompt(false);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/events', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-overwrite-result': 'true',
        },
        body: JSON.stringify(pendingPayload),
      });
      // Atualizar status do laudo para VIEWED
      if (notification) {
        const reportId = (notification.payload as any).reportId;
        if (reportId) {
          try {
            const viewedTimestamp = new Date().toISOString();
            console.log(`[VIEWED] Registrando visualização do laudo ${reportId} em ${viewedTimestamp}`);
            const response = await fetch(`/api/reports/${reportId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'VIEWED' })
            });
            if (response.ok) {
              console.log(`[VIEWED] Visualização do laudo ${reportId} registrada com sucesso em ${viewedTimestamp}`);
            } else {
              console.error(`[VIEWED] Erro ao registrar visualização do laudo ${reportId}:`, response.status, response.statusText);
            }
          } catch (error) {
            console.error(`[VIEWED] Erro ao registrar visualização do laudo ${reportId}:`, error);
          }
        }
      }

      if (!res.ok) throw new Error('Erro ao sobrescrever laudo.');
      await reloadEvents();
      onSuccess();
      onClose();
    } catch (e) {
      setError('Erro ao sobrescrever laudo.');
      await reloadEvents();
    } finally {
      setLoading(false);
      setPendingPayload(null);
    }
  };

  const handleCancelOverwrite = async () => {
    setShowOverwritePrompt(false);
    setPendingPayload(null);
    await reloadEvents();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 min-w-[340px] max-w-full p-8 flex flex-col gap-4">
        <h3 className="text-lg font-bold text-[#1E40AF] mb-2">Associar a Evento Existente</h3>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        {showOverwritePrompt && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-yellow-900">
            Já existe um laudo para este evento.<br />Deseja sobrescrever o arquivo existente?
            <div className="flex gap-2 mt-3 justify-end">
              <button
                onClick={handleConfirmOverwrite}
                className="px-4 py-2 rounded-lg bg-[#1E40AF] text-white font-medium hover:bg-[#2563EB]"
                disabled={loading}
              >
                Sobrescrever
              </button>
              <button
                onClick={handleCancelOverwrite}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200"
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        <select
          value={selectedEvent}
          onChange={e => setSelectedEvent(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
        >
          <option value="">Selecione um evento</option>
          {events.map(ev => {
            // Formatar data para dd/mm/aaaa
            let dataFormatada = ev.date;
            if (ev.date && ev.date.includes('-')) {
              const [y, m, d] = ev.date.split('-');
              dataFormatada = `${d}/${m}/${y}`;
            }
            // Tipo amigável
            let tipo = ev.type === 'CONSULTATION' ? 'CONSULTA' : ev.type === 'EXAM' ? 'EXAME' : ev.type === 'PROCEDURE' ? 'PROCEDIMENTO' : ev.type === 'MEDICATION' ? 'MEDICAÇÃO' : ev.type;
            // Nome do profissional
            const prof = professionals.find(p => p.id === ev.professionalId);
            const profName = prof ? prof.name : '';
            return (
              <option key={ev.id} value={ev.id}>
                {tipo}{profName ? ` - ${profName}` : ''} - {dataFormatada} {ev.startTime}{ev.endTime ? `-${ev.endTime}` : ''}
              </option>
            );
          })}
        </select>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => handleAssociate(false)}
            disabled={loading || !selectedEvent}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${loading || !selectedEvent ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#1E40AF] hover:bg-[#2563EB]'}`}
          >
            Associar
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
