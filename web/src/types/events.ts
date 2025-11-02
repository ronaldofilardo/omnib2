export interface FileInfo {
  slot: string
  name: string
  url: string
  uploadDate?: string
  size?: number
  mimeType?: string
}

export interface Professional {
  id: string
  name: string
  specialty: string
}

export interface HealthEvent {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  files: FileInfo[]
  professional: Professional
  userId: string
  createdAt: Date
  updatedAt: Date
}

export type EventWithFiles = Pick<
  HealthEvent,
  'id' | 'title' | 'date' | 'startTime' | 'endTime' | 'files' | 'professional'
>