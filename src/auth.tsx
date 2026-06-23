/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { api, setApiToken } from './api'

export type Role = 'admin' | 'member' | 'viewer'
export type Permission = 'manage_users' | 'manage_roles' | 'edit_household'

export interface HouseholdUser {
  id: number
  name: string
  username: string
  role: Role
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['manage_users', 'manage_roles', 'edit_household'],
  member: ['edit_household'],
  viewer: [],
}

interface LoginResponse {
  token: string
  user: HouseholdUser
}

interface AuthContextValue {
  currentUser: HouseholdUser | null
  users: HouseholdUser[]
  loading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  can: (permission: Permission) => boolean
  addUser: (
    user: Omit<HouseholdUser, 'id'> & { password: string },
  ) => Promise<boolean>
  updateUserRole: (userId: number, role: Role) => Promise<boolean>
  updateProfile: (name: string) => Promise<boolean>
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<HouseholdUser | null>(null)
  const [users, setUsers] = useState<HouseholdUser[]>([])
  const [loading, setLoading] = useState(true)

  async function loadUsers(user: HouseholdUser) {
    if (user.role === 'admin') {
      setUsers(await api<HouseholdUser[]>('/users'))
    } else {
      setUsers([])
    }
  }

  useEffect(() => {
    api<HouseholdUser>('/profile')
      .then(async (user) => {
        setCurrentUser(user)
        await loadUsers(user)
      })
      .catch(() => setApiToken(null))
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      users,
      loading,
      async login(username, password) {
        try {
          const result = await api<LoginResponse>('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
          })
          setApiToken(result.token)
          setCurrentUser(result.user)
          await loadUsers(result.user)
          return true
        } catch {
          return false
        }
      },
      async logout() {
        try {
          await api('/logout', { method: 'POST' })
        } finally {
          setApiToken(null)
          setCurrentUser(null)
          setUsers([])
        }
      },
      can(permission) {
        return currentUser
          ? ROLE_PERMISSIONS[currentUser.role].includes(permission)
          : false
      },
      async addUser(user) {
        try {
          const created = await api<HouseholdUser>('/users', {
            method: 'POST',
            body: JSON.stringify(user),
          })
          setUsers((current) => [...current, created])
          return true
        } catch {
          return false
        }
      },
      async updateUserRole(userId, role) {
        try {
          const updated = await api<HouseholdUser>(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ role }),
          })
          setUsers((current) =>
            current.map((user) => (user.id === userId ? updated : user)),
          )
          return true
        } catch {
          return false
        }
      },
      async updateProfile(name) {
        try {
          const updated = await api<HouseholdUser>('/profile', {
            method: 'PUT',
            body: JSON.stringify({ name }),
          })
          setCurrentUser(updated)
          setUsers((current) =>
            current.map((user) => (user.id === updated.id ? updated : user)),
          )
          return true
        } catch {
          return false
        }
      },
      async changePassword(currentPassword, newPassword) {
        try {
          await api('/profile/password', {
            method: 'PUT',
            body: JSON.stringify({
              current_password: currentPassword,
              password: newPassword,
              password_confirmation: newPassword,
            }),
          })
          return true
        } catch {
          return false
        }
      },
    }),
    [currentUser, loading, users],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export const roleLabels: Record<Role, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}
