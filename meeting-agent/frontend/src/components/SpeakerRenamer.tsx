import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface SpeakerRenamerProps {
  meetingId: string
  speakerLabel: string
  currentName?: string
  onRename: (label: string, newName: string) => void
}

export default function SpeakerRenamer({ meetingId, speakerLabel, currentName, onRename }: SpeakerRenamerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(currentName || speakerLabel)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    
    const { error } = await supabase
      .from('transcripts')
      .update({ speaker_label: name })
      .eq('meeting_id', meetingId)
      .eq('speaker_label', speakerLabel)

    if (!error) {
      onRename(speakerLabel, name)
      setIsEditing(false)
    }
    setSaving(false)
  }

  if (!isEditing) {
    return (
      <button 
        onClick={() => setIsEditing(true)}
        className="text-sm font-medium text-blue-600 hover:underline text-left"
      >
        {name}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border rounded px-2 py-1 text-sm w-32"
        autoFocus
      />
      <button 
        onClick={handleSave}
        disabled={saving}
        className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
      >
        {saving ? '...' : '✓'}
      </button>
      <button 
        onClick={() => setIsEditing(false)}
        className="text-xs text-gray-500"
      >
        ✕
      </button>
    </div>
  )
}
