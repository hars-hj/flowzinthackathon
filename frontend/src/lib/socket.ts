import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id)
    })

      socket.on('disconnect', (reason: Socket.DisconnectReason) => {
      console.log('Socket disconnected:', reason)
    })

    socket.on('connect_error', (err: Error) => {
      console.error('Socket connection error:', err.message)
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}