'use client';

import React, { useEffect, useState } from 'react';

interface UserData {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  telefone?: string;
}

interface PersonalDataTabProps {
  userId: string;
}

export default function PersonalDataTab({ userId }: PersonalDataTabProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/user/${userId}`)
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao buscar dados do usuário.');
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div>Carregando dados pessoais...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!user) return <div>Nenhum dado encontrado.</div>;

  return (
    <div className="max-w-lg mx-auto bg-white rounded-xl shadow-md p-8 mt-6">
      <h2 className="text-2xl font-bold mb-6 text-[#1E40AF]">Dados Pessoais</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome</label>
          <input value={user.name || ''} readOnly className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">CPF</label>
          <input value={user.cpf || ''} readOnly className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Telefone</label>
          <input value={user.telefone || ''} readOnly className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">E-mail</label>
          <input value={user.email || ''} readOnly className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700" />
        </div>
      </div>
    </div>
  );
}
