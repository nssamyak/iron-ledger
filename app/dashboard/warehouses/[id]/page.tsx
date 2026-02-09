"use client"

import { useState, useEffect, use } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    ArrowLeft,
    TrendingUp,
    Package,
    Warehouse as WarehouseIcon,
    IndianRupee,
    AlertTriangle,
    Activity,
    Boxes,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Search
} from "lucide-react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import Link from "next/link"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    AreaChart,
    Area
} from "recharts"

export default function WarehouseAnalyticsPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = use(paramsPromise)
    const warehouseId = params.id
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [warehouse, setWarehouse] = useState<any>(null)
    const [stocks, setStocks] = useState<any[]>([])
    const [transactions, setTransactions] = useState<any[]>([])
    const [stats, setStats] = useState<any>({
        totalUnits: 0,
        totalValue: 0,
        occupancy: 0,
        incoming30d: 0,
        outgoing30d: 0,
        topProducts: []
    })
    const [userRole, setUserRole] = useState<string>('warehouse_staff')
    const [employeeWId, setEmployeeWId] = useState<string | null>(null)

    useEffect(() => {
        fetchWarehouseData()
    }, [warehouseId])

    const fetchWarehouseData = async () => {
        setLoading(true)

        // 1. Resolve Role and Permissions
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: emp } = await supabase.from('employees').select('e_id, role_id').eq('user_id', user.id).single()
            if (emp) {
                const { data: roleRec } = await supabase.from('roles').select('role_name').eq('role_id', emp.role_id).single()
                if (roleRec?.role_name === 'Administrator') setUserRole('admin')
                else if (roleRec?.role_name === 'Warehouse Manager') {
                    setUserRole('manager')
                    const { data: wData } = await supabase.from('warehouses').select('w_id').eq('mgr_id', emp.e_id).maybeSingle()
                    setEmployeeWId(wData ? String(wData.w_id) : null)
                }
            }
        }

        // 2. Fetch Warehouse Details
        const { data: whData } = await supabase.from('warehouses').select('*, employees(e_name)').eq('w_id', warehouseId).single()
        setWarehouse(whData)

        // 3. Fetch Stock Levels
        const { data: sData } = await supabase
            .from('product_warehouse')
            .select('*, products(p_name, unit_price, manufacturer)')
            .eq('w_id', warehouseId)
        setStocks(sData || [])

        // 4. Fetch Transactions (Incoming/Outgoing)
        const { data: tData } = await supabase
            .from('transactions')
            .select('*, products(p_name)')
            .eq('w_id', warehouseId)
            .order('time', { ascending: false })
            .limit(100)
        setTransactions(tData || [])

        // 5. Calculate Real-time Stats
        const totalUnits = sData?.reduce((acc, curr) => acc + (curr.stock || 0), 0) || 0
        const totalValue = sData?.reduce((acc, curr) => acc + ((curr.stock || 0) * (curr.products?.unit_price || 0)), 0) || 0
        const occupancy = whData?.capacity ? (totalUnits / whData.capacity) * 100 : 0

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const recentT = tData?.filter(t => new Date(t.time) > thirtyDaysAgo) || []
        const incoming = recentT.filter(t => t.amt > 0).reduce((acc, curr) => acc + curr.amt, 0)
        const outgoing = recentT.filter(t => t.amt < 0).reduce((acc, curr) => acc + Math.abs(curr.amt), 0)

        // Chart Data: Velocity (last 10 transactions)
        const velocityGrid = recentT.slice(0, 10).map(t => ({
            time: new Date(t.time).toLocaleDateString(),
            magnitude: Math.abs(t.amt),
            type: t.type
        })).reverse()

        const topProducts = [...(sData || [])]
            .sort((a, b) => (b.stock || 0) - (a.stock || 0))
            .slice(0, 5)
            .map(s => ({ name: s.products?.p_name, stock: s.stock }))

        setStats({
            totalUnits,
            totalValue,
            occupancy,
            incoming30d: incoming,
            outgoing30d: outgoing,
            topProducts,
            velocityGrid
        })

        setLoading(false)
    }

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="h-10 w-10 animate-spin text-indigo-600" />
                    <p className="text-muted-foreground animate-pulse text-sm font-bold tracking-widest uppercase">Syncing Warehouse Telemetry...</p>
                </div>
            </div>
        )
    }

    // Access Control Check
    const isAuthorized = userRole === 'admin' || (userRole === 'manager' && employeeWId === warehouseId)
    if (!isAuthorized) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
                <AlertTriangle className="h-16 w-16 text-rose-500" />
                <h1 className="text-2xl font-black uppercase tracking-tighter">Clearance Required</h1>
                <p className="text-muted-foreground max-w-md">Detailed warehouse analytics are restricted to Administrators and the assigned Warehouse Manager.</p>
                <Link href="/dashboard/inventory">
                    <Button variant="outline">Return to Inventory</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/inventory">
                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 border shadow-sm">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-black tracking-tight">{warehouse?.w_name}</h1>
                            <span className="bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">WH ID: {warehouseId}</span>
                        </div>
                        <p className="text-muted-foreground text-sm font-medium mt-1">Managed by: {warehouse?.employees?.e_name || 'Unassigned'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Operational Health</div>
                    <div className={`text-sm font-bold px-3 py-1 rounded-full border ${stats.occupancy > 90 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {stats.occupancy > 90 ? 'CRITICAL DENSITY' : 'OPTIMAL FLOW'}
                    </div>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden relative group">
                    <CardContent className="p-6">
                        <Boxes className="absolute -right-4 -bottom-4 h-24 w-24 text-white/5 group-hover:text-white/10 transition-all" />
                        <CardTitle className="text-xs uppercase font-black tracking-widest text-indigo-300">Total Units</CardTitle>
                        <div className="text-4xl font-black mt-2">{stats.totalUnits.toLocaleString()}</div>
                        <div className="text-[10px] font-bold text-indigo-300 mt-1 uppercase">Stored Items</div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500 shadow-lg">
                    <CardContent className="p-6">
                        <CardTitle className="text-xs uppercase font-black tracking-widest text-muted-foreground">Asset Valuation</CardTitle>
                        <div className="text-3xl font-black mt-2 text-emerald-600">₹{stats.totalValue.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] font-bold text-emerald-500 mt-1 uppercase flex items-center gap-1">
                            Current Inventory Worth
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-500 shadow-lg">
                    <CardContent className="p-6">
                        <CardTitle className="text-xs uppercase font-black tracking-widest text-muted-foreground">Utilization</CardTitle>
                        <div className="text-4xl font-black mt-2 text-indigo-600">{stats.occupancy.toFixed(1)}%</div>
                        <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                            <motion.div
                                className={`h-full ${stats.occupancy > 90 ? 'bg-rose-500' : 'bg-indigo-600'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(stats.occupancy, 100)}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500 shadow-lg">
                    <CardContent className="p-6">
                        <CardTitle className="text-xs uppercase font-black tracking-widest text-muted-foreground">Monthly Flow</CardTitle>
                        <div className="flex items-end gap-3 mt-2">
                            <div className="text-right">
                                <span className="text-[8px] block font-black text-emerald-600">IN</span>
                                <span className="text-xl font-black text-emerald-600">+{stats.incoming30d}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[8px] block font-black text-rose-600">OUT</span>
                                <span className="text-xl font-black text-rose-600">-{stats.outgoing30d}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Visual Analytics */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* 1. Stock Distribution by Product */}
                <Card className="shadow-xl bg-white border-none">
                    <CardHeader className="border-b bg-slate-50/50">
                        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-indigo-600" /> Stock Concentration
                        </CardTitle>
                        <CardDescription>Top 5 products by unit volume in this facility.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.topProducts} layout="vertical" margin={{ left: 40, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#88888820" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                <Bar dataKey="stock" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* 2. Movement Velocity */}
                <Card className="shadow-xl bg-white border-none">
                    <CardHeader className="border-b bg-slate-50/50">
                        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-indigo-600" /> Net Flow Dynamic
                        </CardTitle>
                        <CardDescription>Recent transaction magnitude over time.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.velocityGrid}>
                                <defs>
                                    <linearGradient id="colorMag" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" hide />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="magnitude" stroke="#6366f1" fillOpacity={1} fill="url(#colorMag)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Ledger and Product List */}
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 shadow-xl border-none">
                    <CardHeader className="border-b">
                        <CardTitle className="text-xl font-black">Facility Inventory</CardTitle>
                        <CardDescription>Live list of all assets currently docked in {warehouse?.w_name}.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b">
                                    <tr className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">
                                        <th className="px-6 py-4">Product Name</th>
                                        <th className="px-6 py-4 text-right">Units</th>
                                        <th className="px-6 py-4 text-right">Estimated Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {stocks.map((s, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold">{s.products?.p_name}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase">{s.products?.manufacturer}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-black text-indigo-600">{s.stock}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold">
                                                ₹{((s.stock || 0) * (s.products?.unit_price || 0)).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xl border-none bg-slate-900 overflow-hidden">
                    <CardHeader className="bg-slate-800/50 border-b border-white/5">
                        <CardTitle className="text-lg font-black text-indigo-400">Activity stream</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-white/5 max-h-[600px] overflow-auto">
                            {transactions.map((t, idx) => (
                                <div key={idx} className="p-4 hover:bg-white/5 transition-all group">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${t.amt > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                            {t.type}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-500">{new Date(t.time).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{t.products?.p_name}</div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[10px] text-slate-500 italic max-w-[120px] truncate">{t.description}</span>
                                        <span className={`font-black ${t.amt > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {t.amt > 0 ? `+${t.amt}` : t.amt}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
