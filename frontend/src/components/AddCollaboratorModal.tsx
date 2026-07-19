// import { useState, useEffect } from 'react'
// import { X, Search, UserPlus } from 'lucide-react'
// import type { AgentProfile } from '../types/ticket'
// import { getAgentscount } from '../api/manageAgents'

// interface AddCollaboratorModalProps {
//   onClose: () => void
//   onAdd: (agentId: string) => void
// }

// export function AddCollaboratorModal({ onClose, onAdd }: AddCollaboratorModalProps) {
//   const [agents, setAgents] = useState<AgentProfile[]>([])
//   const [loading, setLoading] = useState(true)
//   const [search, setSearch] = useState('')
//   const [addingId, setAddingId] = useState<string | null>(null)

//   useEffect(() => {
//       getAgentscount()
//       .then((count) => setAgents(agents))
//       .catch((err) => console.error('Failed to load agents:', err))
//       .finally(() => setLoading(false))
//   }, [])

//   const filtered = agents.filter(
//     (a) =>
//       a.email.toLowerCase().includes(search.toLowerCase()) ||
//       a.team?.toLowerCase().includes(search.toLowerCase())
//   )

//   const grouped = filtered.reduce<Record<string, AgentProfile[]>>((acc, agent) => {
//     const key = agent.team ?? 'unassigned'
//     if (!acc[key]) acc[key] = []
//     acc[key].push(agent)
//     return acc
//   }, {})

//   const handleAdd = async (agentId: string) => {
//     setAddingId(agentId)
//     await onAdd(agentId)
//     setAddingId(null)
//   }

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
//       <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
//         <div className="flex items-center justify-between border-b border-border px-5 py-4">
//           <h2 className="font-ui text-sm font-medium text-text-primary">Add agent to ticket</h2>
//           <button
//             onClick={onClose}
//             className="flex h-7 w-7 items-center justify-center rounded-lg text-text-hint hover:bg-surface-muted"
//           >
//             <X className="h-4 w-4" strokeWidth={2} />
//           </button>
//         </div>

//         <div className="px-5 py-3">
//           <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
//             <Search className="h-3.5 w-3.5 text-text-hint" strokeWidth={2} />
//             <input
//               type="text"
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               placeholder="Search by name or team…"
//               className="flex-1 bg-transparent font-ui text-sm text-text-primary outline-none"
//               autoFocus
//             />
//           </div>
//         </div>

//         <div className="max-h-80 overflow-y-auto px-5 pb-5">
//           {loading ? (
//             <p className="py-8 text-center font-ui text-xs text-text-hint">Loading agents…</p>
//           ) : filtered.length === 0 ? (
//             <p className="py-8 text-center font-ui text-xs text-text-hint">No agents found</p>
//           ) : (
//             Object.entries(grouped).map(([team, teamAgents]) => (
//               <div key={team} className="mb-4">
//                 <p className="mb-2 font-ui text-xs font-medium uppercase tracking-wide text-text-hint">
//                   {team}
//                 </p>
//                 <ul className="space-y-1.5">
//                   {teamAgents.map((agent) => (
//                     <li
//                       key={agent.id}
//                       className="flex items-center justify-between rounded-lg px-3 py-2 transition-all hover:bg-surface-muted"
//                     >
//                       <div className="min-w-0">
//                         <p className="truncate font-ui text-sm text-text-primary">{agent.email}</p>
//                         <p className="font-ui text-xs capitalize text-text-hint">{agent.role}</p>
//                       </div>
//                       <button
//                         onClick={() => handleAdd(agent.id)}
//                         disabled={addingId === agent.id}
//                         className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 font-ui text-xs font-medium text-white transition-all hover:bg-accent-dark disabled:opacity-50"
//                       >
//                         <UserPlus className="h-3 w-3" strokeWidth={2} />
//                         {addingId === agent.id ? 'Adding…' : 'Add'}
//                       </button>
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             ))
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }