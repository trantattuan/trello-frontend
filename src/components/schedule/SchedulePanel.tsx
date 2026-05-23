import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getBoardSchedules, createSchedule, updateSchedule, deleteSchedule } from '../../api/schedules'
import type { ScheduledJob, List } from '../../types'

interface Props {
  boardId: string
  lists: List[]
  onClose: () => void
}

type RepeatUnit = 'minutes' | 'hours' | 'days'
type ScheduleType = 'once' | 'repeat'

function toCron(n: number, unit: RepeatUnit): string {
  if (unit === 'minutes') return `*/${n} * * * *`
  if (unit === 'hours') return `0 */${n} * * *`
  return `0 0 */${n} * *`
}

function parseCron(expr: string): { n: number; unit: RepeatUnit } | null {
  const minuteMatch = expr.match(/^\*\/(\d+) \* \* \* \*$/)
  if (minuteMatch) return { n: parseInt(minuteMatch[1]), unit: 'minutes' }
  const hourMatch = expr.match(/^0 \*\/(\d+) \* \* \*$/)
  if (hourMatch) return { n: parseInt(hourMatch[1]), unit: 'hours' }
  const dayMatch = expr.match(/^0 0 \*\/(\d+) \* \*$/)
  if (dayMatch) return { n: parseInt(dayMatch[1]), unit: 'days' }
  return null
}

function summarizeSchedule(job: ScheduledJob): string {
  if (job.cronExpression) {
    const parsed = parseCron(job.cronExpression)
    if (parsed) return `Every ${parsed.n} ${parsed.unit}`
    return job.cronExpression
  }
  if (job.scheduledAt) {
    const d = new Date(job.scheduledAt)
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (one-time)`
  }
  return 'No schedule'
}

function isCompleted(job: ScheduledJob): boolean {
  return !!(job.lastRunAt && job.scheduledAt && !job.cronExpression)
}

export default function SchedulePanel({ boardId, lists, onClose }: Props) {
  const [jobs, setJobs] = useState<ScheduledJob[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const [formTitle, setFormTitle] = useState('')
  const [formListId, setFormListId] = useState(lists[0]?.id ?? '')
  const [formType, setFormType] = useState<ScheduleType>('once')
  const [formDatetime, setFormDatetime] = useState('')
  const [formRepeatN, setFormRepeatN] = useState(3)
  const [formRepeatUnit, setFormRepeatUnit] = useState<RepeatUnit>('minutes')

  useEffect(() => {
    getBoardSchedules(boardId)
      .then(setJobs)
      .catch(() => toast.error('Failed to load schedules'))
      .finally(() => setLoading(false))
  }, [boardId])

  const resetForm = () => {
    setFormTitle('')
    setFormListId(lists[0]?.id ?? '')
    setFormType('once')
    setFormDatetime('')
    setFormRepeatN(3)
    setFormRepeatUnit('minutes')
  }

  const handleCreate = async () => {
    if (!formTitle.trim() || !formListId) return
    const payload: Parameters<typeof createSchedule>[1] = {
      listId: formListId,
      title: formTitle.trim(),
      scheduledAt: null,
      cronExpression: null,
    }
    if (formType === 'once') {
      if (!formDatetime) { toast.error('Pick a date/time'); return }
      payload.scheduledAt = new Date(formDatetime).toISOString()
    } else {
      if (formRepeatN < 1) { toast.error('Interval must be >= 1'); return }
      payload.cronExpression = toCron(formRepeatN, formRepeatUnit)
    }
    try {
      const job = await createSchedule(boardId, payload)
      setJobs((prev) => [job, ...prev])
      setCreating(false)
      resetForm()
      toast.success('Schedule created')
    } catch { toast.error('Failed to create schedule') }
  }

  const handleToggle = async (job: ScheduledJob) => {
    try {
      const updated = await updateSchedule(job.id, { isActive: !job.isActive })
      setJobs((prev) => prev.map((j) => j.id === updated.id ? updated : j))
    } catch { toast.error('Failed to update schedule') }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id)
      setJobs((prev) => prev.filter((j) => j.id !== id))
      toast.success('Schedule deleted')
    } catch { toast.error('Failed to delete schedule') }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-sm bg-white shadow-2xl flex flex-col h-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Scheduled Jobs</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-lg px-1">&#10005;</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {creating ? (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900">New Schedule</p>

              <div>
                <label className="text-xs text-gray-600 block mb-1">Card title</label>
                <input
                  autoFocus
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Card title..."
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">Target list</label>
                <select
                  value={formListId}
                  onChange={(e) => setFormListId(e.target.value)}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"
                >
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" checked={formType === 'once'} onChange={() => setFormType('once')} />
                    One-time
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" checked={formType === 'repeat'} onChange={() => setFormType('repeat')} />
                    Repeat
                  </label>
                </div>
              </div>

              {formType === 'once' ? (
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Date &amp; time</label>
                  <input
                    type="datetime-local"
                    value={formDatetime}
                    onChange={(e) => setFormDatetime(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Every</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={formRepeatN}
                      onChange={(e) => setFormRepeatN(parseInt(e.target.value) || 1)}
                      className="w-20 border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"
                    />
                    <select
                      value={formRepeatUnit}
                      onChange={(e) => setFormRepeatUnit(e.target.value as RepeatUnit)}
                      className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"
                    >
                      <option value="minutes">minutes</option>
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCreate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 rounded transition-colors"
                >Save</button>
                <button
                  onClick={() => { setCreating(false); resetForm() }}
                  className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium py-1.5 rounded transition-colors"
                >Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded transition-colors"
            >+ New Schedule</button>
          )}

          {loading ? (
            <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
          ) : jobs.length === 0 && !creating ? (
            <p className="text-sm text-gray-500 text-center py-6">No scheduled jobs yet.</p>
          ) : (
            jobs.map((job) => {
              const completed = isCompleted(job)
              const listName = lists.find((l) => l.id === job.listId)?.title ?? job.listId
              return (
                <div
                  key={job.id}
                  className={`border border-gray-200 rounded-lg p-3 ${completed ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => handleToggle(job)}
                      className={`mt-0.5 w-8 h-5 rounded-full shrink-0 transition-colors relative overflow-hidden ${job.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
                      title={job.isActive ? 'Active - click to disable' : 'Inactive - click to enable'}
                    >
                      <span className={`absolute left-0 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${job.isActive ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{job.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">List: {listName}</p>
                      <p className="text-xs text-blue-600 mt-0.5 truncate">{summarizeSchedule(job)}</p>
                      {job.lastRunAt && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Last run: {new Date(job.lastRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {completed && <span className="ml-1 text-green-600 font-medium">Completed</span>}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="text-gray-400 hover:text-red-500 text-sm px-1 py-1 shrink-0"
                      title="Delete"
                    >&#128465;</button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
