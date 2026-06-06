import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  getBackupSettings,
  updateBackupSettings,
  triggerBackup,
  listBackupRuns,
  deleteBackupRun,
  updateGdriveCreds,
  startGdriveOAuth,
  disconnectGdrive,
} from '../../api/backup'
import type { BackupSettings, BackupRun } from '../../types'

interface Props {
  onClose: () => void
}

type Tab = 'connect' | 'config' | 'history' | 'guide'

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

function formatDuration(start: string, end?: string | null): string {
  if (!end) return '-'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function describeSchedule(cronExpr: string): string {
  if (!cronExpr) return ''
  const m30 = cronExpr.match(/^\*\/(\d+) \* \* \* \*$/)
  if (m30) return `Moi ${m30[1]} phut`
  const h = cronExpr.match(/^0 \*\/(\d+) \* \* \*$/)
  if (h) return `Moi ${h[1]} gio`
  const d = cronExpr.match(/^0 0 \*\/(\d+) \* \*$/)
  if (d) return `Moi ${d[1]} ngay`
  const daily = cronExpr.match(/^0 (\d+) \* \* \*$/)
  if (daily) return `${daily[1]}:00 hang ngay`
  return cronExpr
}

const STATUS_BADGE: Record<BackupRun['status'], string> = {
  success: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  running: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-gray-100 text-gray-600',
}

// --- ConnectTab ---

function ConnectTab({ settings, onReload }: { settings: BackupSettings | null; onReload: () => void }) {
  const [clientId, setClientId] = useState(settings?.gdriveClientId ?? '')
  const [clientSecret, setClientSecret] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSaveCreds = async () => {
    if (!clientId.trim()) { toast.error('Client ID is required'); return }
    const secretTrimmed = clientSecret.trim()
    if (!secretTrimmed && !settings?.gdriveClientSecret) {
      toast.error('Client Secret is required')
      return
    }
    setSaving(true)
    try {
      await updateGdriveCreds({
        gdriveClientId: clientId.trim(),
        gdriveClientSecret: secretTrimmed || settings?.gdriveClientSecret || '',
      })
      setClientSecret('')
      toast.success('Credentials saved')
      onReload()
    } catch { toast.error('Failed to save credentials') }
    finally { setSaving(false) }
  }

  const handleOAuth = async () => {
    try {
      const { authUrl } = await startGdriveOAuth()
      const popup = window.open(authUrl, 'gdrive-oauth', 'width=560,height=720,left=200,top=100')
      if (!popup) { toast.error('Popup blocked - allow popups and try again'); return }
    } catch { toast.error('Failed to start OAuth') }
  }

  const handleDisconnect = async () => {
    try {
      await disconnectGdrive()
      toast.success('Disconnected')
      onReload()
    } catch { toast.error('Failed to disconnect') }
  }

  // Listen for OAuth result from popup
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'backup-oauth-result') return
      if (e.data.ok) {
        toast.success(e.data.msg ?? 'Connected successfully')
        onReload()
      } else {
        toast.error(e.data.msg ?? 'OAuth failed')
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onReload])

  return (
    <div className="space-y-5">
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-500 mb-1">Tai khoan hien tai</p>
        {settings?.gdriveAccountEmail ? (
          <p className="text-sm font-medium text-green-700">{settings.gdriveAccountEmail}</p>
        ) : (
          <p className="text-sm text-gray-400">Chua ket noi</p>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600 block mb-1">Google Client ID</label>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="xxxxx.apps.googleusercontent.com"
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 block mb-1">
            Google Client Secret
            {settings?.gdriveClientSecret && !clientSecret && (
              <span className="ml-2 text-green-600 font-normal">&#10003; da luu</span>
            )}
          </label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={settings?.gdriveClientSecret ? '(de trong = giu nguyen, nhap moi = thay the)' : 'GOCSPX-...'}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleSaveCreds}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-1.5 rounded transition-colors"
        >
          {saving ? 'Dang luu...' : 'Luu credentials'}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleOAuth}
          className="w-full border border-blue-500 text-blue-600 hover:bg-blue-50 text-sm font-medium py-1.5 rounded transition-colors"
        >
          Dang nhap Google
        </button>
        {settings?.gdriveAccountEmail && (
          <button
            onClick={handleDisconnect}
            className="w-full border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium py-1.5 rounded transition-colors"
          >
            Ngat ket noi
          </button>
        )}
      </div>
    </div>
  )
}

// --- ConfigTab ---

