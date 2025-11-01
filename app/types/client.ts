export interface PetSubscription {
  id?: string
  packagePriceId: string
  pickupDayOfWeek: number
  pickupTime?: string | null
  startDate: number
  adjustmentPercentage?: number | null
  adjustmentReason?: string | null
  notes?: string | null
  isActive?: boolean
  basePrice?: number
  finalPrice?: number
  nextPickupDate?: number | null
  packagePrice?: {
    id: string
    price: number
    recurrence: number
    package: {
      id: string
      name: string
      description?: string | null
      duration: number
    }
  }
  pet?: {
    id: string
    name: string
  }
}

export interface PetWithSubscription {
  id: string
  name: string
  breed?: string | null
  size?: "small" | "medium" | "large" | null
  weight?: number | null
  notes?: string | null
  createdAt?: number
  updatedAt?: number
  clientId?: string
  subscription?: PetSubscription | null
}

export interface ClientWithPetsAndSubscriptions {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
  avatar?: string | null
  createdAt?: number
  updatedAt?: number
  pets: PetWithSubscription[]
  subscriptions?: PetSubscription[]
}

export interface PetFormData {
  name: string
  breed?: string
  size?: "small" | "medium" | "large"
  weight?: number | null
  notes?: string | null
  subscription: {
    id: string | null
    packagePriceId: string
    pickupDayOfWeek: number
    pickupTime?: string | null
    startDate: number
    adjustmentPercentage: number | undefined
    adjustmentReason?: string | null
    notes?: string | null
    isActive?: boolean
  }
}

export interface ClientFormData {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
  pets?: PetFormData[]
}
