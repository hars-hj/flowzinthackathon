import { Server as SocketIOServer } from 'socket.io'
import type { Server as HTTPServer } from 'http'

let io: SocketIOServer

export function initSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id)

    socket.on('register_staff', (userId: string) => {
      socket.join('staff_room')
      socket.join(`user_${userId}`)
    })

    socket.on('join_ticket', (ticketId: string) => {
      socket.join(`ticket_${ticketId}`)
      console.log(`Socket ${socket.id} joined ticket_${ticketId}`)
    })

    socket.on('leave_ticket', (ticketId: string) => {
      socket.leave(`ticket_${ticketId}`)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id)
    })
  })

  return io
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}

export function broadcastNewTicket(ticket: any) {
  getIO().to('staff_room').emit('ticket:new', ticket)
}

export function broadcastTicketClaimed(ticket: any) {
  getIO().to('staff_room').emit('ticket:claimed', ticket)
  getIO().to(`ticket_${ticket.id}`).emit('ticket:claimed', ticket)
}

export function broadcastCollaboratorAdded(ticketId: string, team: string, addedBy: string) {
  getIO().to('staff_room').emit('ticket:collaborator_added', { ticketId, team, addedBy })
}

export function broadcastNewMessage(ticketId: string, message: any) {
  getIO().to(`ticket_${ticketId}`).emit('message:new', message)
}

export function broadcastTicketResolved(ticket: any) {
  getIO().to(`ticket_${ticket.id}`).emit('ticket:resolved', ticket)
  getIO().to('staff_room').emit('ticket:resolved', ticket)
}