import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

export function useSocket(boardId: string | null, handlers: Record<string, (data: unknown) => void>) {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || !boardId) return

    const socket = io('/', { auth: { token }, path: '/socket.io', transports: ['websocket'] })
    socketRef.current = socket

    socket.emit('join:board', boardId)
    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler))

    return () => {
      socket.emit('leave:board', boardId)
      Object.keys(handlers).forEach((event) => socket.off(event))
      socket.disconnect()
    }
  }, [boardId])

  return socketRef
}
