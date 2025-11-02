'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import { Timeline } from './Timeline'
import NewEventModal from './NewEventModal'
import { ProfessionalsTab } from './ProfessionalsTab'
import { RepositoryTab } from './RepositoryTab'
import { CalendarTab } from './CalendarTab'
import { Button } from './ui/button'
import NotificationCenter from './NotificationCenter'
import PersonalDataTab from './PersonalDataTab'
import { PortalLaudos } from './PortalLaudos'
import { EmissorDashboard } from './EmissorDashboard'
import ExternalLabSubmit from './ExternalLabSubmit'

interface DashboardProps {
  onLogout: () => void
  userId: string
  userRole: 'EMISSOR' | 'RECEPTOR';
  user?: any;
}

// Definir tipo Professional
interface Professional {
  id: string
  name: string
  specialty: string
  address?: string
  contact?: string
}

// Definir tipo Event
interface Event {
  id: string
  title: string
  description?: string
  date: string
  type: string
  professionalId: string
  startTime?: string
  endTime?: string
  observation?: string
  instructions?: boolean
  status?: 'past' | 'current' | 'future'
}

export function Dashboard({ onLogout, userId, userRole, user }: DashboardProps) {
  console.log('[Dashboard] Componente montado com:', { userId, userRole, user })

  const [activeMenu, setActiveMenu] = useState(() => {
    // Carregar aba ativa do localStorage ou usar padrão baseado no userRole
    if (typeof window !== 'undefined') {
      const savedMenu = localStorage.getItem('activeMenu')
      if (savedMenu) return savedMenu
    }
    // Se for EMISSOR, iniciar com 'laudos', caso contrário 'timeline'
    return userRole === 'EMISSOR' ? 'laudos' : 'timeline'
  })
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Debug: monitorar estado do modal
  useEffect(() => {
    console.log(
      'Dashboard: isNewEventModalOpen changed to',
      isNewEventModalOpen
    )
  }, [isNewEventModalOpen])
  const [events, setEvents] = useState<Event[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const isFetching = useRef(false)

  // Estado único de profissionais
  const [professionals, setProfessionals] = useState<Professional[]>([])

  // Debug: log quando activeMenu muda
  useEffect(() => {
    console.log('[Dashboard] activeMenu mudou para:', activeMenu)
    if (activeMenu === 'repository') {
      console.log('[Dashboard] RepositoryTab será renderizado com userId:', userId)
    } else if (activeMenu === 'calendar') {
      console.log('[Dashboard] CalendarTab será renderizado com events:', events?.length, 'professionals:', professionals?.length)
    }
  }, [activeMenu, userId, events, professionals])

  // Buscar profissionais do backend ao montar
  useEffect(() => {
    if (!userId) return
    fetch(`/api/professionals?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProfessionals(data)
      })
  }, [userId])

  // Polling com retry exponencial otimizado
  const fetchEventsWithRetry = useCallback(async (retryCount = 0) => {
    if (!userId) return
    try {
      console.log('[Dashboard] Fetching events...')
  const response = await fetch(`/api/events?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to fetch events')
      const data = await response.json()
      console.log('[Dashboard] Events fetched:', data)
      if (Array.isArray(data)) {
        setHasMore(false)
        setEvents(data)
      } else {
        setHasMore(false)
        console.warn('[Dashboard] Events data is not an array:', data)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
      if (retryCount < 3) {
        const delay = Math.min(2000 * Math.pow(2, retryCount), 10000)
        setTimeout(() => fetchEventsWithRetry(retryCount + 1), delay)
      }
    }
  }, [userId])

  // Buscar eventos do backend ao montar
  useEffect(() => {
    fetchEventsWithRetry(0)
    setPage(1)
  }, [fetchEventsWithRetry, userId])

  // Polling automático para atualizar eventos a cada 2 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEventsWithRetry(0)
    }, 2000)
    return () => clearInterval(interval)
  }, [fetchEventsWithRetry])

  // Scroll infinito
  // Desabilita scroll infinito, pois backend não suporta paginação

  // Função para atualizar eventos após criar (otimizada)
  const refreshEvents = useCallback(() => {
    fetchEventsWithRetry(0)
    setPage(1)
  }, [fetchEventsWithRetry])

  const handleMenuClick = (menu: string) => {
    if (menu === 'logout') {
      onLogout()
    } else {
      setActiveMenu(menu)
      // Salvar aba ativa no localStorage
      localStorage.setItem('activeMenu', menu)
      // Fechar sidebar em dispositivos móveis após seleção
      setIsSidebarOpen(false)
    }
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  // Get current date formatted
  const getCurrentDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      weekday: 'long',
    }
    const date = new Date()
    const formatted = date.toLocaleDateString('pt-BR', options)
    const [weekday, dateStr] = formatted.split(', ')
    return `${dateStr} - ${weekday}`
  }

  // Função para atualizar profissionais
  const refreshProfessionals = useCallback(() => {
    if (!userId) return
    fetch(`/api/professionals?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProfessionals(data)
      })
  }, [userId])

  return (
  <div className="flex bg-linear-to-b from-[#F8FAFC] to-white">
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          onClick={toggleSidebar}
          variant="outline"
          size="sm"
          className="bg-white shadow-md"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-50 h-screen transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
    <Sidebar userRole={userRole} user={user} onMenuClick={handleMenuClick} userId={userId} />
      </div>

      {/* Main Content */}
      {activeMenu === 'timeline' && (
  <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0 h-screen overflow-y-auto">
          {/* Header */}
          <div className="px-4 md:px-12 pt-12 pb-6">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-[#111827] text-xl md:text-2xl">Minha Timeline</h1>
              {/* New Event Button */}
              <Button
                onClick={() => setIsNewEventModalOpen(true)}
                className="bg-[#10B981] hover:bg-[#059669] text-white h-10 px-4 md:px-6 rounded-lg flex items-center gap-2 text-sm md:text-base"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline text-[14px]">Novo Evento</span>
                <span className="sm:hidden text-[14px]">Novo</span>
              </Button>
            </div>
            {/* Current Date */}
            <p className="text-[#6B7280] text-sm md:text-[16px]">{getCurrentDate()}</p>
          </div>
          {/* Timeline Content Area */}
          <div className="px-4 md:px-12 py-6 h-full overflow-y-auto">
            {(() => {
              console.log('[Dashboard] Rendering timeline, events:', events, 'professionals:', professionals)
              return null
            })()}
            {events && events.length > 0 ? (
              <Timeline
                onUpdate={refreshEvents}
                events={events}
                professionals={professionals}
                onView={(event: Event) => {
                  // Implementar modal ou navegação para visualizar detalhes do evento
                  alert(`Visualizando evento: ${event.title}`)
                }}
                onFiles={(event: Event) => {
                  // Implementar modal ou navegação para gerenciar arquivos do evento
                  alert(`Arquivos do evento: ${event.title}`)
                }}
                onEdit={(event: Event) => {
                  // Implementar modal de edição ou navegação para editar evento
                  alert(`Editando evento: ${event.title}`)
                }}
                onDelete={async (event: Event, deleteFiles: boolean) => {
                  // Chama API para deletar evento (rota correta: body com id e deleteFiles)
                  await fetch('/api/events', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: event.id, deleteFiles }),
                  })
                  // Atualiza eventos do backend
                  await fetchEventsWithRetry()
                  // Forçar atualização do hook useEventForm
                  setTimeout(() => fetchEventsWithRetry(), 100)
                }}
              />
            ) : (
              <div className="text-center text-[#9CA3AF] text-lg mt-12">
                Ainda não existem eventos cadastrados
              </div>
            )}
          </div>
        </div>
      )}
      {/* Professionals Tab */}
      {activeMenu === 'professionals' && (
        <ProfessionalsTab
          professionals={professionals}
          setProfessionals={setProfessionals}
          userId={userId}
        />
      )}
      {/* Repository Tab */}
  {activeMenu === 'repositorio' && (
        <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0">
          <RepositoryTab userId={userId} />
        </div>
      )}
      {/* Calendar Tab */}
  {activeMenu === 'calendario' && (
        <CalendarTab
          events={events}
          professionals={professionals}
          onBackToTimeline={() => setActiveMenu('timeline')}
        />
      )}
      {/* Notification Center */}
    {activeMenu === 'notificacoes' && (
        <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0">
          <NotificationCenter userId={userId} onProfessionalCreated={refreshProfessionals} />
        </div>
      )}
      {/* Personal Data Tab */}
      {activeMenu === 'dadospessoais' && (
        <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0">
          <PersonalDataTab userId={userId} />
        </div>
      )}
      {/* Default to Timeline if no menu is active */}
      {!activeMenu && (
        <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0 h-screen overflow-y-auto">
          {/* Header */}
          <div className="px-4 md:px-12 pt-12 pb-6">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-[#111827] text-xl md:text-2xl">Minha Timeline</h1>
              {/* New Event Button */}
              <Button
                onClick={() => setIsNewEventModalOpen(true)}
                className="bg-[#10B981] hover:bg-[#059669] text-white h-10 px-4 md:px-6 rounded-lg flex items-center gap-2 text-sm md:text-base"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline text-[14px]">Novo Evento</span>
                <span className="sm:hidden text-[14px]">Novo</span>
              </Button>
            </div>
            {/* Current Date */}
            <p className="text-[#6B7280] text-sm md:text-[16px]">{getCurrentDate()}</p>
          </div>
          {/* Timeline Content Area */}
          <div className="px-4 md:px-12 py-6 h-full overflow-y-auto">
            {(() => {
              console.log('[Dashboard] Rendering timeline, events:', events, 'professionals:', professionals)
              return null
            })()}
            {events && events.length > 0 ? (
              <Timeline
                onUpdate={refreshEvents}
                events={events}
                professionals={professionals}
                onView={(event: Event) => {
                  // Implementar modal ou navegação para visualizar detalhes do evento
                  alert(`Visualizando evento: ${event.title}`)
                }}
                onFiles={(event: Event) => {
                  // Implementar modal ou navegação para gerenciar arquivos do evento
                  alert(`Arquivos do evento: ${event.title}`)
                }}
                onEdit={(event: Event) => {
                  // Implementar modal de edição ou navegação para editar evento
                  alert(`Editando evento: ${event.title}`)
                }}
                onDelete={async (event: Event, deleteFiles: boolean) => {
                  // Chama API para deletar evento (rota correta: body com id e deleteFiles)
                  await fetch('/api/events', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: event.id, deleteFiles }),
                  })
                  // Atualiza eventos do backend
                  await fetchEventsWithRetry()
                  // Forçar atualização do hook useEventForm
                  setTimeout(() => fetchEventsWithRetry(), 100)
                }}
              />
            ) : (
              <div className="text-center text-[#9CA3AF] text-lg mt-12">
                Ainda não existem eventos cadastrados
              </div>
            )}
          </div>
        </div>
      )}
      {/* Emissor Tabs */}
      {userRole === 'EMISSOR' && activeMenu === 'laudos' && (
        <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0">
          <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Portal de Envio</h1>
            <ExternalLabSubmit />
          </div>
        </div>
      )}
      {userRole === 'EMISSOR' && activeMenu === 'relatorios' && (
        <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0">
          <EmissorDashboard />
        </div>
      )}
      {/* New Event Modal */}
      <NewEventModal
        open={isNewEventModalOpen}
        onOpenChange={(open) => {
          console.log('Dashboard: NewEventModal onOpenChange called with', open)
          setIsNewEventModalOpen(open)
        }}
        professionals={professionals}
        setProfessionals={setProfessionals}
        userId={userId}
      />
      {/* Renderizar eventos reais do banco */}
    </div>
  )
}
