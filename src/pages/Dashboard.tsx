import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getWorkspaces, createWorkspace, createBoard } from '../api/boards'
import { logout } from '../api/auth'
import { useAuthStore } from '../store/auth'
import type { Workspace } from '../types'

export default function Dashboard() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [newWsName, setNewWsName] = useState('')
  const [newBoardTitle, setNewBoardTitle] = useState<Record<string, string>>({})
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    getWorkspaces().then(setWorkspaces).catch(() => toast.error('Failed to load workspaces'))
  }, [])

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return
    try {
      const ws = await createWorkspace(newWsName.trim())
      setWorkspaces((prev) => [{ ...ws, boards: [], _count: { boards: 0, members: 1 } }, ...prev])
      setNewWsName('')
    } catch { toast.error('Failed to create workspace') }
  }

  const handleCreateBoard = async (wsId: string) => {
    const title = newBoardTitle[wsId]?.trim()
    if (!title) return
    try {
      const board = await createBoard(wsId, title)
      setWorkspaces((prev) => prev.map((ws) => ws.id === wsId ? { ...ws, boards: [...(ws.boards ?? []), board] } : ws))
      setNewBoardTitle((prev) => ({ ...prev, [wsId]: '' }))
      navigate(`/board/${board.id}`)
    } catch { toast.error('Failed to create board') }
  }

  const handleLogout = async () => {
    await logout().catch(() => {})
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-ui">
      <nav className="bg-white border-b border-gray-border h-[60px] flex items-center justify-between px-6 sticky top-0 z-10">
        <span className="text-navy font-semibold text-lg">Trello</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-dark">{user?.name}</span>
          <button onClick={handleLogout} className="btn-ghost text-sm px-3 py-1 min-h-0">Log out</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <input
            value={newWsName}
            onChange={(e) => setNewWsName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
            placeholder="New workspace name..."
            className="input-base max-w-xs h-10"
          />
          <button onClick={handleCreateWorkspace} className="btn-primary h-10 min-h-0 px-4">
            + Workspace
          </button>
        </div>

        {workspaces.map((ws) => (
          <div key={ws.id} className="mb-8">
            <h2 className="text-base font-semibold text-navy-2 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary rounded text-white text-xs flex items-center justify-center font-bold">
                {ws.name[0]}
              </span>
              {ws.name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(ws.boards ?? []).map((board) => (
                <button
                  key={board.id}
                  onClick={() => navigate(`/board/${board.id}`)}
                  className="card-base text-left h-24 hover:bg-blue-pale transition-colors font-semibold text-navy truncate"
                  style={board.backgroundUrl ? { backgroundImage: `url(${board.backgroundUrl})`, backgroundSize: 'cover' } : {}}
                >
                  {board.title}
                </button>
              ))}
              <div className="card-base h-24 flex flex-col gap-2 justify-center">
                <input
                  value={newBoardTitle[ws.id] ?? ''}
                  onChange={(e) => setNewBoardTitle((prev) => ({ ...prev, [ws.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard(ws.id)}
                  placeholder="New board..."
                  className="text-sm border-b border-gray-border outline-none px-1 py-0.5 text-navy"
                />
                <button onClick={() => handleCreateBoard(ws.id)} className="text-xs text-primary font-semibold text-left hover:underline">
                  + Add board
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
