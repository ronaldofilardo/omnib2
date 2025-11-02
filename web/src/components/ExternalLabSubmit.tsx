"use client";
import React, { useState, useRef, useEffect } from 'react';

type ExternalLabSubmitProps = {
  fetchImpl?: typeof fetch;
  FileReaderImpl?: typeof FileReader;
};

export default function ExternalLabSubmit({ fetchImpl, FileReaderImpl }: ExternalLabSubmitProps = {}) {
  const [patientEmail, setPatientEmail] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [documento, setDocumento] = useState('');
  const [cpf, setCpf] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetPending, setResetPending] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResetPending(false);
    // Não limpar mensagens antes da operação

      // Primeiro: validação de CPF (se preenchido)
      if (cpf && !/^\d{11}$/.test(cpf.replace(/\D/g, ''))) {
        setError('Erro: CPF inválido. Deve conter 11 dígitos numéricos.');
        setSuccess(null);
        setLoading(false);
        return;
      }

      // Depois: validação de campos obrigatórios
      if (!patientEmail || !doctorName || !examDate || !documento || !file) {
        setError('Erro: Preencha todos os campos e selecione um arquivo.');
        setSuccess(null);
        setLoading(false);
        return;
      }
    try {
      const Reader = FileReaderImpl || FileReader;
      const reader = new Reader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const payload = {
            patientEmail,
            doctorName,
            examDate,
            documento,
            cpf: cpf.replace(/\D/g, ''), // Enviar apenas dígitos
            report: {
              fileName: file ? file.name : '',
              fileContent: base64,
            },
          };
          // Garante que o fetch global mockado seja usado nos testes
          const fetchToUse = fetchImpl || (typeof global !== 'undefined' && typeof global.fetch === 'function' ? global.fetch : fetch);
          const res = await fetchToUse('/api/lab/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            setError(null);
            setSuccess('Sucesso: Documento enviado com sucesso!');
            timeoutRef.current = setTimeout(() => setResetPending(true), 50);
          } else {
            const data = await res.json();
            setSuccess(null);
            setError(data.error ? `Erro: ${data.error}` : 'Erro ao enviar documento.');
          }
        } catch (e) {
          setSuccess(null);
          setError('Erro: Erro ao processar arquivo');
        }
        setLoading(false);
      };
      reader.onerror = () => {
        setSuccess(null);
        setError('Erro: Erro ao processar arquivo');
        setLoading(false);
      };
      if (file) {
        reader.readAsDataURL(file);
      }
    } catch (e) {
  setSuccess(null);
  setError('Erro: Erro ao processar arquivo');
  setLoading(false);
    }
  };

  // Limpa o formulário imediatamente após exibir a mensagem de sucesso, mas mantém a mensagem
  React.useEffect(() => {
    if (success && resetPending) {
  setPatientEmail('');
  setDoctorName('');
  setExamDate('');
  setDocumento('');
  setCpf('');
  setFile(null);
  setResetPending(false);
  // Não limpar success aqui, para manter a mensagem visível
    }
  }, [success, resetPending]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 flex flex-col gap-4"
    >
      <h2 className="text-xl font-bold text-center text-[#1E40AF] mb-1">Portal de Envio Externo</h2>
      <p className="text-center text-gray-500 mb-4">Omni Saúde - Envio de Documentos para Exames</p>
      {error && (
        <div className="text-red-600 mt-2 text-center font-medium" data-testid="error-message">
          {error}
        </div>
      )}
      <div className="grid grid-cols-3 gap-x-6 gap-y-4 items-center">
        {/* Coluna 1: Labels à esquerda */}
        <div className="flex flex-col gap-6 col-span-1 text-right pr-2">
          <label className="text-sm text-gray-700 font-medium mt-2">n. exame</label>
          <label className="text-sm text-gray-700 font-medium mt-2">medico solicitante</label>
          <label className="text-sm text-gray-700 font-medium mt-2">email</label>
          <label className="text-sm text-gray-700 font-medium mt-2">cpf</label>
          <label className="text-sm text-gray-700 font-medium mt-2">arquivo</label>
        </div>
        {/* Coluna 2: Inputs principais */}
        <div className="flex flex-col gap-4 col-span-1">
          <input
            type="text"
            placeholder="Número do Documento"
            value={documento}
            onChange={e => setDocumento(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          />
          <input
            type="text"
            placeholder="Médico Solicitante"
            value={doctorName}
            onChange={e => setDoctorName(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          />
          <input
            type="email"
            placeholder="E-mail do Paciente"
            value={patientEmail}
            onChange={e => setPatientEmail(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            data-testid="email-input"
          />
          <input
            type="text"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={e => {
              const value = e.target.value.replace(/\D/g, ''); // Apenas dígitos
              if (value.length <= 11) {
                setCpf(value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'));
              } else {
                setCpf(value.substring(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'));
              }
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          />
          <div className="border border-dashed border-[#10B981] rounded-lg p-4 text-center bg-gray-50">
            <label htmlFor="file-upload" className="cursor-pointer text-[#10B981] font-semibold block">
              {file ? `Arquivo selecionado: ${file.name}` : 'Clique para selecionar Laudo/Resultado'}
            </label>
            <input
              id="file-upload"
              data-testid="file-upload"
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
        {/* Coluna 3: Data e CPF (CPF pode ser adicionado depois se necessário) */}
        <div className="flex flex-col gap-4 col-span-1">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-700 font-medium">data</label>
            <input
              type="date"
              placeholder="dd/mm/aaaa"
              value={examDate}
              onChange={e => setExamDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
          </div>
          {/* Espaço para CPF se necessário no futuro */}
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className={`w-full mt-6 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg py-3 font-semibold text-base transition-colors ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {loading ? 'Enviando...' : 'Enviar Documento'}
      </button>
      {success && (
        <div className="text-green-600 mt-2 text-center font-medium" data-testid="success-message">
          {success}
        </div>
      )}

    </form>
  );
}
