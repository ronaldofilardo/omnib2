'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarTab } from '@/components/CalendarTab';

interface CalendarClientProps {
  userId: string;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: string;
  professionalId: string;
  startTime?: string;
  endTime?: string;
  observation?: string;
  instructions?: boolean;
}

interface Professional {
  id: string;
  name: string;
  specialty: string;
  address?: string;
  contact?: string;
}

export default function CalendarClient({ userId }: CalendarClientProps) {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  // Buscar profissionais
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/professionals?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProfessionals(data);
      });
  }, [userId]);

  // Buscar eventos
  const fetchEvents = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/events?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      if (Array.isArray(data)) {
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, [userId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return <CalendarTab events={events} professionals={professionals} onBackToTimeline={() => router.push('/timeline')} />;
}