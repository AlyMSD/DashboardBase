'use client'
import { useEffect, useState, use } from 'react'
import { ArrowLeft, PlusCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import AutomationDialog from '@/components/automation-dialog'
import AutomationCard from '@/components/automation-card'
import { useRouter } from 'next/navigation'

export default function NFDetailsPageClient({ params }: { params: Promise<{ nfId: string }> }) {
  const router = useRouter()
  const { nfId } = use(params) // Unwrap the params promise
  
  const [nf, setNF] = useState<any>(null)
  const [editAutomation, setEditAutomation] = useState<any>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadNF = async () => {
      try {
        const res = await fetch('/api/nfs');
        const data = await res.json();
        const foundNF = data.find((n: any) => n.id.toString() === nfId);
        
        if (!foundNF) {
          setError(`NF with ID ${nfId} not found`);
          return;
        }
        
        setNF(foundNF);
        setError(null);
      } catch (error) {
        console.error('Error loading NF:', error);
        setError('Failed to load NF details');
      } finally {
        setLoading(false);
      }
    };
    loadNF();
  }, [nfId]); // Now using nfId directly as dependency

  const handleUpdateNF = async (updatedNF: any) => {
    try {
      const res = await fetch('/api/nfs')
      const currentNFs = await res.json()
      const updatedNFs = currentNFs.map((n: any) =>
        n.id.toString() === updatedNF.id.toString() ? updatedNF : n
      )
      
      await fetch('/api/nfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedNFs),
      })
      
      setNF(updatedNF)
    } catch (error) {
      console.error('Update error:', error)
    }
  }

  const handleAddAutomation = (newAutomation: any) => {
    const updatedNF = {
      ...nf,
      automations: [
        ...nf.automations,
        { ...newAutomation, id: Date.now().toString() }
      ]
    }
    handleUpdateNF(updatedNF)
  }

  const handleEditAutomation = (editedAutomation: any) => {
    const updatedNF = {
      ...nf,
      automations: nf.automations.map((a: any) =>
        a.id === editedAutomation.id ? editedAutomation : a
      )
    }
    handleUpdateNF(updatedNF)
    setEditAutomation(null)
  }

  const handleDeleteAutomation = (automationId: string) => {
    const updatedNF = {
      ...nf,
      automations: nf.automations.filter((a: any) => a.id !== automationId)
    }
    handleUpdateNF(updatedNF)
  }

  if (!nf) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h1 className="text-3xl font-bold">
          {nf.type} - {nf.product}
        </h1>
      </div>

      <Button onClick={() => setAddDialogOpen(true)}>
        <PlusCircle className="w-4 h-4 mr-2" />
        Add Automation
      </Button>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {nf.automations?.map((automation: any) => (
          <AutomationCard
            key={automation.id}
            automation={automation}
            onEdit={setEditAutomation}
            onDelete={handleDeleteAutomation}
          />
        ))}
      </div>

      <AutomationDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleAddAutomation}
      />

      {editAutomation && (
        <AutomationDialog
          open={!!editAutomation}
          onOpenChange={(open) => !open && setEditAutomation(null)}
          initialData={editAutomation}
          onSave={handleEditAutomation}
        />
      )}
    </div>
  )
}
