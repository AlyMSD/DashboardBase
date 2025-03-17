'use client'
import { useState, useEffect } from 'react'
import { PlusCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import NFCard from '@/components/nf-card'
import NFDialog from '@/components/nf-dialog'

export default function DashboardPage() {
  const [nfs, setNfs] = useState<any[]>([])
  const [editNF, setEditNF] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const API_URL = 'http://localhost:5000/api/nfs'

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(API_URL)
        const data = await res.json()
        setNfs(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error loading NFs:', error)
      }
    }
    loadData()
  }, [])

  const persistNFs = async (newNFs: any[]) => {
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNFs),
      })
      setNfs(newNFs)
    } catch (error) {
      console.error('Persist error:', error)
    }
  }

  return (
    <>
      <div className="mb-6 space-y-4">
        <h1 className="text-2xl font-bold">NAAVI Dashboard</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="w-4 h-4 mr-2" /> Add NF
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {nfs.map((nf) => (
          <NFCard 
            key={nf._id} // using _id from MongoDB
            nf={nf}
            onDelete={(id) => persistNFs(nfs.filter(m => m._id !== id))}
          />
        ))}
      </div>

      <NFDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        initialData={editNF}
        onSave={(nf) => persistNFs([...nfs, { ...nf, _id: Date.now().toString() }])}
      />
    </>
  )
}
