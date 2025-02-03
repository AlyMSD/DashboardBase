'use client'
import { useEffect, useState } from 'react'

export default function ProductsTable() {
  const [products, setProducts] = useState<any[]>([])
  const headers = ['Product', 'Info 1', 'Info 2', 'Info 3', 'Info 4', 'Info 5', 'Info 6', 'Info 7', 'Info 8']

  useEffect(() => {
    fetch('/products.json')
      .then(res => res.json())
      .then(setProducts)
      .catch(console.error)
  }, [])

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full">
        {/* ... table structure ... */}
      </table>
    </div>
  )
}