export interface Meeting {
  id: string
  title: string
  audio_url: string
  status: 'processing' | 'transcribed' | 'done' | 'failed'
  created_at: string
  insights?: {
    summary: string
    decisions: Array<{ text: string; context?: string }>
    blockers: Array<{ text: string }>
    risks: Array<{ text: string; severity: string }>
  }
}

export interface TranscriptSegment {
  id: string
  meeting_id: string
  speaker_label: string
  verified_speaker_id?: string
  text: string
  start_time: number
  end_time: number
}

export interface ActionItem {
  id: string
  description: string
  assignee_id?: string
  status: 'open' | 'closed'
  source_quote?: string
}
