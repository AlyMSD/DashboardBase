'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import CircularProgress from '@/components/circular-progress'

interface Url {
  name: string
  url: string
  percentage: number
}

interface Automation {
  id: string
  name: string
  urls: Url[]
}

interface AutomationCardProps {
  automation: Automation
}

export default function AutomationCard({ automation }: AutomationCardProps) {
  const average = automation.urls.length > 0 
    ? automation.urls.reduce((sum, url) => sum + url.percentage, 0) / automation.urls.length
    : 0

  return (
    <Card className="w-full p-2 hover:shadow-lg transition-shadow">
      <CardHeader className="p-2">
        <CardTitle className="text-lg">{automation.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="h-32 flex items-center justify-center">
          <CircularProgress percentage={average} size={70} />
        </div>
        <div className="mt-2">
          <h4 className="font-semibold text-sm mb-1">URLs:</h4>
          <ul className="space-y-1">
            {automation.urls.map((url, index) => (
              <li 
                key={index} 
                className="flex justify-between items-center text-sm"
              >
                <a
                  href={url.url}
                  className="text-blue-600 hover:underline truncate"
                  target="_blank"
                  rel="noopener noreferrer"
                  title={url.name}
                >
                  {url.name}
                </a>
                <span className="ml-2 text-gray-500">{url.percentage}%</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
