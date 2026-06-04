import client from './client'
import type { BackupSettings, BackupRun } from '../types'

export const getBackupSettings = () =>
  client.get<BackupSettings>('/backup/settings').then(r => r.data)

export const updateBackupSettings = (data: Partial<BackupSettings>) =>
  client.put<BackupSettings>('/backup/settings', data).then(r => r.data)

export const triggerBackup = () =>
  client.post<BackupRun>('/backup/run').then(r => r.data)

export const listBackupRuns = (limit = 7) =>
  client.get<BackupRun[]>('/backup/runs', { params: { limit } }).then(r => r.data)

export const deleteBackupRun = (id: string) =>
  client.delete(`/backup/runs/${id}`)

export const getRcloneStatus = () =>
  client.get<{ installed: boolean; remotes: string[] }>('/backup/rclone-status').then(r => r.data)

export const updateGdriveCreds = (data: { gdriveClientId: string; gdriveClientSecret: string }) =>
  client.put('/backup/gdrive/creds', data)

export const startGdriveOAuth = () =>
  client.get<{ authUrl: string }>('/backup/gdrive/oauth/start').then(r => r.data)

export const disconnectGdrive = () =>
  client.post('/backup/gdrive/disconnect')
