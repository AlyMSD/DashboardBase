import ProductsTable from '@/components/products-table'

export default function ProductsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      <ProductsTable />
    </div>
  )
}