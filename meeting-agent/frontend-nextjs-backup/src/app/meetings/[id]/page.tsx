'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Meeting, TranscriptSegment, ActionItem } from '@/types/meeting'
import SpeakerRenamer from '@/components/meeting/SpeakerRenamer'
import ActionPlanViewer from '@/components/meeting/ActionPlanViewer'

export default function MeetingReviewPage() {
  const params = useParams()
  const id = params.id as string
  
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([])
  const [actions, setActions] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)

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
    <div className="max-w-5xl mx-auto p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{meeting.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className={`px-2 py-1 rounded-full ${
            meeting.status === 'done' ? 'bg-green-100 text-green-800' : 
            meeting.status === 'failed' ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
          }`}>
            {meeting.status.toUpperCase()}
          </span>
          <span>{new Date(meeting.created_at).toLocaleDateString()}</span>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-8">
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Transcript</h2>
            <div className="space-y-4">
              {transcript.map((segment) => (
                <div key={segment.id} className="flex gap-4">
                  <div className="w-24 flex-shrink-0 text-sm font-medium text-gray-600">
                    <SpeakerRenamer 
                      meetingId={id}
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
          <ActionPlanViewer meetingId={id} />

          {meeting.insights?.summary && (
            <section className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Summary</h2>
              <p className="text-gray-700">{meeting.insights.summary}</p>
            </section>
          )}

          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Action Items</h2>
            <ul className="space-y-3">
              {actions.map((action) => (
                <li key={action.id} className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" />
                  <div>
                    <p className="text-sm font-medium">{action.description}</p>
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
              <h2 className="text-xl font-semibold mb-4">Decisions</h2>
              <ul className="list-disc pl-4 space-y-2">
                {meeting.insights.decisions.map((d: any, i: number) => (
                  <li key={i} className="text-sm text-gray-700">
                    <span className="font-medium">{d.text}</span>
                    {d.context && <p className="text-xs text-gray-500 mt-1">{d.context}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
