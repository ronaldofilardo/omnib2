'use client';

import { useEffect, useState } from 'react';

interface Report {
  id: string;
  protocol: string;
  title: string;
  fileName: string;
  fileUrl: string;
  status: string;
  sentAt: string;
  receivedAt?: string;
  viewedAt?: string;
  sender: {
    name: string;
    emissorInfo?: {
      cnpj?: string;
      clinicName?: string;
    };
  };
  receiver: {
    name: string;
    cpf?: string;
  };
}

export function ReportsDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const response = await fetch('/api/reports');
        if (!response.ok) throw new Error('Falha ao carregar relatórios');
        const data = await response.json();
        setReports(Array.isArray(data.reports) ? data.reports : []);
      } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        setReports([]);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Laudos</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Protocolo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Arquivo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Destinatário
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data de Envio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data de Recebimento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {report.protocol}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {report.fileName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {report.receiver.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(report.sentAt).toLocaleString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {report.receivedAt ? new Date(report.receivedAt).toLocaleString('pt-BR') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full
                    ${report.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                    report.status === 'RECEIVED' ? 'bg-yellow-100 text-yellow-800' :
                    report.status === 'VIEWED' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'}`}>
                    {report.status === 'SENT' ? 'ENVIADO' :
                     report.status === 'RECEIVED' ? 'RECEBIDO' :
                     report.status === 'VIEWED' ? 'VISUALIZADO' :
                     report.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}