'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { generateDefaultAutomations } from '@/lib/utils'

const TYPE_CONFIG = {
  CNF: { products: ['SCP', 'VDU', '5GC', 'IMS'], label: 'Cloud Native Function' },
  VNF: { products: ['vFirewall', 'vRouter', 'vEPC', 'vDNS'], label: 'Virtual Network Function' },
  PNF: { products: ['Physical Router', 'Physical Switch'], label: 'Physical Network Function', customProduct: true }
}

export default function NFDialog({ 
  open,
  onOpenChange,
  initialData,
  onSave
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: any
  onSave: (nf: any) => void
}) {
  const [type, setType] = useState(initialData?.type || '')
  const [product, setProduct] = useState(initialData?.product || '')
  const [customProduct, setCustomProduct] = useState('')
  const [vastId, setVastId] = useState(initialData?.vastId || '')

  useEffect(() => {
    if (initialData) {
      setType(initialData.type)
      setProduct(initialData.product)
      setVastId(initialData.vastId)
    }
  }, [initialData])

  const getAvailableProducts = () => type ? TYPE_CONFIG[type as keyof typeof TYPE_CONFIG]?.products || [] : []
  
  const handleProductChange = (value: string) => {
    setProduct(value === '__CUSTOM__' ? '' : value)
  }

  const handleSubmit = () => {
    const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG]
    const finalProduct = product === '__CUSTOM__' ? customProduct : product
    
    if (!type || !finalProduct) return
    
    const newNF = {
      ...(initialData && { id: initialData.id }),
      type,
      product: finalProduct,
      vastId,
      automations: initialData?.automations || generateDefaultAutomations()
    }
    
    onSave(newNF)
    onOpenChange(false)
    setType('')
    setProduct('')
    setCustomProduct('')
    setVastId('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit NF' : 'Add New NF'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_CONFIG).map(([typeKey, config]) => (
                  <SelectItem key={typeKey} value={typeKey}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Product</label>
              <Select value={product} onValueChange={handleProductChange}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${TYPE_CONFIG[type as keyof typeof TYPE_CONFIG].label} product`} />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableProducts().map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                  {TYPE_CONFIG[type as keyof typeof TYPE_CONFIG].customProduct && (
                    <SelectItem value="__CUSTOM__">Custom Product</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {product === '__CUSTOM__' && (
                <Input 
                  placeholder="Enter custom product name" 
                  value={customProduct} 
                  onChange={(e) => setCustomProduct(e.target.value)} 
                />
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">VAST ID (Optional)</label>
            <Input 
              placeholder="Enter VAST ID" 
              value={vastId} 
              onChange={(e) => setVastId(e.target.value)} 
            />
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleSubmit}
            disabled={!type || !(product || customProduct)}
          >
            {initialData ? 'Save Changes' : 'Add NF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}