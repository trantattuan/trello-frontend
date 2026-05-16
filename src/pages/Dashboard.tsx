import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getWorkspaces, createWorkspace, createBoard, renameWorkspace, deleteWorkspace, searchCards, SearchResult } from '../api/boards'
import { logout } from '../api/auth'
import { useAuthStore } from '../store/auth'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import type { Workspace } from '../types'

type Confirm = { message: string; onConfirm: () => void }

export default function Dashboard() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [newWsName, setNewWsName] = useState('')
  const [newBoardTitle, setNewBoardTitle] = useState<Record<string, string>>({})
  const [editingWs, setEditingWs] = useState<string | null>(null)
  const [editingWsName, setEditingWsName] = useState('')
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    getWorkspaces().then(setWorkspaces).catch(() => toast.error('Failed to load workspaces'))
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearch = (q: string) => {
    setSearchQuery(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!q.trim()) { setSearchResults([]); setShowResults(false); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchCards(q.trim())
        setSearchResults(results)
        setShowResults(true)
      } catch { toast.error('Search failed') }
      finally { setSearching(false) }
    }, 300)
  }

  const handleRenameWorkspace = async (wsId: string) => {
    const trimmed = editingWsName.trim()
    const ws = workspaces.find((w) => w.id === wsId)
    if (!trimmed || trimmed === ws?.name) { setEditingWs(null); return }
    try {
      await renameWorkspace(wsId, trimmed)
      setWorkspaces((prev) => prev.map((w) => w.id === wsId ? { ...w, name: trimmed } : w))
    } catch { toast.error('Failed to rename workspace') }
    setEditingWs(null)
  }

  const handleDeleteWorkspace = (wsId: string, wsName: string) => {
    setConfirm({
      message: `Xóa workspace "${wsName}" và toàn bộ board, card bên trong?`,
      onConfirm: async () => {
        try {
          await deleteWorkspace(wsId)
          setWorkspaces((prev) => prev.filter((w) => w.id !== wsId))
        } catch { toast.error('Failed to delete workspace') }
        setConfirm(null)
      },
    })
  }

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
        <div ref={searchRef} className="relative flex-1 max-w-sm mx-8">
          <input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Search cards..."
            className="input-base h-9 w-full pl-8 text-sm"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-dark text-sm">&#128269;</span>
          {searching && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-dark text-xs">...</span>}
          {showResults && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-border rounded-card shadow-lg z-50 max-h-80 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-dark">No results found</div>
              ) : (
                searchResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setShowResults(false); navigate(`/board/${r.board.id}?card=${r.id}`) }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-pale transition-colors border-b border-gray-border last:border-0"
                  >
                    <div className="text-sm font-semibold text-navy truncate">{r.title}</div>
                    <div className="text-xs text-gray-dark mt-0.5">{r.board.title} &rsaquo; {r.list.title}</div>
                    {r.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {r.labels.map((l) => (
                          <span key={l.id} className="px-1.5 py-0.5 rounded text-white text-xs font-semibold" style={{ background: l.color }}>{l.name}</span>
                        ))}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
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
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 bg-primary rounded text-white text-xs flex items-center justify-center font-bold shrink-0">
                {ws.name[0]}
              </span>
              {editingWs === ws.id ? (
                <input
                  autoFocus
                  value={editingWsName}
                  onChange={(e) => setEditingWsName(e.target.value)}
                  onBlur={() => handleRenameWorkspace(ws.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRenameWorkspace(ws.id); if (e.key === 'Escape') setEditingWs(null) }}
                  className="text-base font-semibold text-navy-2 border-b border-primary outline-none bg-transparent flex-1"
                />
              ) : (
                <span
                  className="text-base font-semibold text-navy-2 cursor-pointer hover:underline flex-1"
                  onClick={() => { setEditingWsName(ws.name); setEditingWs(ws.id) }}
                >{ws.name}</span>
              )}
              <button
                onClick={() => handleDeleteWorkspace(ws.id, ws.name)}
                className="text-gray-dark hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors text-xs opacity-50 hover:opacity-100"
                title="Delete workspace"
              >&#128465;</button>
            </div>
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

      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
