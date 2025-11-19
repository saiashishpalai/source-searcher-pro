import { useState } from 'react'

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
  const [plan, setPlan] = useState<AgentPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState<number | null>(null)
  const [results, setResults] = useState<Record<number, string>>({})

  const generatePlan = async () => {
    setLoading(true)
    try {
      const userId = "user_123"
      const apiUrl = import.meta.env.VITE_API_URL || 'https://localhost:8085'
      const res = await fetch(`${apiUrl}/api/v1/meetings/${meetingId}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      })
      const data = await res.json()
      setPlan(data)
    } catch (e) {
      console.error(e)
      alert("Failed to generate plan")
    }
    setLoading(false)
  }

  const executeAction = async (action: AgentAction, index: number) => {
    setExecuting(index)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://localhost:8085'
      const res = await fetch(`${apiUrl}/api/v1/actions/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
                    'bg-white border border-gray-300 hover:bg-gray-50'
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
