export interface SchedulingPet {
  id: string
  name: string
  breed: string | null
  size: string | null
}

export interface SchedulingClient {
  id: string
  name: string
  email: string
  phone: string
}

export interface SchedulingPackage {
  id: string
  name: string
  description: string
}

export interface SchedulingData {
  scheduling: {
    id: string
    clientId: string
    packageId: string | null
    pickupDate: number
    pickupTime: string | null
    status: "scheduled" | "in_progress" | "completed" | "cancelled"
    finalPrice: number
    basePrice: number
    adjustmentValue: number
    adjustmentReason: string | null
    notes?: string | null
    startedAt: number | null
    completedAt: number | null
    createdAt: number
    updatedAt: number
  }
  client: SchedulingClient
  package: SchedulingPackage | null
  pets: SchedulingPet[]
  isFromSubscription?: boolean
  subscription?: {
    id: string
    pickupDayOfWeek: number
    pickupTime: string | null
    recurrence: number
  }
}

export interface SchedulingEvent {
  id: string
  title: string
  date: Date
  time: string
  client: {
    name: string
    phone: string
  }
  pets: SchedulingPet[]
  status: string
  adjustmentValue: number
  adjustmentReason: string | null
  basePrice: number
  finalPrice: number
}

export interface SchedulingGroup {
  date: string
  dateFormatted: string
  items: SchedulingData[]
}

export type SchedulingStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled"

export const statusColors: Record<SchedulingStatus, string> = {
  scheduled: "bg-blue-500 border-blue-200",
  confirmed: "bg-green-500 border-green-200",
  in_progress: "bg-yellow-500 border-yellow-200",
  completed: "bg-gray-500 border-gray-200",
  cancelled: "bg-red-500 border-red-200",
}

export const statusLabels: Record<SchedulingStatus, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
}