function ConfigTab({ settings, onReload }: { settings: BackupSettings | null; onReload: () => void }) {
  const [enabled, setEnabled] = useState(settings?.enabled ?? false)
  const [cronExpr, setCronExpr] = useState(settings?.cronExpr ?? '0 2 * * *')
  const [retentionCount, setRetentionCount] = useState(settings?.retentionCount ?? 7)
  const [scopeDb, setScopeDb] = useState(settings?.scopeDb ?? true)
  const [scopeUploads, setScopeUploads] = useState(settings?.scopeUploads ?? true)
  const [remoteFolder, setRemoteFolder] = useState(settings?.remoteFolder ?? 'trello-backups')
  const [saving, setSaving] = useState(false)
  const [triggering, setTriggering] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateBackupSettings({ enabled, cronExpr, retentionCount, scopeDb, scopeUploads, remoteFolder })
      toast.success('Config saved')
      onReload()
    } catch { toast.error('Failed to save config') }
    finally { setSaving(false) }
  }

  const handleTrigger = async () => {
    setTriggering(true)
    try {
      await triggerBackup()
      toast.success('Backup started')
      onReload()
    } catch { toast.error('Failed to trigger backup') }
    finally { setTriggering(false) }
  }

  const noAccount = !settings?.gdriveAccountEmail

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <p className="text-sm font-medium text-gray-900">Tu dong backup</p>
          <p className="text-xs text-gray-500 mt-0.5">Chay theo lich cron duoi day</p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`w-10 h-6 rounded-full relative transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
        </button>
      </div>

      <div>
        <label className="text-xs text-gray-600 block mb-1">Cron expression</label>
        <input
          value={cronExpr}
          onChange={(e) => setCronExpr(e.target.value)}
          placeholder="0 2 * * *"
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          {describeSchedule(cronExpr) || 'Custom expression'}
          {' '}&mdash; vd: <code>*/30 * * * *</code> = moi 30 phut, <code>0 2 * * *</code> = 2h sang hang ngay
        </p>
      </div>

      <div>
        <label className="text-xs text-gray-600 block mb-1">Giu lai (so ban backup)</label>
        <input
          type="number"
          min={1}
          max={50}
          value={retentionCount}
          onChange={(e) => setRetentionCount(parseInt(e.target.value) || 7)}
          className="w-24 border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="text-xs text-gray-600 block mb-2">Pham vi backup</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={scopeDb} onChange={(e) => setScopeDb(e.target.checked)} className="rounded" />
            Database (SQL)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={scopeUploads} onChange={(e) => setScopeUploads(e.target.checked)} className="rounded" />
            Uploads (MinIO)
          </label>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-600 block mb-1">Remote folder</label>
        <input
          value={remoteFolder}
          onChange={(e) => setRemoteFolder(e.target.value)}
          placeholder="trello-backups"
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-1.5 rounded transition-colors"
        >
          {saving ? 'Dang luu...' : 'Luu cau hinh'}
        </button>
        <button
          onClick={handleTrigger}
          disabled={triggering || noAccount}
          title={noAccount ? 'Ket noi Google Drive truoc' : ''}
          className="flex-1 border border-blue-500 text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium py-1.5 rounded transition-colors"
        >
          {triggering ? 'Dang chay...' : 'Backup ngay'}
        </button>
      </div>

      {noAccount && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
          Can ket noi Google Drive truoc khi backup (tab Connect).
        </p>
      )}
    </div>
  )
}

// --- HistoryTab ---

function HistoryTab() {
  const [runs, setRuns] = useState<BackupRun[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(7)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = (lim: number) => {
    listBackupRuns(lim)
      .then(setRuns)
      .catch(() => toast.error('Failed to load backup runs'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(limit)
  }, [limit])

  // Auto-refresh when any run is active
  useEffect(() => {
    const hasActive = runs.some(r => r.status === 'running' || r.status === 'pending')
    if (hasActive) {
      intervalRef.current = setInterval(() => load(limit), 5000)
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [runs, limit])

  const handleDelete = async (id: string) => {
    try {
      await deleteBackupRun(id)
      setRuns(prev => prev.filter(r => r.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  if (loading) return <p className="text-sm text-gray-500 text-center py-8">Loading...</p>

  if (runs.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8">Chua co backup nao.</p>
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <div key={run.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <div
            className={`flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50 ${run.status === 'failed' ? 'cursor-pointer' : ''}`}
            onClick={() => run.status === 'failed' ? setExpandedId(expandedId === run.id ? null : run.id) : undefined}
          >
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[run.status]}`}>
              {run.status}
            </span>
            <span className="text-xs text-gray-500">{run.kind}</span>
            <span className="text-xs text-gray-400 flex-1 truncate">
              {new Date(run.startedAt).toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 shrink-0">
              {formatDuration(run.startedAt, run.finishedAt)}
            </span>
            <span className="text-xs text-gray-400 shrink-0">{formatBytes(run.sizeBytes)}</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(run.id) }}
              className="text-gray-300 hover:text-red-500 text-xs px-1 shrink-0 transition-colors"
              title="Xoa"
            >&#128465;</button>
          </div>
          {run.status === 'failed' && run.error && (
            <div className="px-3 pb-2">
              <p className="text-xs text-red-600">{run.error}</p>
            </div>
          )}
          {expandedId === run.id && run.logTail && (
            <div className="px-3 pb-3">
              <pre className="text-xs bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
                {run.logTail}
              </pre>
            </div>
          )}
        </div>
      ))}

      {runs.length >= limit && (
        <button
          onClick={() => setLimit(l => l + 7)}
          className="w-full text-sm text-blue-600 hover:text-blue-700 py-2"
        >
          Xem them...
        </button>
      )}
    </div>
  )
}

