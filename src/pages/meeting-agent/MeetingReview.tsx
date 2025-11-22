import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
// Types import
import type { Meeting, TranscriptSegment, ActionItem } from '@/types/meeting-agent/meeting'
import SpeakerRenamer from '@/components/meeting-agent/SpeakerRenamer'
import ExecutionLog from '@/components/meeting-agent/ExecutionLog'

export default function MeetingReview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  console.log('MeetingReview mounted with ID:', id)
  
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([])
  const [actions, setActions] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [executingActions, setExecutingActions] = useState(false)

  const handleRetry = async () => {
    try {
      const res = await fetch(`/api/agent/meetings/${id}/retry`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Retry failed')
    } catch (e) {
      console.error(e)
      alert('Failed to retry processing')
    }
  }

  const handleExecuteActions = async () => {
    if (!meeting || !id) return
    
    setExecutingActions(true)
    try {
      const { supabase } = await import('@/integrations/supabase/client')
      const { data: { session } } = await supabase.auth.getSession()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user?.id) {
        alert('Please log in')
        return
      }

      const res = await fetch(`/api/agent/meetings/${id}/execute-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({ user_id: user.id })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Failed to execute actions')
      }

      const result = await res.json()
      alert(`Actions executed! ${result.tasks_created} tasks created, ${result.tasks_failed} failed`)
      
      // Reload page to show execution log
      window.location.reload()
    } catch (e: any) {
      console.error(e)
      alert(`Failed to execute actions: ${e.message}`)
    } finally {
      setExecutingActions(false)
    }
  }

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      const { data: meetingData } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .single()
      
      if (meetingData) setMeeting(meetingData)

      const { data: transcriptData } = await supabase
        .from('transcripts')
        .select('*')
        .eq('meeting_id', id)
        .order('start_time', { ascending: true })
      
      if (transcriptData) setTranscript(transcriptData)

      const { data: actionsData } = await supabase
        .from('action_items')
        .select('*')
        .eq('meeting_id', id)
      
      if (actionsData) setActions(actionsData)
      
      setLoading(false)
    }

    fetchData()
    
    const channel = supabase
      .channel('meeting-updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'meetings', 
        filter: `id=eq.${id}` 
      }, (payload: any) => {
        setMeeting(payload.new as Meeting)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  if (loading) return <div className="p-8">Loading meeting data...</div>
  if (!meeting) return <div className="p-8">Meeting not found</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">{meeting.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className={`px-2 py-1 rounded-full ${
                meeting.status === 'done' ? 'bg-green-100 text-green-800' : 
                meeting.status === 'failed' ? 'bg-red-100 text-red-800' : 
                'bg-blue-100 text-blue-800'
              }`}>
                {meeting.status.toUpperCase()}
              </span>
              <span>{new Date(meeting.created_at).toLocaleDateString()}</span>
              {meeting.status === 'failed' && (
                <button 
                  onClick={handleRetry}
                  className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors shadow-sm"
                >
                  Retry Processing
                </button>
              )}
              {meeting.insights && actions.length > 0 && (
                <button 
                  onClick={handleExecuteActions}
                  disabled={executingActions}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {executingActions ? 'Executing...' : 'Execute Actions'}
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/agent')}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Transcript</h2>
              <div className="space-y-4">
                {transcript.map((segment) => (
                  <div key={segment.id} className="flex gap-4">
                    <div className="w-24 flex-shrink-0 text-sm font-medium text-gray-600">
                      <SpeakerRenamer 
                        meetingId={id!}
                        speakerLabel={segment.speaker_label}
                        onRename={(oldLabel: string, newName: string) => {
                          setTranscript(prev => prev.map(s => 
                            s.speaker_label === oldLabel ? { ...s, speaker_label: newName } : s
                          ))
                        }}
                      />
                      <br/>
                      <span className="text-xs text-gray-400">
                        {Math.floor(segment.start_time)}s
                      </span>
                    </div>
                    <p className="text-gray-800">{segment.text}</p>
                  </div>
                ))}
                {transcript.length === 0 && (
                  <p className="text-gray-400 italic">Waiting for transcription...</p>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Automated Actions</h2>
              <ExecutionLog meetingId={id!} />
            </section>

            {meeting.insights?.summary && (
              <section className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Summary</h2>
                <p className="text-gray-700">{meeting.insights.summary}</p>
              </section>
            )}

            <section className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Action Items</h2>
              <ul className="space-y-3">
                {actions.map((action) => (
                  <li key={action.id} className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{action.description}</p>
                      {action.source_quote && (
                        <p className="text-xs text-gray-500 mt-1">{action.source_quote}</p>
                      )}
                    </div>
                  </li>
                ))}
                {actions.length === 0 && (
                  <p className="text-gray-400 italic text-sm">No actions detected yet.</p>
                )}
              </ul>
            </section>

            {meeting.insights?.decisions && meeting.insights.decisions.length > 0 && (
              <section className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Decisions</h2>
                <ul className="list-disc pl-4 space-y-2">
                  {meeting.insights.decisions.map((d: any, i: number) => (
                    <li key={i} className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">{d.text}</span>
                      {d.context && <p className="text-xs text-gray-500 mt-1">{d.context}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
