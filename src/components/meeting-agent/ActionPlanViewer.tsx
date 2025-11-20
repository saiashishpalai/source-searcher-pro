import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface AgentAction {
  type: string
  params: any
  user_id: string
}

interface AgentPlan {
  actions: AgentAction[]
  reasoning: string
}

export default function ActionPlanViewer({ meetingId }: { meetingId: string }) {
  const { user } = useAuth()
  const [plan, setPlan] = useState<AgentPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState<number | null>(null)
  const [results, setResults] = useState<Record<number, string>>({})

  const generatePlan = async () => {
    console.log('🎯 [ActionPlanViewer] Generate plan clicked')
    console.log('🎯 [ActionPlanViewer] Meeting ID:', meetingId)
    console.log('🎯 [ActionPlanViewer] User ID:', user?.id)
    
    if (!user?.id) {
      console.error('❌ [ActionPlanViewer] No user ID!')
      alert('Please log in to generate action plans')
      return
    }
    
    setLoading(true)
    try {
      // Get session token for authentication
      console.log('🔑 [ActionPlanViewer] Getting session token...')
      const { supabase } = await import('@/integrations/supabase/client')
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🔑 [ActionPlanViewer] Session token:', session?.access_token ? 'Present' : 'Missing')
      
      const url = `/api/agent/meetings/${meetingId}/plan`
      const payload = { user_id: user.id }
      console.log('📤 [ActionPlanViewer] POST', url)
      console.log('📤 [ActionPlanViewer] Payload:', payload)
      
      // Add timeout to fetch (90 seconds for OpenAI)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.error('⏱️ [ActionPlanViewer] Request timed out after 90s')
        controller.abort()
      }, 90000) // 90 second timeout
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      console.log('📥 [ActionPlanViewer] Response status:', res.status)
      console.log('📥 [ActionPlanViewer] Response OK:', res.ok)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('❌ [ActionPlanViewer] Error response:', errorText)
        throw new Error(`HTTP ${res.status}: ${errorText}`)
      }
      
      const data = await res.json()
      console.log('✅ [ActionPlanViewer] Plan received:', data)
      console.log('✅ [ActionPlanViewer] Actions count:', data.actions?.length || 0)
      setPlan(data)
    } catch (e) {
      console.error('❌ [ActionPlanViewer] Exception:', e)
      alert("Failed to generate plan: " + (e as Error).message)
    }
    setLoading(false)
    console.log('🏁 [ActionPlanViewer] Generate plan completed')
  }

  const executeAction = async (action: AgentAction, index: number) => {
    if (!user?.id) {
      alert('Please log in to execute actions')
      return
    }
    
    setExecuting(index)
    try {
      // Get session token for authentication
      const { supabase } = await import('@/integrations/supabase/client')
      const { data: { session } } = await supabase.auth.getSession()
      
      const res = await fetch(`/api/agent/actions/execute`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify(action)
      })
      const data = await res.json()
      if (data.status === 'success') {
        setResults(prev => ({ ...prev, [index]: 'success' }))
      } else {
        setResults(prev => ({ ...prev, [index]: 'error' }))
      }
    } catch (e) {
      setResults(prev => ({ ...prev, [index]: 'error' }))
    }
    setExecuting(null)
  }

  return (
    <section className="bg-white p-6 rounded-lg shadow border border-blue-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-blue-900">Agent Actions</h2>
        {!plan && (
          <button 
            onClick={generatePlan}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generating Plan...' : 'Generate Plan'}
          </button>
        )}
      </div>

      {plan && (
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded text-sm text-blue-800">
            <strong>Reasoning:</strong> {plan.reasoning}
          </div>

          <div className="space-y-3">
            {plan.actions.map((action, idx) => (
              <div key={idx} className="border rounded p-4 flex justify-between items-center bg-gray-50">
                <div>
                  <div className="font-medium text-gray-900">
                    {action.type === 'create_task' && 'Create Task'}
                    {action.type === 'send_slack' && 'Send Slack Message'}
                    {action.type === 'create_page' && 'Create Notion Page'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {action.type === 'create_task' && action.params.content}
                    {action.type === 'send_slack' && `To: ${action.params.channel_id}`}
                    {action.type === 'create_page' && `Page: ${action.params.title}`}
                  </div>
                </div>
                
                <button
                  onClick={() => executeAction(action, idx)}
                  disabled={executing !== null || results[idx] === 'success'}
                  className={`px-3 py-1 rounded text-sm ${
                    results[idx] === 'success' ? 'bg-green-100 text-green-700' :
                    results[idx] === 'error' ? 'bg-red-100 text-red-700' :
                    'bg-white border border-gray-300 hover:bg-gray-50 text-gray-900'
                  }`}
                >
                  {results[idx] === 'success' ? 'Done' : 
                   results[idx] === 'error' ? 'Retry' :
                   executing === idx ? 'Running...' : 'Execute'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
