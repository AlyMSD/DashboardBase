'use client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import CircularProgress from '@/components/circular-progress'

export default function NFCard({ nf }: { 
  nf: any
}) {
  const router = useRouter()
  const average = ((nf.automations || []).reduce((acc: number, automation: any) => {
    const urls = automation.urls || []
    const sum = urls.reduce((total: number, url: any) => total + (url?.percentage || 0), 0)
    return acc + (urls.length ? sum / urls.length : 0)
  }, 0) / Math.max(nf.automations?.length || 1, 1)) || 0

  return (
    <Card className="w-full p-2">
      <CardHeader className="p-2">
        <CardTitle className="text-lg">{nf.type} - {nf.product}</CardTitle>
        <CardDescription className="text-sm">VAST ID: {nf.vastId || 'N/A'}</CardDescription>
      </CardHeader>
      <CardContent className="p-2">
        <div className="h-24 flex items-center justify-center">
          <CircularProgress percentage={average} size={70} />
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 p-2">
        <Button 
          variant="outline" 
          className="flex-1 text-sm h-8"
          onClick={() => router.push(`/dashboard/${nf._id}`)}
        >
          View
        </Button>
      </CardFooter>
    </Card>
  )
}