// --- GuideTab ---

function GuideTab() {
  return (
    <div className="space-y-5 text-sm text-gray-700">
      <h3 className="font-semibold text-gray-900">Huong dan cai dat Google OAuth</h3>

      <ol className="space-y-4 list-none">
        {[
          {
            n: 1,
            title: 'Tao GCP Project',
            desc: 'Vao console.cloud.google.com, tao project moi hoac chon project san co.',
          },
          {
            n: 2,
            title: 'Bat Drive API',
            desc: 'APIs & Services > Library > tim "Google Drive API" > Enable.',
          },
          {
            n: 3,
            title: 'OAuth consent screen',
            desc: 'APIs & Services > OAuth consent screen > External > dien App name + email. Khong can publish, de Testing la du.',
          },
          {
            n: 4,
            title: 'Them test user',
            desc: 'Trong consent screen > Test users > Add your email. Buoc nay bat buoc de dang nhap duoc.',
          },
          {
            n: 5,
            title: 'Them scope Drive',
            desc: (
              <span>
                Scopes {'->'} Add scope {'->'} tim <code className="bg-gray-100 px-1 rounded text-xs">https://www.googleapis.com/auth/drive</code> {'->'} Update.
              </span>
            ),
          },
          {
            n: 6,
            title: 'Tao OAuth credentials',
            desc: (
              <span>
                Credentials {'->'} Create Credentials {'->'} OAuth client ID {'->'} Web application.
                <br />
                Authorized redirect URIs: them <code className="bg-gray-100 px-1 rounded text-xs">{window.location.origin}/api/backup/gdrive/oauth/callback</code>
              </span>
            ),
          },
        ].map((step) => (
          <li key={step.n} className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
              {step.n}
            </span>
            <div>
              <p className="font-medium text-gray-900">{step.title}</p>
              <p className="text-gray-600 mt-0.5">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>

      <div>
        <h4 className="font-medium text-gray-900 mb-2">Loi thuong gap</h4>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-2 border border-gray-200 font-medium">Loi</th>
              <th className="text-left p-2 border border-gray-200 font-medium">Nguyen nhan / Fix</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['redirect_uri_mismatch', 'URI trong GCP chua khop voi redirect URI cua server'],
              ['access_denied', 'Email chua duoc them vao Test users'],
              ['invalid_client', 'Client ID hoac Secret nhap sai'],
              ['Token expired', 'Token het han, Ngat ket noi va dang nhap lai'],
            ].map(([err, fix]) => (
              <tr key={err} className="border-t border-gray-200">
                <td className="p-2 border border-gray-200 font-mono text-red-600">{err}</td>
                <td className="p-2 border border-gray-200 text-gray-600">{fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- BackupPanel ---

const TABS: { id: Tab; label: string }[] = [
  { id: 'connect', label: 'Connect' },
  { id: 'config', label: 'Config' },
  { id: 'history', label: 'History' },
  { id: 'guide', label: 'Guide' },
]

export default function BackupPanel({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('connect')
  const [settings, setSettings] = useState<BackupSettings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)

  const loadSettings = () => {
    setLoadingSettings(true)
    getBackupSettings()
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoadingSettings(false))
  }

  useEffect(() => { loadSettings() }, [])

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={onClose}>
      <div
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Backup &amp; Restore</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-lg px-1">&#10005;</button>
        </div>

        {/* Tabs */}
        <nav className="flex border-b border-gray-200 shrink-0 px-5 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-sm font-medium px-3 py-2.5 border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loadingSettings && activeTab !== 'history' && activeTab !== 'guide' ? (
            <p className="text-sm text-gray-500 text-center py-8">Loading...</p>
          ) : (
            <>
              {activeTab === 'connect' && (
                <ConnectTab settings={settings} onReload={loadSettings} />
              )}
              {activeTab === 'config' && (
                <ConfigTab settings={settings} onReload={loadSettings} />
              )}
              {activeTab === 'history' && <HistoryTab />}
              {activeTab === 'guide' && <GuideTab />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
