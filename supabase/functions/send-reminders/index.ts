import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SessionData {
  title: string
  scheduled_at: string
  zoom_link: string | null
}

interface ReminderData {
  id: string
  user_id: string
  session_id: string
  reminder_type: string
  sessions: SessionData | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get pending reminders that should be sent now
    const { data: reminders, error: fetchError } = await supabase
      .from('scheduled_reminders')
      .select('id, user_id, session_id, reminder_type')
      .eq('sent', false)
      .lte('scheduled_for', new Date().toISOString())

    if (fetchError) {
      throw fetchError
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending reminders', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get session details separately
    const sessionIds = [...new Set(reminders.map(r => r.session_id))]
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, title, scheduled_at, zoom_link')
      .in('id', sessionIds)

    let sentCount = 0

    for (const reminder of reminders) {
      const session = sessions?.find(s => s.id === reminder.session_id)
      
      if (!session) continue

      const scheduledAt = new Date(session.scheduled_at)
      const formattedDate = scheduledAt.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      const formattedTime = scheduledAt.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      })

      let title: string
      let message: string

      if (reminder.reminder_type === '24h_before') {
        title = 'تذكير: جلسة غداً'
        message = `لديك جلسة "${session.title}" غداً في الساعة ${formattedTime}`
      } else {
        title = 'تذكير: جلسة بعد ساعة'
        message = `جلسة "${session.title}" ستبدأ بعد ساعة واحدة في الساعة ${formattedTime}`
        if (session.zoom_link) {
          message += `\n\nرابط الجلسة: ${session.zoom_link}`
        }
      }

      // Create notification
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert({
          user_id: reminder.user_id,
          type: 'session_reminder',
          title,
          message,
          related_id: reminder.session_id,
        })

      if (!notifyError) {
        // Mark reminder as sent
        await supabase
          .from('scheduled_reminders')
          .update({ sent: true })
          .eq('id', reminder.id)
        
        sentCount++
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Reminders processed successfully', 
        count: sentCount,
        total: reminders.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing reminders:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
