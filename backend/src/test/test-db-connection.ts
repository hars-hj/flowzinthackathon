import { supabaseAdmin } from "../../lib/supabaseClient.js"
type ConversationInsert = {
  session_id: string
  role: string
  message: string
  sentiment?: string
  escalated?: boolean
}

export async function insertConversation({
  session_id,
  role,
  message,
  sentiment = 'neutral',
  escalated = false
}: ConversationInsert) {

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .insert([
      {
        session_id,
        role,
        message,
        sentiment,
        escalated
      }
    ])
    .select()

  if (error) {
    console.error(error)
    throw error
  }

  return data
}

await insertConversation({
  session_id: '1',
  role: 'user',
  message: 'give me a fun fact about space',
  sentiment: 'positive',
  escalated: false
})