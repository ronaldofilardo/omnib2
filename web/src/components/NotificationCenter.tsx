"use client";
import React, { useEffect, useState } from 'react';
import AssociateNotificationModal from './AssociateNotificationModal';
import CreateEventFromNotificationModal from './CreateEventFromNotificationModal';
import { Bell } from 'lucide-react';

export interface Notification {
  id: string;
  type: string;
  payload: {
    doctorName: string;
    examDate: string;
    report: {
      fileName: string;
      fileContent: string;
    };
  };
  createdAt: string;
}

interface Professional {
  id: string;
  name: string;
}

interface NotificationCenterProps {
  userId: string
  onProfessionalCreated?: () => void
}

export default function NotificationCenter({ userId, onProfessionalCreated }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [associateModal, setAssociateModal] = useState<{ open: boolean; notification: Notification | null }>({ open: false, notification: null });
  const [createModal, setCreateModal] = useState<{ open: boolean; notification: Notification | null }>({ open: false, notification: null });
  const [professionalId, setProfessionalId] = useState<string>('');
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  // Buscar profissionais (salva todos)
  useEffect(() => {
    fetch('/api/professionals')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProfessionals(data);
      });
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    if (!userId) return;

    try {
      // Buscar notificações
      const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      const notificationsData = Array.isArray(data) ? data : data.notifications || [];

      // Quando as notificações são carregadas, significa que o usuário acessou a Central
      // Registrar timestamp de acesso para cada laudo
      const accessTimestamp = new Date().toISOString();
      console.log(`[NotificationCenter] ${notificationsData.length} notificações carregadas em ${accessTimestamp}`);

      for (const notification of notificationsData) {
        if (notification.payload?.reportId) {
          try {
            console.log(`[RECEIVED] Registrando acesso ao laudo ${notification.payload.reportId} em ${accessTimestamp}`);
            const response = await fetch(`/api/reports/${notification.payload.reportId}/access`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessTimestamp })
            });
            if (response.ok) {
              console.log(`[RECEIVED] Acesso ao laudo ${notification.payload.reportId} registrado com sucesso em ${accessTimestamp}`);
            } else {
              console.error(`[RECEIVED] Erro ao registrar acesso ao laudo ${notification.payload.reportId}:`, response.status, response.statusText);
            }
          } catch (error) {
            console.error(`[RECEIVED] Erro ao registrar acesso ao laudo ${notification.payload.reportId}:`, error);
          }
        }
      }

      setNotifications(notificationsData);
      setLoading(false);
    } catch (error) {
      setError('Erro ao carregar notificações');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  if (loading) return (
    <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0 h-screen overflow-y-auto">
      <div className="flex items-center justify-center h-full text-gray-400 text-lg">Carregando notificações...</div>
    </div>
  );
  if (error) return (
    <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0 h-screen overflow-y-auto">
      <div className="flex items-center justify-center h-full text-red-500 text-lg">{error}</div>
    </div>
  );
  if (notifications.length === 0) return (
    <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0 h-screen overflow-y-auto">
      <div className="flex items-center justify-center h-full text-gray-400 text-lg">Sem notificações pendentes.</div>
    </div>
  );

  // Substituir setCreateModal para buscar o profissional correto
  const handleCreateModal = (notification: Notification) => {
    const doctorName = notification.payload.doctorName?.trim().toLowerCase();
    const found = professionals.find(p => p.name.trim().toLowerCase() === doctorName);
    setProfessionalId(found ? found.id : (professionals[0]?.id || ''));
    setCreateModal({ open: true, notification });
  };

  // Atualizar profissionais após criar evento
  const handleSuccess = () => {
    fetchNotifications();
    // Atualiza profissionais localmente também
    fetch('/api/professionals')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProfessionals(data);
      });
    if (onProfessionalCreated) onProfessionalCreated();
  }

  return (
    <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0 h-screen overflow-y-auto">
      <div className="max-w-2xl mx-auto py-8 px-2">
        <h2 className="text-2xl font-bold mb-6 text-[#1E40AF]">Central de Notificações</h2>
        <ul className="space-y-6">
          {notifications.map((n) => (
            <li
              key={n.id}
              className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex flex-col gap-2"
            >
              <div className="text-base font-semibold text-[#10B981] mb-1 flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#F59E42]" aria-label="Notificação de laudo" />
                <span>Laudo recebido:</span>
                <span className="text-gray-700 font-normal">{n.payload.report.fileName}</span>
              </div>
              <div className="text-sm text-gray-700"><strong>Médico:</strong> {n.payload.doctorName}</div>
              <div className="text-sm text-gray-700"><strong>Data do exame:</strong> {(() => {
                const d = n.payload.examDate;
                if (!d) return '';
                const [y, m, day] = d.split('-');
                return `${day}-${m}-${y}`;
              })()}</div>
              <div className="text-sm text-gray-500"><strong>Recebido em:</strong> {new Date(n.createdAt).toLocaleString()}</div>
              <div className="flex gap-3 mt-3">
                <button
                  className="bg-[#1E40AF] hover:bg-[#2563EB] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  onClick={() => setAssociateModal({ open: true, notification: n })}
                >
                  Associar a evento existente
                </button>
                <button
                  className="bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  onClick={() => handleCreateModal(n)}
                >
                  Criar novo evento
                </button>
              </div>
            </li>
          ))}
        </ul>
        {/* Modal de associação */}
        <AssociateNotificationModal
          notification={associateModal.notification}
          open={associateModal.open}
          onClose={() => setAssociateModal({ open: false, notification: null })}
          onSuccess={fetchNotifications}
          userId={userId}
        />
        {/* Modal de criação */}
        {createModal.notification && (
          <CreateEventFromNotificationModal
            open={createModal.open}
            onClose={() => setCreateModal({ open: false, notification: null })}
            onSuccess={handleSuccess}
            notification={createModal.notification}
            professionalId={professionalId}
            userId={userId}
            refreshProfessionals={onProfessionalCreated}
          />
        )}
      </div>
    </div>
  );
}
