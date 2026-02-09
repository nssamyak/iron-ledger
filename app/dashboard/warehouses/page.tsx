"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    Warehouse as WarehouseIcon,
    Plus,
    Search,
    TrendingUp,
    ShieldAlert,
    MoreVertical,
    ArrowUpRight,
    Package,
    IndianRupee,
    Signal,
    Activity,
    Users
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Badge } from "@/app/components/ui/badge"
import Link from "next/link"
import { motion } from "framer-motion"

export default function WarehousesStatsPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [warehouses, setWarehouses] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [userRole, setUserRole] = useState<string>('warehouse_staff')

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)

            // 1. Fetch Warehouses and their Managers
            const { data: wData } = await supabase.from('warehouses').select('*, employees(e_name)').order('w_name')

            // 2. Fetch all stocks to calculate totals per warehouse
            const { data: stockData } = await supabase.from('product_warehouse').select('w_id, stock, products(unit_price)')

            // 3. Resolve Role
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: emp } = await supabase.from('employees').select('role_id').eq('user_id', user.id).single()
                if (emp?.role_id) {
                    const { data: roleRec } = await supabase.from('roles').select('role_name').eq('role_id', emp.role_id).single()
                    if (roleRec?.role_name === 'Administrator') setUserRole('admin')
                    else if (roleRec?.role_name === 'Warehouse Manager') setUserRole('manager')
                }
            }

            // 4. Transform data to include stats
            const enhancedWarehouses = wData?.map(wh => {
                const whStocks = stockData?.filter(s => s.w_id === wh.w_id) || []
                const totalStock = whStocks.reduce((sum, s) => sum + (s.stock || 0), 0)
                const totalValue = whStocks.reduce((sum, s: any) => {
                    const prod = Array.isArray(s.products) ? s.products[0] : s.products
                    const price = prod?.unit_price || 0
                    return sum + ((s.stock || 0) * (Number(price) || 0))
                }, 0)
                const itemsCount = whStocks.length
                const occupancy = wh.capacity ? (totalStock / wh.capacity) * 100 : 0

                return {
                    ...wh,
                    totalStock,
                    totalValue,
                    itemsCount,
                    occupancy
                }
            }) || []

            setWarehouses(enhancedWarehouses)
            setLoading(false)
        }
        fetchData()
    }, [supabase])

    const filteredWarehouses = warehouses.filter(w =>
        w.w_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.employees?.e_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const totalNetworkCapacity = warehouses.reduce((sum, w) => sum + (w.capacity || 0), 0)
    const totalNetworkStock = warehouses.reduce((sum, w) => sum + (w.totalStock || 0), 0)
    const totalNetworkValue = warehouses.reduce((sum, w) => sum + (w.totalValue || 0), 0)
    const averageOccupancy = warehouses.length > 0 ? (totalNetworkStock / totalNetworkCapacity) * 100 : 0

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="h-10 w-10 animate-spin text-indigo-600" />
                    <p className="text-muted-foreground animate-pulse text-sm font-bold tracking-widest uppercase">Harvesting Network Telemetry...</p>
                </div>
            </div>
        )
    }

    if (userRole !== 'admin' && userRole !== 'manager') {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
                <ShieldAlert className="h-16 w-16 text-rose-500" />
                <h1 className="text-2xl font-black uppercase tracking-tighter">Access Denied</h1>
                <p className="text-muted-foreground max-w-md">Warehouse topology and global capacity stats are restricted to Administrative staff.</p>
                <Button onClick={() => window.history.back()} variant="outline">Go Back</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                        <WarehouseIcon className="h-10 w-10 text-indigo-600" /> Warehouse Network
                    </h1>
                    <p className="text-muted-foreground font-medium mt-1">Real-time capacity utilization and asset distribution across all nodes.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter network..."
                            className="pl-9 h-11 bg-background/50 border-none shadow-sm focus:ring-2 focus:ring-indigo-500/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Global Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-none shadow-xl bg-indigo-600 text-white relative overflow-hidden group">
                    <CardContent className="p-6">
                        <Activity className="absolute -right-4 -bottom-4 h-24 w-24 text-white/10" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Global Utilization</span>
                        <div className="text-4xl font-black mt-2">{averageOccupancy.toFixed(1)}%</div>
                        <div className="text-[10px] text-indigo-200 font-bold mt-1 uppercase">Aggregate Network Load</div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500 shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Network Valuation</span>
                            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg"><IndianRupee className="h-4 w-4" /></div>
                        </div>
                        <div className="text-3xl font-black">₹{totalNetworkValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                        <div className="text-[10px] text-emerald-600 font-bold mt-1 uppercase flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" /> Combined Asset Wealth
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500 shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Units</span>
                            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg"><Package className="h-4 w-4" /></div>
                        </div>
                        <div className="text-3xl font-black">{totalNetworkStock.toLocaleString()}</div>
                        <div className="text-[10px] text-amber-600 font-bold mt-1 uppercase">Units Across {warehouses.length} Nodes</div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-500 shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Capacity</span>
                            <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg"><Signal className="h-4 w-4" /></div>
                        </div>
                        <div className="text-3xl font-black">{totalNetworkCapacity.toLocaleString()}</div>
                        <div className="text-[10px] text-indigo-600 font-bold mt-1 uppercase">Max System Footprint</div>
                    </CardContent>
                </Card>
            </div>

            {/* Warehouse Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredWarehouses.map((wh) => (
                    <motion.div
                        key={wh.w_id}
                        whileHover={{ y: -5 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Card className="border-none shadow-xl group cursor-pointer overflow-hidden bg-card/60 backdrop-blur" onClick={() => window.location.href = `/dashboard/warehouses/${wh.w_id}`}>
                            <div className={`h-1.5 w-full ${wh.occupancy > 90 ? 'bg-rose-500' : 'bg-indigo-600'}`} />
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start">
                                    <div className="h-12 w-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <WarehouseIcon className="h-6 w-6" />
                                    </div>
                                    <Badge variant={wh.occupancy > 90 ? "destructive" : "outline"} className="text-[8px] font-black uppercase tracking-widest">
                                        {wh.occupancy > 90 ? 'Critical' : 'Operational'}
                                    </Badge>
                                </div>
                                <CardTitle className="text-xl font-black group-hover:text-indigo-600 transition-colors">{wh.w_name}</CardTitle>
                                <CardDescription className="text-xs font-medium line-clamp-1 flex items-center gap-1.5 mt-1">
                                    <Users className="h-3 w-3" /> Managed by {wh.employees?.e_name || 'System Auto'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
                                        <span>Utilization</span>
                                        <span className={wh.occupancy > 90 ? 'text-rose-500' : 'text-indigo-600'}>{wh.occupancy.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-muted-foreground/5 p-0.5">
                                        <motion.div
                                            className={`h-full rounded-full ${wh.occupancy > 90 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]'}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(wh.occupancy, 100)}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[8px] font-bold text-muted-foreground uppercase opacity-60">
                                        <span>{wh.totalStock.toLocaleString()} Units</span>
                                        <span>{wh.capacity.toLocaleString()} Max</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed">
                                    <div>
                                        <div className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Inventory Wealth</div>
                                        <div className="text-sm font-black text-emerald-600">₹{wh.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Active SKUs</div>
                                        <div className="text-sm font-black text-indigo-600">{wh.itemsCount} Products</div>
                                    </div>
                                </div>

                                <Button variant="ghost" className="w-full mt-4 h-10 font-bold text-[10px] uppercase tracking-widest bg-muted/30 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    Open Control Center <ArrowUpRight className="ml-2 h-3 w-3" />
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Empty State */}
            {filteredWarehouses.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                    <WarehouseIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <h3 className="text-xl font-bold">No Warehouses Found</h3>
                    <p className="text-muted-foreground text-sm">Adjust your search parameters or check the central registry.</p>
                </div>
            )}
        </div>
    )
}
