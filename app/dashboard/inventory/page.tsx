"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    Package,
    AlertCircle,
    IndianRupee,
    BarChart3,
    Search,
    Plus,
    Warehouse as WarehouseIcon,
    ArrowUpRight,
    Clock,
    Filter,
    ChevronDown
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card"
import { Button, cn } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "../../components/ui/select"

import { useRouter } from "next/navigation"

export default function InventoryPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [warehouses, setWarehouses] = useState<any[]>([])
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all")
    const [products, setProducts] = useState<any[]>([])
    const [pendingOrders, setPendingOrders] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [userRole, setUserRole] = useState<string>('warehouse_staff')

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)

            // 1. Fetch Warehouses
            const { data: wData } = await supabase.from('warehouses').select('*').order('w_name')
            setWarehouses(wData || [])

            // 2. Fetch Products with stocks and categories
            let pQuery = supabase.from('products').select(`
                *,
                categories(cat_name),
                product_warehouse(stock, w_id, warehouses(w_name))
            `)
            const { data: pData } = await pQuery.order('p_name')
            setProducts(pData || [])

            // 3. Fetch Pending Orders
            const { data: oData } = await supabase
                .from('orders')
                .select(`
                    *,
                    products(p_name),
                    suppliers(s_name),
                    warehouses!orders_target_w_id_fkey(w_name)
                `)
                .neq('status', 'received')
                .order('date', { ascending: false })
            setPendingOrders(oData || [])

            // 4. Resolve Role
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: emp } = await supabase.from('employees').select('role_id').eq('user_id', user.id).single()
                if (emp?.role_id) {
                    const { data: roleRec } = await supabase.from('roles').select('role_name').eq('role_id', emp.role_id).single()
                    if (roleRec?.role_name === 'Administrator') setUserRole('admin')
                    else if (roleRec?.role_name === 'Warehouse Manager') setUserRole('manager')
                    else if (roleRec?.role_name === 'Sales Representative') setUserRole('sales_representative')
                    else if (roleRec?.role_name) setUserRole(roleRec.role_name.toLowerCase().replace(/ /g, '_'))
                }
            }

            setLoading(false)
        }
        fetchData()
    }, [supabase])


    // Filter Logic
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.p_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase())

        if (selectedWarehouse === "all") return matchesSearch

        const hasStockInWarehouse = p.product_warehouse?.some((pw: any) => pw.w_id.toString() === selectedWarehouse)
        return matchesSearch && hasStockInWarehouse
    })

    const filteredOrders = pendingOrders.filter(o =>
        selectedWarehouse === "all" || o.target_w_id?.toString() === selectedWarehouse
    )

    // Stats Calculation for Current View
    const displayProducts = filteredProducts.map(p => {
        // Dynamically sum warehouse stocks instead of relying on the products.quantity column
        const totalActualStock = p.product_warehouse?.reduce((sum: number, pw: any) => sum + (pw.stock || 0), 0) || 0
        const stock = selectedWarehouse === "all"
            ? totalActualStock
            : p.product_warehouse?.find((pw: any) => pw.w_id.toString() === selectedWarehouse)?.stock || 0
        return { ...p, currentStock: stock }
    })

    const totalStock = displayProducts.reduce((sum, p) => sum + (p.currentStock || 0), 0)
    const totalValue = displayProducts.reduce((sum, p) => sum + (p.currentStock * Number(p.unit_price || 0)), 0)
    const lowStockCount = displayProducts.filter(p => p.currentStock < 10).length
    const pendingOrderCount = filteredOrders.length

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Loading real-time inventory data...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Inventory</h1>
                    <p className="text-muted-foreground mt-1">
                        {selectedWarehouse === "all"
                            ? "Global view of all assets across the network."
                            : `Filtered view for ${warehouses.find(w => w.w_id.toString() === selectedWarehouse)?.w_name}.`}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border shadow-sm">
                        <WarehouseIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Warehouse</span>
                        <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                            <SelectTrigger className="w-[200px] border-none bg-transparent h-7 focus:ring-0">
                                <SelectValue placeholder="Select Warehouse" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Warehouses</SelectItem>
                                {warehouses.map(w => (
                                    <SelectItem key={w.w_id} value={w.w_id.toString()}>{w.w_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className={`grid gap-6 md:grid-cols-2 ${userRole === 'sales_representative' ? 'lg:grid-cols-1' : 'lg:grid-cols-4'}`}>
                <Card className="relative overflow-hidden group hover:shadow-md transition-all border-l-4 border-l-primary">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Stock</span>
                            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Package className="h-4 w-4" /></div>
                        </div>
                        <div className="text-3xl font-black">{totalStock.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            Units Available
                        </div>
                    </CardContent>
                </Card>

                {userRole !== 'sales_representative' && (
                    <>
                        <Card className="relative overflow-hidden group hover:shadow-md transition-all border-l-4 border-l-emerald-500">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Asset Value</span>
                                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600"><IndianRupee className="h-4 w-4" /></div>
                                </div>
                                <div className="text-3xl font-black">₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                <div className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                                    <ArrowUpRight className="h-3 w-3" /> Market Valuation
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="relative overflow-hidden group hover:shadow-md transition-all border-l-4 border-l-amber-500">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Stock Critical</span>
                                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600"><AlertCircle className="h-4 w-4" /></div>
                                </div>
                                <div className="text-3xl font-black">{lowStockCount}</div>
                                <div className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                                    Below 10 unit threshold
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {userRole !== 'sales_representative' && (
                    <Card className="relative overflow-hidden group hover:shadow-md transition-all border-l-4 border-l-indigo-500">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pipeline</span>
                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-600"><Clock className="h-4 w-4" /></div>
                            </div>
                            <div className="text-3xl font-black">{pendingOrderCount}</div>
                            <div className="text-[10px] text-indigo-600 mt-1 flex items-center gap-1">
                                Incoming Shipments
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Main Content Layout */}
            <div className={`grid gap-8 ${userRole === 'sales_representative' ? 'grid-cols-1' : 'lg:grid-cols-3'}`}>
                {/* Product Catalog */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            Catalog <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{displayProducts.length} Items</span>
                        </h2>
                        <div className="flex items-center gap-2">
                            <div className="relative w-48 lg:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    className="pl-9 h-9 text-sm"
                                    placeholder="Part # or Mfg..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <Card className="overflow-hidden border-none shadow-lg bg-card/60 backdrop-blur">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b">
                                    <tr className="text-left py-4">
                                        <th className="px-6 py-4 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Product & Spec</th>
                                        <th className="px-6 py-4 font-bold text-muted-foreground uppercase text-[10px] tracking-wider text-right">Available</th>
                                        {userRole !== 'sales_representative' && (
                                            <th className="px-6 py-4 font-bold text-muted-foreground uppercase text-[10px] tracking-wider text-right">Unit Price</th>
                                        )}
                                        <th className="px-6 py-4 font-bold text-muted-foreground uppercase text-[10px] tracking-wider text-center">Location</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-muted/30">
                                    {displayProducts.map((p) => (
                                        <tr
                                            key={p.pid}
                                            onDoubleClick={() => router.push(`/dashboard/inventory/${p.pid}`)}
                                            className="group hover:bg-muted/40 transition-colors cursor-pointer select-none"
                                            title="Double-click for detailed analytics"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-base">{p.p_name}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-muted font-bold text-muted-foreground">{p.manufacturer}</span>
                                                    <span className="text-[10px] text-muted-foreground">{p.categories?.cat_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`text-lg font-black ${p.currentStock < 10 && userRole !== 'sales_representative' ? 'text-red-500' : p.currentStock < 50 && userRole !== 'sales_representative' ? 'text-amber-500' : 'text-foreground'}`}>
                                                    {p.currentStock}
                                                </div>
                                            </td>
                                            {userRole !== 'sales_representative' && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-mono font-bold">₹{Number(p.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {p.product_warehouse?.map((pw: any) => (
                                                        <div
                                                            key={pw.w_id}
                                                            className={cn(
                                                                "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase transition-all",
                                                                pw.stock > 0
                                                                    ? "bg-indigo-600 text-white shadow-[0_2px_4px_rgba(79,70,229,0.3)]"
                                                                    : "bg-muted text-muted-foreground/30 opacity-50"
                                                            )}
                                                            title={`${pw.warehouses?.w_name}: ${pw.stock} units`}
                                                        >
                                                            {pw.warehouses?.w_name?.split(' ')[0][0]}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Sidebar: Pipeline & Orders */}
                {userRole !== 'sales_representative' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                                Pipeline <span className="text-xs font-normal text-muted-foreground bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded-full">Coming Soon</span>
                            </h2>
                            <div className="space-y-3">
                                {filteredOrders.length > 0 ? filteredOrders.map(o => (
                                    <Card key={o.po_id} className="border-none shadow bg-card overflow-hidden">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-xs truncate max-w-[150px]">{o.products?.p_name}</div>
                                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-600 border border-indigo-500/10">
                                                    {o.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                                <span>Qty: <span className="text-foreground font-bold">{o.quantity}</span></span>
                                                <span>To: <span className="text-foreground font-bold">{o.warehouses?.w_name?.split('-')[0]}</span></span>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-dashed text-[9px] text-muted-foreground flex items-center justify-between">
                                                <span>From: {o.suppliers?.s_name}</span>
                                                <span className="font-mono">₹{Number(o.price || 0).toLocaleString('en-IN')}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )) : (
                                    <div className="text-center py-10 border rounded-lg border-dashed">
                                        <p className="text-xs text-muted-foreground">No pending shipments.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function RefreshCw(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
        </svg>
    )
}
