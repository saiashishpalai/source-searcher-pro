import { useState, useEffect } from 'react'
import { toast } from '@/components/ui/sonner'

interface Execution {
  id: string
  action_type: string
  action_params: {
    content?: string
    channel_id?: string
    title?: string
    [key: string]: any
  }
  todoist_task_id?: string
  todoist_task_url?: string
  status: 'pending' | 'executing' | 'success' | 'failed' | 'completed'
  error_message?: string
  retry_count: number
  executed_at?: string
  created_at: string
}

interface ExecutionLogProps {
  meetingId: string
}

const getActionTypeLabel = (type: string) => {
  switch (type) {
    case 'create_task':
      return 'Created Todoist Task'
    case 'send_slack':
      return 'Send Slack Message'
    case 'create_page':
      return 'Create Notion Page'
    default:
      return type
  }
}

export default function ExecutionLog({ meetingId }: ExecutionLogProps) {
  const [executions, setExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let channel: any = null
    
    const fetchExecutions = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client')
        const { data: { session } } = await supabase.auth.getSession()

        const res = await fetch(`/api/agent/meetings/${meetingId}/executions`, {
          headers: {
            ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
          }
        })

        if (!res.ok) {
          throw new Error('Failed to fetch executions')
        }

        const data = await res.json()
        setExecutions(data)
        
        // Show notifications for failed actions
        const failedActions = data.filter((e: Execution) => e.status === 'failed')
        failedActions.forEach((execution: Execution) => {
          toast.error('Action Failed', {
            description: `${getActionTypeLabel(execution.action_type)}: ${execution.error_message || 'Unknown error'}`,
            duration: 10000
          })
        })
        
        // Setup subscription after fetching initial data
        channel = supabase
          .channel(`executions-${meetingId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'action_executions',
            filter: `meeting_id=eq.${meetingId}`
          }, (payload: any) => {
            const newExecution = payload.new as Execution
            setExecutions(prev => [...prev, newExecution])
            
            // Show notification for failed actions
            if (newExecution.status === 'failed') {
              toast.error('Action Failed', {
                description: `${getActionTypeLabel(newExecution.action_type)}: ${newExecution.error_message || 'Unknown error'}`,
                duration: 10000
              })
            }
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'action_executions',
            filter: `meeting_id=eq.${meetingId}`
          }, (payload: any) => {
            const updatedExecution = payload.new as Execution
            setExecutions(prev => prev.map(e => e.id === updatedExecution.id ? updatedExecution : e))
            
            // Show notification if status changed to failed
            if (updatedExecution.status === 'failed' && payload.old.status !== 'failed') {
              toast.error('Action Failed', {
                description: `${getActionTypeLabel(updatedExecution.action_type)}: ${updatedExecution.error_message || 'Unknown error'}`,
                duration: 10000
              })
            }
            
            // Show success notification if task completed
            if (updatedExecution.status === 'completed' && payload.old.status !== 'completed') {
              toast.success('Task Completed', {
                description: `${getActionTypeLabel(updatedExecution.action_type)} was completed in Todoist`,
                duration: 5000
              })
            }
          })
          .subscribe()
      } catch (error) {
        console.error('Error fetching executions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchExecutions()

    return () => {
      if (channel) {
        import('@/integrations/supabase/client').then(({ supabase }) => {
          supabase.removeChannel(channel)
        })
      }
    }
  }, [meetingId])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <span className="text-green-600 font-medium">✓ Success</span>
      case 'failed':
        return <span className="text-red-600 font-medium">✗ Failed</span>
      case 'pending':
        return <span className="text-yellow-600 font-medium">⏳ Pending Approval</span>
      case 'executing':
        return <span className="text-blue-600 font-medium">⟳ Executing</span>
      default:
        return <span className="text-gray-600">{status}</span>
    }
  }

  const getActionContent = (execution: Execution) => {
    if (execution.action_type === 'create_task') {
      return execution.action_params.content || 'Task'
    } else if (execution.action_type === 'send_slack') {
      return `To: ${execution.action_params.channel_id || 'channel'}`
    } else if (execution.action_type === 'create_page') {
      return `Page: ${execution.action_params.title || 'Untitled'}`
    }
    return JSON.stringify(execution.action_params)
  }

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500">
        Loading execution log...
      </div>
    )
  }

  if (executions.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No actions executed yet
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {executions.map(execution => (
        <div 
          key={execution.id} 
          className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="font-medium text-gray-900 mb-1">
                {getActionTypeLabel(execution.action_type)}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {getActionContent(execution)}
              </div>
              
              {execution.todoist_task_url && (
                <a 
                  href={execution.todoist_task_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm hover:underline inline-flex items-center gap-1"
                >
                  View in Todoist →
                </a>
              )}
              
              {execution.error_message && (
                <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                  <strong>Error:</strong> {execution.error_message}
                  {execution.retry_count > 0 && (
                    <span className="ml-2 text-gray-600">
                      (Retried {execution.retry_count} time{execution.retry_count !== 1 ? 's' : ''})
                    </span>
                  )}
                </div>
              )}
              
              {execution.retry_count > 0 && !execution.error_message && (
                <div className="mt-1 text-xs text-gray-500">
                  Retried {execution.retry_count} time{execution.retry_count !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            <div className="ml-4">
              {getStatusBadge(execution.status)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

