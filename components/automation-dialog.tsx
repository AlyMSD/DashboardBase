'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { generateRandomPercentage } from '@/lib/utils'

interface AutomationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: any
  onSave: (automation: any) => void
}

export default function AutomationDialog({ open, onOpenChange, initialData, onSave }: AutomationDialogProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [urls, setUrls] = useState(initialData?.urls || [])

  const handleSubmit = () => {
    onSave({
      ...(initialData && { id: initialData.id }),
      name,
      urls: urls.map((url: any) => ({
        name: url.name,
        url: url.url,
        percentage: url.percentage
      }))
    })
    onOpenChange(false)
    resetForm()
  }

  const resetForm = () => {
    setName('')
    setUrls([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Automation' : 'Add New Automation'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label>Name</label>
            <Input
              placeholder="Enter automation name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label>URLs (up to 10)</label>
            {urls.map((url: any, index: number) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  placeholder="URL Name"
                  value={url.name}
                  onChange={(e) => {
                    const newUrls = [...urls]
                    newUrls[index].name = e.target.value
                    setUrls(newUrls)
                  }}
                  className="flex-1"
                />
                <Input
                  placeholder="URL"
                  value={url.url}
                  onChange={(e) => {
                    const newUrls = [...urls]
                    newUrls[index].url = e.target.value
                    setUrls(newUrls)
                  }}
                  className="flex-1"
                />
              </div>
            ))}
            {urls.length < 10 && (
              <Button
                variant="outline"
                onClick={() => setUrls([...urls, { name: '', url: '', percentage: generateRandomPercentage() }])}
              >
                Add URL
              </Button>
            )}
          </div>
          
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!name || urls.some((url: any) => !url.name || !url.url)}
          >
            {initialData ? 'Save Changes' : 'Add Automation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}