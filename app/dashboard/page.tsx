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

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/nfs')
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
      await fetch('/api/nfs', {
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
            key={nf.id}
            nf={nf}
            onDelete={(id) => persistNFs(nfs.filter(m => m.id !== id))}
          />
        ))}
      </div>

      <NFDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        initialData={editNF}
        onSave={(nf) => persistNFs([...nfs, { ...nf, id: Date.now().toString() }])}
      />
    </>
  )
}