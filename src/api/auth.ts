import client from './client'

export const login = (email: string, password: string) =>
  client.post<{ token: string; user: User }>('/auth/login', { email, password }).then((r) => r.data)

export const register = (email: string, password: string, name: string) =>
  client.post<{ token: string; user: User }>('/auth/register', { email, password, name }).then((r) => r.data)

export const logout = () => client.post('/auth/logout')

export const me = () => client.get<User>('/auth/me').then((r) => r.data)

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string | null
}
