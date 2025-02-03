'use client'
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

interface AnalyticsData {
  field: string
  count: number
  average?: number
  max?: number
  min?: number
}

export default function AnalyticsPage() {
  const [query, setQuery] = useState('')
  const [data, setData] = useState<AnalyticsData[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/mongo-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })
      
      const result = await response.json()
      if (response.ok) {
        setData(result.data)
      } else {
        console.error('Error:', result.error)
      }
    } catch (error) {
      console.error('Network error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">MongoDB Data Analytics</h1>
      
      <div className="flex gap-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter MongoDB query (e.g., { 'category': 'electronics' })"
          className="flex-1"
        />
        <Button onClick={fetchData} disabled={loading}>
          {loading ? 'Loading...' : 'Analyze'}
        </Button>
      </div>

      {data.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <BarChart width={800} height={400} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="field" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" name="Document Count" />
            <Bar dataKey="average" fill="#82ca9d" name="Average Value" />
            <Bar dataKey="max" fill="#ffc658" name="Maximum Value" />
            <Bar dataKey="min" fill="#ff7300" name="Minimum Value" />
          </BarChart>
        </div>
      )}
    </div>
  )
}