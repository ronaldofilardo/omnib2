import React from 'react';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

interface Report {
  id: string;
  protocol: string;
  title: string;
  status: 'SENT' | 'RECEIVED' | 'VIEWED' | 'ARCHIVED';
  sentAt: string;
  receivedAt?: string;
  viewedAt?: string;
  receiver: {
    name: string;
    cpf?: string;
  };
}

export function EmissorDashboard() {
  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) throw new Error('Erro ao carregar laudos');
      const data = await response.json();
      setReports(data.reports);
    } catch (err) {
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: Report['status']) => {
    switch (status) {
      case 'SENT': return 'Enviado';
      case 'RECEIVED': return 'Recebido';
      case 'VIEWED': return 'Visualizado';
      case 'ARCHIVED': return 'Arquivado';
      default: return status;
    }
  };

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'SENT': return 'text-blue-600';
      case 'RECEIVED': return 'text-yellow-600';
      case 'VIEWED': return 'text-green-600';
      case 'ARCHIVED': return 'text-gray-600';
      default: return '';
    }
  };

  if (loading) return <div className="p-4">Carregando...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Laudos Enviados</h2>
      
      {/* Versão Desktop/Tablet */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <th>Protocolo</th>
              <th>Data Envio</th>
              <th>Destinatário</th>
              <th>Status</th>
              <th>Data Recebimento</th>
              <th>Data Visualização</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td>{report.protocol}</td>
                <td>{formatDate(report.sentAt)}</td>
                <td>{report.receiver.name}</td>
                <td className={getStatusColor(report.status)}>
                  {getStatusLabel(report.status)}
                </td>
                <td>{report.receivedAt ? formatDate(report.receivedAt) : '-'}</td>
                <td>{report.viewedAt ? formatDate(report.viewedAt) : '-'}</td>
                <td>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    title="Funcionalidade disponível em breve"
                  >
                    Reavisar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Versão Mobile */}
      <div className="md:hidden space-y-4">
        {reports.map((report) => (
          <Card key={report.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold">Protocolo: {report.protocol}</div>
                <div className="text-sm text-gray-600">
                  Enviado em: {formatDate(report.sentAt)}
                </div>
              </div>
              <div className={`${getStatusColor(report.status)} font-medium`}>
                {getStatusLabel(report.status)}
              </div>
            </div>
            
            <div className="text-sm space-y-1">
              <div>Destinatário: {report.receiver.name}</div>
              {report.receiver.cpf && (
                <div className="text-xs text-gray-500">CPF: {report.receiver.cpf}</div>
              )}
              {report.receivedAt && (
                <div>Recebido em: {formatDate(report.receivedAt)}</div>
              )}
              {report.viewedAt && (
                <div>Visualizado em: {formatDate(report.viewedAt)}</div>
              )}
            </div>

            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled
                title="Funcionalidade disponível em breve"
              >
                Reavisar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}