import Link from 'next/link'
import { LayoutDashboard, Table } from 'lucide-react'

const Sidebar = () => (
  <div className="w-64 fixed left-0 top-0 h-screen bg-white border-r p-4">
    <div className="flex items-center gap-2 mb-8">
      <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Verizon_2024.svg" 
           alt="Logo" className="h-100 w-50" />
    </div>
    <nav className="space-y-2">
      <Link href="/dashboard" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
        <LayoutDashboard className="h-4 w-4" /> Dashboard
      </Link>
      <Link href="/products" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
        <Table className="h-4 w-4" /> Products Table
      </Link>
    </nav>
  </div>
)

export default Sidebar