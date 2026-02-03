"use client"

import { useState, useEffect, use, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    ArrowLeft,
    TrendingUp,
    ArrowRightLeft,
    Package,
    Warehouse as WarehouseIcon,
    Truck,
    Clock,
    Activity,
    ArrowUpCircle,
    ArrowDownCircle,
    Boxes,
    IndianRupee,
    Zap
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import Link from "next/link"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

function MovementGraph({ nodes, edges }: { nodes: any[], edges: any[] }) {
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const suppliers = nodes.filter(n => n.type === 'supplier');
    const warehouses = nodes.filter(n => n.type === 'warehouse');
    const external = nodes.filter(n => n.type === 'external');

    const getPos = (id: string) => {
        const sIdx = suppliers.findIndex(n => n.id === id);
        if (sIdx !== -1) return { x: 150, y: (sIdx + 1) * (1000 / (suppliers.length + 1)) };
        const wIdx = warehouses.findIndex(n => n.id === id);
        if (wIdx !== -1) return { x: 500, y: (wIdx + 1) * (1000 / (warehouses.length + 1)) };
        const eIdx = external.findIndex(n => n.id === id);
        if (eIdx !== -1) return { x: 850, y: (eIdx + 1) * (1000 / (external.length + 1)) };
        return { x: 500, y: 500 };
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleNativeWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setTransform(prev => ({
                ...prev,
                scale: Math.min(Math.max(prev.scale * delta, 0.5), 5)
            }));
        };

        container.addEventListener('wheel', handleNativeWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleNativeWheel);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        setLastPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - lastPos.x;
        const dy = e.clientY - lastPos.y;
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        setLastPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative bg-slate-950 overflow-hidden rounded-xl border border-white/5 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

            <svg className="w-full h-full absolute inset-0 z-0" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
                <g style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: 'center' }}>
                    {/* Edges */}
                    {edges.map((edge) => {
                        const start = getPos(edge.source);
                        const end = getPos(edge.target);
                        const isHighlighted = hoveredNode === edge.source || hoveredNode === edge.target;
                        const isActive = !hoveredNode || isHighlighted;
                        const color = edge.type === 'procurement' ? '#10b981' : edge.type === 'transfer' ? '#6366f1' : '#f43f5e';

                        return (
                            <g key={edge.id} className="transition-opacity duration-300" style={{ opacity: isActive ? 1 : 0.1 }}>
                                <line
                                    x1={start.x} y1={start.y}
                                    x2={end.x} y2={end.y}
                                    stroke={color}
                                    strokeWidth={isHighlighted ? 4 : 2}
                                    strokeDasharray="10,10"
                                />
                                <g transform={`translate(${(start.x + end.x) / 2}, ${(start.y + end.y) / 2})`}>
                                    <rect x="-15" y="-10" width="30" height="20" rx="4" fill="#0f172a" stroke={color} strokeWidth="1" />
                                    <text dy="5" textAnchor="middle" className="fill-white font-bold text-[12px]">{edge.amount}</text>
                                </g>
                            </g>
                        );
                    })}

                    {/* Nodes rendered inside SVG for absolute alignment */}
                    {nodes.map((node) => {
                        const pos = getPos(node.id);
                        const isRelated = hoveredNode === node.id || edges.some(e =>
                            (e.source === node.id && e.target === hoveredNode) || (e.target === node.id && e.source === hoveredNode)
                        );
                        const isActive = !hoveredNode || isRelated;

                        return (
                            <g
                                key={node.id}
                                className="cursor-pointer"
                                style={{ opacity: isActive ? 1 : 0.2 }}
                                onMouseEnter={(e) => { e.stopPropagation(); setHoveredNode(node.id); }}
                                onMouseLeave={() => setHoveredNode(null)}
                            >
                                <circle cx={pos.x} cy={pos.y} r="40" fill="#0f172a" stroke={hoveredNode === node.id ? "#6366f1" : "#1e293b"} strokeWidth="2" />
                                <circle cx={pos.x} cy={pos.y} r="15" fill={node.type === 'supplier' ? '#10b98120' : node.type === 'warehouse' ? '#6366f120' : '#f43f5e20'} />
                                <text x={pos.x} y={pos.y + 65} textAnchor="middle" className="fill-slate-400 font-black text-[14px] uppercase tracking-tighter shadow-sm">
                                    {node.label}
                                </text>
                                {hoveredNode === node.id && (
                                    <text x={pos.x} y={pos.y + 85} textAnchor="middle" className="fill-indigo-400 text-[10px] font-bold">
                                        {node.fullLabel}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </g>
            </svg>

            <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-slate-500 border border-white/5 pointer-events-none">
                {(transform.scale * 100).toFixed(0)}% ZOOM
            </div>
        </div>
    );
}
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    Cell
} from "recharts"

export default function ProductAnalyticsPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = use(paramsPromise)
    const productId = params.id
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [product, setProduct] = useState<any>(null)
    const [transactions, setTransactions] = useState<any[]>([])
    const [orders, setOrders] = useState<any[]>([])
    const [distribution, setDistribution] = useState<any[]>([])
    const [stats, setStats] = useState<any>({})
    const [priceHistory, setPriceHistory] = useState<any[]>([])
    const [warehouseOutgoing, setWarehouseOutgoing] = useState<any[]>([])
    const [pendingOrders, setPendingOrders] = useState<any[]>([])
    const [graphData, setGraphData] = useState<{ nodes: any[], edges: any[] }>({ nodes: [], edges: [] })
    const [userRole, setUserRole] = useState<string>('warehouse_staff')

    useEffect(() => {
        fetchAnalyticsData()
    }, [productId])

    const fetchAnalyticsData = async () => {
        setLoading(true)

        // 1. Fetch Product Basic Info
        const { data: pData } = await supabase.from('products').select('*, categories(cat_name)').eq('pid', productId).single()
        setProduct(pData)

        // 2. Fetch Transaction History (Movements)
        const { data: tData } = await supabase
            .from('transactions')
            .select(`
                *,
                warehouse:warehouses!transactions_w_id_fkey(w_name),
                target:warehouses!transactions_target_w_id_fkey(w_name)
            `)
            .eq('pid', productId)
            .order('time', { ascending: false })
        setTransactions(tData || [])

        // 3. Fetch Procurement History (Orders)
        const { data: oData } = await supabase
            .from('orders')
            .select('*, suppliers(s_name), warehouses!orders_target_w_id_fkey(w_name)')
            .eq('p_id', productId)
            .order('date', { ascending: false })
        setOrders(oData || [])

        // Filter Pending Orders
        const pending = (oData || []).filter((o: any) => o.status !== 'received' && o.status !== 'cancelled')
        setPendingOrders(pending)

        // Process Price History
        const prices = (oData || [])
            .filter((o: any) => o.price && o.quantity)
            .map((o: any) => ({
                date: new Date(o.date).toLocaleDateString(),
                price: (o.price / o.quantity).toFixed(2) // Unit price
            }))
            .reverse()
        setPriceHistory(prices)

        // 4. Fetch Warehouse Distribution
        const { data: dData } = await supabase
            .from('product_warehouse')
            .select('*, warehouses(w_name)')
            .eq('pid', productId)
        setDistribution(dData || [])

        // 5. Calculate Rates and Frequencies
        if (tData) {
            const outgoingTotal = tData.filter(t => t.amt < 0).reduce((sum, t) => sum + Math.abs(t.amt), 0)
            const incomingTotal = tData.filter(t => t.amt > 0).reduce((sum, t) => sum + t.amt, 0)
            const frequency = tData.length

            // Group by Date for Velocity Chart
            const historyMap = new Map()
            tData.forEach(t => {
                const date = new Date(t.time).toLocaleDateString()
                const val = historyMap.get(date) || { date, in: 0, out: 0 }
                if (t.amt > 0) val.in += t.amt
                else val.out += Math.abs(t.amt)
                historyMap.set(date, val)
            })
            const chartData = Array.from(historyMap.values()).reverse().slice(-10)

            // Warehouse Outgoing Comparison
            const whOutMap = new Map()
            tData.filter(t => t.amt < 0 && t.warehouse).forEach(t => {
                const wName = t.warehouse.w_name
                const current = whOutMap.get(wName) || 0
                whOutMap.set(wName, current + Math.abs(t.amt))
            })
            const whOutData = Array.from(whOutMap.entries()).map(([name, value]) => ({ name, value }))
            setWarehouseOutgoing(whOutData)

            setStats({ outgoing: outgoingTotal, incoming: incomingTotal, frequency, chartData })

            // 6. Build Movement Graph Data
            const nodesMap = new Map()
            const edgesMap = new Map()

            const getShortName = (name: string) => name.replace(/ (Warehouse|Supplies|Industrial|Inc|Ltd|Corporation)\.?/gi, '').trim()

            // Process Orders (Supplier -> Warehouse)
            oData?.forEach(o => {
                const sId = `sup-${o.sup_id}`
                const wId = `wh-${o.target_w_id}`

                if (!nodesMap.has(sId) && o.suppliers) {
                    nodesMap.set(sId, { id: sId, label: getShortName(o.suppliers.s_name), type: 'supplier', fullLabel: o.suppliers.s_name })
                }
                if (!nodesMap.has(wId) && o.warehouses) {
                    nodesMap.set(wId, { id: wId, label: getShortName(o.warehouses.w_name), type: 'warehouse', fullLabel: o.warehouses.w_name })
                }

                if (o.suppliers && o.warehouses) {
                    const edgeId = `${sId}->${wId}`
                    const existing = edgesMap.get(edgeId) || { id: edgeId, source: sId, target: wId, amount: 0, type: 'procurement' }
                    existing.amount += o.quantity
                    edgesMap.set(edgeId, existing)
                }
            })

            // Process Transactions (Warehouse -> Warehouse, Warehouse -> Market)
            tData?.forEach(t => {
                if (t.type === 'transfer' && t.warehouse && t.target) {
                    const sId = `wh-${t.w_id}`
                    const tId = `wh-${t.target_w_id}`

                    if (!nodesMap.has(sId)) nodesMap.set(sId, { id: sId, label: getShortName(t.warehouse.w_name), type: 'warehouse', fullLabel: t.warehouse.w_name })
                    if (!nodesMap.has(tId)) nodesMap.set(tId, { id: tId, label: getShortName(t.target.w_name), type: 'warehouse', fullLabel: t.target.w_name })

                    const edgeId = `${sId}->${tId}`
                    const existing = edgesMap.get(edgeId) || { id: edgeId, source: sId, target: tId, amount: 0, type: 'transfer' }
                    existing.amount += t.amt
                    edgesMap.set(edgeId, existing)
                } else if (t.type === 'take' && t.warehouse) {
                    const sId = `wh-${t.w_id}`
                    const tId = 'market'

                    if (!nodesMap.has(sId)) nodesMap.set(sId, { id: sId, label: getShortName(t.warehouse.w_name), type: 'warehouse', fullLabel: t.warehouse.w_name })
                    if (!nodesMap.has(tId)) nodesMap.set(tId, { id: tId, label: 'Market', type: 'external', fullLabel: 'End Consumer Market' })

                    const edgeId = `${sId}->${tId}`
                    const existing = edgesMap.get(edgeId) || { id: edgeId, source: sId, target: tId, amount: 0, type: 'distribution' }
                    existing.amount += Math.abs(t.amt)
                    edgesMap.set(edgeId, existing)
                }
            })

            setGraphData({
                nodes: Array.from(nodesMap.values()),
                edges: Array.from(edgesMap.values())
            })

            // 7. Resolve Role
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
        }

        setLoading(false)
    }

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="h-10 w-10 animate-spin text-indigo-600" />
                    <p className="text-muted-foreground animate-pulse text-sm font-bold tracking-widest uppercase">Crunching movement data...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8 pb-12">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/inventory">
                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 border shadow-sm">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-black tracking-tight">{product?.p_name}</h1>
                            <span className="bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">PID: {productId}</span>
                        </div>
                        <p className="text-muted-foreground text-sm font-medium mt-1">{product?.categories?.cat_name} • {product?.manufacturer}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Global Stock Status</div>
                    <div className="text-4xl font-black text-indigo-600 leading-none">
                        {distribution.reduce((acc, curr) => acc + (curr.stock || 0), 0)}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {userRole !== 'sales_representative' && (
                    <Card className="bg-indigo-600 border-none shadow-xl text-white overflow-hidden relative">
                        <CardContent className="p-6">
                            <Activity className="absolute -right-4 -bottom-4 h-24 w-24 text-white/10" />
                            <CardTitle className="text-xs uppercase font-black tracking-widest text-indigo-200">Total Activity</CardTitle>
                            <div className="text-4xl font-black mt-2">{stats.frequency}</div>
                            <p className="text-[10px] font-bold text-indigo-200 mt-1 uppercase tracking-tighter">Recorded Movements</p>
                        </CardContent>
                    </Card>
                )}

                {userRole !== 'sales_representative' && (
                    <Card className="border-l-4 border-l-emerald-500 shadow-lg">
                        <CardContent className="p-6">
                            <CardTitle className="text-xs uppercase font-black tracking-widest text-muted-foreground">Procurement Vol.</CardTitle>
                            <div className="text-4xl font-black mt-2 text-emerald-600">{stats.incoming}</div>
                            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1 uppercase">
                                <ArrowUpCircle className="h-3 w-3" /> Incoming Velocity
                            </div>
                        </CardContent>
                    </Card>
                )}

                {userRole !== 'sales_representative' && (
                    <Card className="border-l-4 border-l-rose-500 shadow-lg">
                        <CardContent className="p-6">
                            <CardTitle className="text-xs uppercase font-black tracking-widest text-muted-foreground">Outgoing Rate</CardTitle>
                            <div className="text-4xl font-black mt-2 text-rose-600">{stats.outgoing}</div>
                            <div className="flex items-center gap-1 text-[10px] text-rose-600 font-bold mt-1 uppercase">
                                <ArrowDownCircle className="h-3 w-3" /> Consumption Velocity
                            </div>
                        </CardContent>
                    </Card>
                )}

                {userRole !== 'sales_representative' && (
                    <Card className="border-l-4 border-l-amber-500 shadow-lg">
                        <CardContent className="p-6">
                            <CardTitle className="text-xs uppercase font-black tracking-widest text-muted-foreground">Avg. Movement</CardTitle>
                            <div className="text-4xl font-black mt-2 text-amber-600">
                                {((stats.incoming + stats.outgoing) / (stats.frequency || 1)).toFixed(1)}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold mt-1 uppercase tracking-tighter">
                                Units per transaction
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Charts Section - Bento Grid */}
            <div className="grid gap-6 lg:grid-cols-2">

                {/* 1. Velocity Trends (Hidden for Sales Rep) */}
                {userRole !== 'sales_representative' && (
                    <Card className="shadow-lg bg-card/60 backdrop-blur border-none">
                        <CardHeader className="border-b border-muted/30 pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-indigo-600" /> Velocity Trends
                            </CardTitle>
                            <CardDescription>Incoming vs consumption units over time.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8 pl-0 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', border: 'none' }}
                                        itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                    />
                                    <Area type="monotone" dataKey="in" stroke="#10b981" fillOpacity={1} fill="url(#colorIn)" strokeWidth={3} />
                                    <Area type="monotone" dataKey="out" stroke="#f43f5e" fillOpacity={1} fill="url(#colorOut)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* 2. Price History Chart (Hidden for Sales Rep) */}
                {userRole !== 'sales_representative' && (
                    <Card className="shadow-lg bg-card/60 backdrop-blur border-none">
                        <CardHeader className="border-b border-muted/30 pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <IndianRupee className="h-4 w-4 text-emerald-600" /> Price Volatility
                            </CardTitle>
                            <CardDescription>Unit cost history based on recent procurement orders.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8 pl-0 h-[300px]">
                            {priceHistory.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={priceHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} domain={['auto', 'auto']} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', border: 'none' }}
                                            itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#059669' }}
                                            formatter={(value: any) => [`₹${value}`, 'Unit Cost']}
                                        />
                                        <Line type="stepAfter" dataKey="price" stroke="#059669" strokeWidth={3} dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground text-xs italic">
                                    No purchase history available for price tracking.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* 3. Warehouse Distribution (Kept for Sales Rep) */}
                <Card className={`shadow-lg bg-card border-none ${userRole === 'sales_representative' ? 'lg:col-span-2' : ''}`}>
                    <CardHeader className="border-b border-muted/30 pb-4">
                        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            <Package className="h-4 w-4 text-indigo-600" /> Stock by Location
                        </CardTitle>
                        <CardDescription>Current inventory levels across distribution centers.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                                <XAxis dataKey="warehouses.w_name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#888' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="stock" radius={[4, 4, 0, 0]} barSize={40}>
                                    {distribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#6366f1'} opacity={0.8} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* 4. Warehouse Outgoing Comparison (Hidden for Sales Rep) */}
                {userRole !== 'sales_representative' && (
                    <Card className="shadow-lg bg-card border-none">
                        <CardHeader className="border-b border-muted/30 pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <ArrowRightLeft className="h-4 w-4 text-rose-600" /> Outgoing Volume
                            </CardTitle>
                            <CardDescription>Comparative analysis of consumption/transfer by site.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8 h-[300px]">
                            {warehouseOutgoing.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={warehouseOutgoing} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#88888820" />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                                        <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#888' }} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} fill="#f43f5e" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground text-xs italic">
                                    No outgoing movement recorded yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Pending Orders Section (Hidden for Sales Rep) */}
            {pendingOrders.length > 0 && userRole !== 'sales_representative' && (
                <Card className="border-l-4 border-l-amber-500 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-lg font-black flex items-center gap-2">
                            <Clock className="h-5 w-5 text-amber-500" /> Pending Shipments
                        </CardTitle>
                        <CardDescription>Active procurement orders waiting for fulfillment.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {pendingOrders.map((o) => (
                                <div key={o.po_id} className="bg-amber-50 rounded-lg p-4 border border-amber-100 flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-amber-900 text-sm">PO-{o.po_id}</span>
                                        <span className="text-[10px] font-black uppercase bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">{o.status}</span>
                                    </div>
                                    <div className="text-xs text-amber-800">
                                        <div className="flex justify-between">
                                            <span>Qty:</span>
                                            <span className="font-bold">{o.quantity} units</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Expect:</span>
                                            <span className="font-bold">{o.warehouses?.w_name}</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-[10px] text-amber-700/60 font-mono">
                                        Ordered: {new Date(o.date).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Movement Visualization & Logs (Hidden for Sales Rep) */}
            {userRole !== 'sales_representative' && (
                <>
                    <Card className="border-none shadow-2xl overflow-hidden bg-slate-900 text-white">
                        <CardHeader className="bg-slate-900 border-b border-slate-800">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-indigo-400">Inventory Movement Architecture</CardTitle>
                            <CardDescription className="text-slate-500">Live data-driven flow mapping of product lifecycle.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 h-[400px] relative overflow-hidden">
                            <MovementGraph nodes={graphData.nodes} edges={graphData.edges} />
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl border-t-8 border-t-slate-800">
                        <CardHeader>
                            <CardTitle className="text-xl font-black">Lifecycle Audit Log</CardTitle>
                            <CardDescription>Chronological record of every unit adjustment across the network.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-xl border">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 border-b">
                                        <tr className="text-left font-black uppercase text-slate-500 tracking-widest">
                                            <th className="px-6 py-4">Event Date</th>
                                            <th className="px-6 py-4">Action Type</th>
                                            <th className="px-6 py-4">Flow Source</th>
                                            <th className="px-6 py-4">Flow Target</th>
                                            <th className="px-6 py-4 text-right">Magnitude</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {transactions.map((t, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-mono font-bold text-slate-400">
                                                    {new Date(t.time).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 capitalize font-black">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-bold ${t.type === 'receive' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                                                        t.type === 'transfer' ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20' :
                                                            'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                                        }`}>
                                                        {t.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 font-medium">
                                                    {t.warehouse?.w_name || 'Global Stream'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 font-medium">
                                                    {t.target?.w_name || 'External Sink'}
                                                </td>
                                                <td className={`px-6 py-4 font-black text-right text-base ${t.amt > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {t.amt > 0 ? `+${t.amt}` : t.amt}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
