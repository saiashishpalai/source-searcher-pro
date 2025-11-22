import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface Meeting {
  id: string
  title: string
  created_at: string
  status: string
  tasks_created: number
  pending_approvals: number
}

export default function Dashboard() {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return

    const fetchMeetings = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client')
        const { data: { session } } = await supabase.auth.getSession()

        const res = await fetch(`/api/agent/meetings?user_id=${user.id}`, {
          headers: {
            ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
          }
        })

        if (!res.ok) {
          throw new Error('Failed to fetch meetings')
        }

        const data = await res.json()
        setMeetings(data)
      } catch (error) {
        console.error('Error fetching meetings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMeetings()
  }, [user?.id])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'text-green-600'
      case 'processing':
      case 'transcribed':
        return 'text-yellow-600'
      case 'failed':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading meetings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meeting Agent Dashboard</h1>
          <p className="text-gray-600">View all your meetings and their automated actions</p>
        </div>
        <Link 
          to="/agent/upload"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upload Meeting
        </Link>
      </div>

      {meetings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No meetings found</p>
          <Link 
            to="/agent/upload" 
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Upload Your First Meeting
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {meetings.map(meeting => (
            <Link 
              to={`/agent/meetings/${meeting.id}`} 
              key={meeting.id}
              className="block"
            >
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {meeting.title || 'Untitled Meeting'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatDate(meeting.created_at)}
                    </p>
                  </div>
                  <span className={`text-sm font-medium ${getStatusColor(meeting.status)}`}>
                    {meeting.status}
                  </span>
                </div>
                
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-medium">✓</span>
                    <span className="text-gray-700">
                      {meeting.tasks_created} task{meeting.tasks_created !== 1 ? 's' : ''} created
                    </span>
                  </div>
                  {meeting.pending_approvals > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-600 font-medium">⏳</span>
                      <span className="text-gray-700">
                        {meeting.pending_approvals} pending approval{meeting.pending_approvals !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

