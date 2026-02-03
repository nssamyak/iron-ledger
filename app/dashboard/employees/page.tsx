"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    Users,
    Activity,
    History,
    TrendingUp,
    Search,
    UserPlus,
    Filter,
    MoreHorizontal,
    ArrowUpRight,
    ArrowDownRight,
    ClipboardList,
    ShieldAlert
} from "lucide-react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
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
    Pie
} from "recharts"

export default function EmployeeStatsPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [employees, setEmployees] = useState<any[]>([])
    const [transactions, setTransactions] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [userRole, setUserRole] = useState<string>("")

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)

        // 1. Resolve Current User Role
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: empData } = await supabase
                .from('employees')
                .select('role_id, roles(role_name)')
                .eq('user_id', user.id)
                .single()

            const roleName = (empData as any)?.roles?.role_name
            if (roleName === 'Administrator') setUserRole('admin')
            else if (roleName === 'Warehouse Manager') setUserRole('manager')
            else setUserRole('staff')
        }

        // 2. Fetch Employees with Roles and Departments
        const { data: eData } = await supabase
            .from('employees')
            .select(`
                e_id,
                e_name,
                f_name,
                l_name,
                roles(role_name),
                departments(d_name),
                transactions(count)
            `)

        // 3. Fetch Recent Transactions with Employee Names
        const { data: tData } = await supabase
            .from('transactions')
            .select(`
                t_id,
                time,
                amt,
                type,
                description,
                products(p_name),
                employees(e_name)
            `)
            .order('time', { ascending: false })
            .limit(50)

        // 4. Fetch Transaction counts per employee using a more reliable method
        const { data: countsData } = await supabase
            .from('transactions')
            .select('e_id')

        const countsMap: Record<string, number> = {}
        countsData?.forEach(t => {
            if (t.e_id) countsMap[t.e_id] = (countsMap[t.e_id] || 0) + 1
        })

        const detailedEmployees = eData?.map(e => ({
            ...e,
            transactionCount: countsMap[e.e_id] || 0
        })).sort((a, b) => b.transactionCount - a.transactionCount) || []

        setEmployees(detailedEmployees)
        setTransactions(tData || [])
        setLoading(false)
    }

    const filteredEmployees = employees.filter(e =>
        e.e_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.roles?.role_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.departments?.d_name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const chartData = employees
        .slice(0, 8)
        .map(e => ({
            name: e.f_name,
            count: e.transactionCount
        }))

    const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="h-10 w-10 animate-spin text-indigo-600" />
                    <p className="text-muted-foreground animate-pulse text-sm font-bold tracking-widest uppercase">Analyzing Personnel Performance...</p>
                </div>
            </div>
        )
    }

    if (userRole !== 'admin' && userRole !== 'manager') {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
                <ShieldAlert className="h-16 w-16 text-rose-500" />
                <h1 className="text-2xl font-black uppercase tracking-tighter">Access Denied</h1>
                <p className="text-muted-foreground max-w-md">You do not have the required clearance to view employee performance statistics.</p>
                <Button onClick={() => window.history.back()} variant="outline">Go Back</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                        <Users className="h-10 w-10 text-indigo-600" /> Personnel Analytics
                    </h1>
                    <p className="text-muted-foreground font-medium mt-1">Operational performance and activity logs for all employees.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button className="font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">
                        <UserPlus className="h-4 w-4 mr-2" /> Export Report
                    </Button>
                </div>
            </div>

            {/* Top Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-indigo-600 shadow-lg group hover:shadow-xl transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Staff</span>
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Users className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-4xl font-black">{employees.length}</div>
                        <div className="text-[10px] text-indigo-600 font-bold mt-1 uppercase flex items-center gap-1">
                            Current Personnel
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500 shadow-lg group hover:shadow-xl transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Ops</span>
                            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <Activity className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-4xl font-black">{employees.reduce((acc, curr) => acc + curr.transactionCount, 0)}</div>
                        <div className="text-[10px] text-emerald-600 font-bold mt-1 uppercase flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" /> System Transactions
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500 shadow-lg group hover:shadow-xl transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Top Performer</span>
                            <div className="p-2 bg-amber-50 rounded-lg text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-xl font-black truncate">{employees[0]?.e_name}</div>
                        <div className="text-[10px] text-amber-600 font-bold mt-1 uppercase">
                            {employees[0]?.transactionCount} Actions Recorded
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-rose-500 shadow-lg group hover:shadow-xl transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Avg Activity</span>
                            <div className="p-2 bg-rose-50 rounded-lg text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                                <ClipboardList className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-4xl font-black">
                            {(employees.reduce((acc, curr) => acc + curr.transactionCount, 0) / (employees.length || 1)).toFixed(1)}
                        </div>
                        <div className="text-[10px] text-rose-600 font-bold mt-1 uppercase">
                            Actions per Employee
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Employee Performance Chart */}
                <Card className="lg:col-span-2 shadow-xl border-none bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b">
                        <CardTitle className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-indigo-600" /> Operational Volume By Staff
                        </CardTitle>
                        <CardDescription>Transaction throughput of the top performing personnel.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#88888820" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                                <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={25}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Staff Distribution */}
                <Card className="shadow-xl border-none">
                    <CardHeader className="border-b bg-slate-50/50">
                        <CardTitle className="text-lg font-black uppercase tracking-wider">Top Personnel</CardTitle>
                        <CardDescription>Highest activity employees this period.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {employees.slice(0, 5).map((e, idx) => (
                                <div key={e.e_id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                                            {e.f_name[0]}{e.l_name[0]}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold">{e.e_name}</div>
                                            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{e.roles?.role_name} • {e.departments?.d_name}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-indigo-600">{e.transactionCount}</div>
                                        <div className="text-[9px] text-muted-foreground font-bold uppercase">Tasks</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Table */}
            <Card className="shadow-xl border-none overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between py-6">
                    <div>
                        <CardTitle className="text-xl font-black">Employee Audit Log</CardTitle>
                        <CardDescription>Comprehensive list of recent personnel actions across the system.</CardDescription>
                    </div>
                    <div className="relative w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-indigo-600 transition-colors" />
                        <Input
                            placeholder="Search employees..."
                            className="pl-9 rounded-full bg-slate-100/50 border-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b">
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4">Department</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4 text-right">Activity Rank</th>
                                    <th className="px-6 py-4 text-right">Total Actions</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredEmployees.map((e, idx) => (
                                    <tr key={e.e_id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-500/20">
                                                    {e.f_name[0]}
                                                </div>
                                                <div className="font-bold">{e.e_name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 uppercase">
                                                {e.departments?.d_name || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-medium text-muted-foreground">{e.roles?.role_name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right italic font-mono text-slate-400">
                                            #{idx + 1}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-base font-black text-indigo-600">{e.transactionCount}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ArrowUpRight className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Action History Log */}
            <Card className="shadow-2xl border-none overflow-hidden bg-slate-900 text-slate-300">
                <CardHeader className="bg-slate-800/50 border-b border-slate-800 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-black text-white flex items-center gap-2">
                                <History className="h-6 w-6 text-indigo-400" /> Executive Action Log
                            </CardTitle>
                            <CardDescription className="text-slate-500">Real-time trail of high-level system interactions.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div> Live Stream</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 z-10">
                                <tr className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                    <th className="px-6 py-4">Timestamp</th>
                                    <th className="px-6 py-4">Initiator</th>
                                    <th className="px-6 py-4">Operation</th>
                                    <th className="px-6 py-4">Object</th>
                                    <th className="px-6 py-4 text-right">Magnitude</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {transactions.map((t) => (
                                    <tr key={t.t_id} className="hover:bg-slate-800/50 transition-colors font-mono">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                            {new Date(t.time).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-indigo-400 font-bold">{t.employees?.e_name || 'System Auto'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${t.type === 'receive' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    t.type === 'take' ? 'bg-rose-500/10 text-rose-400' :
                                                        'bg-indigo-500/10 text-indigo-400'
                                                }`}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 italic max-w-[200px] truncate">
                                            {t.products?.p_name || t.description || 'Generic Meta Record'}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-black ${t.amt > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {t.amt > 0 ? `+${t.amt}` : t.amt}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
