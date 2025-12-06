export interface User {
  id: number
  username: string
  isAdmin: boolean
  isBlocked: boolean
  createdAt: string
}

export interface PC {
  id: number
  name: string
  ipAddress: string
  description?: string
  adminUsername: string
  isOnline: boolean
  lastOneCVersion?: string
  oneCArchitecture?: string
  group?: {
    id: number
    name: string
  }
  createdAt: string
}

export interface Group {
  id: number
  name: string
  description?: string
  pcs?: PC[]
  createdAt: string
}

export interface Distribution {
  id: number
  filename: string
  version: string
  architecture: string
  fileSize: number
  description?: string
  createdAt: string
}

export interface Task {
  id: number
  name: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  distribution: Distribution
  pcs: PC[]
  createdAt: string
  updatedAt: string
}




