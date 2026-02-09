"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    ShieldAlert,
    ShieldCheck,
    Clock,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Search,
    Filter,
    ArrowUpRight,
    Activity,
    Info,
    Calendar,
    User
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { Input } from "@/app/components/ui/input"
import { Skeleton } from "@/app/components/ui/skeleton"

export default function SecurityAlertsPage() {
    const [alerts, setAlerts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const supabase = createClient()

    useEffect(() => {
        const fetchAlerts = async () => {
            setLoading(true)
            // First check if table exists by trying a select
            const { data, error } = await supabase
                .from('risk_alerts')
                .select(`
                    *,
                    employees!risk_alerts_resolved_by_fkey(f_name, l_name)
                `)
                .order('detected_at', { ascending: false })

            if (!error) {
                setAlerts(data || [])
            } else {
                console.error("Error fetching alerts:", error)
                // If table doesn't exist, we might see an error here
            }
            setLoading(false)
        }

        fetchAlerts()
    }, [supabase])

    const handleResolve = async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: emp } = await supabase
            .from('employees')
            .select('e_id')
            .eq('user_id', user.id)
            .maybeSingle()

        const { error } = await supabase
            .from('risk_alerts')
            .update({
                is_resolved: true,
                status: 'resolved',
                resolved_by: emp?.e_id
            })
            .eq('id', id)

        if (!error) {
            setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved', is_resolved: true } : a))
        }
    }

    const filteredAlerts = alerts.filter(alert => {
        const matchesFilter = filter === "all" || alert.status === filter
        const matchesSearch = alert.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            alert.trigger_message?.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesFilter && matchesSearch
    })

    const stats = {
        total: alerts.length,
        unresolved: alerts.filter(a => !a.is_resolved).length,
        avgRisk: alerts.length ? (alerts.reduce((acc, a) => acc + (a.risk_score || 0), 0) / alerts.length).toFixed(1) : 0,
        critical: alerts.filter(a => (a.risk_score || 0) >= 80).length
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto min-h-screen pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-[0.3em]">
                        <ShieldAlert className="h-4 w-4" /> Strategic Operations Guard
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-foreground italic uppercase">
                        Security & <span className="text-rose-500">Risk Alerts</span>
                    </h1>
                    <p className="text-muted-foreground font-medium max-w-xl">
                        Real-time auditing of high-risk logistical operations and financial anomalies across the distribution network.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="h-10 px-4 font-bold rounded-xl border-2 hover:bg-muted transition-all">
                        <Activity className="h-4 w-4 mr-2" /> Live Stream
                    </Button>
                    <Button className="h-10 px-4 font-black rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-[0_4px_15px_rgba(244,63,94,0.3)] transition-all">
                        <ArrowUpRight className="h-4 w-4 mr-2" /> Export Audit Log
                    </Button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Total Audit Events" value={stats.total} icon={Activity} color="text-indigo-400" />
                <StatCard label="Pending Review" value={stats.unresolved} icon={Clock} color="text-amber-400" />
                <StatCard label="Critical Anomalies" value={stats.critical} icon={ShieldAlert} color="text-rose-500" />
                <StatCard label="Network Risk Score" value={stats.avgRisk} sub="/ 100" icon={ShieldCheck} color="text-emerald-400" />
            </div>

            {/* Main Content Area */}
            <div className="bg-card/50 backdrop-blur-xl rounded-3xl border border-border/50 shadow-2xl overflow-hidden p-6 space-y-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search audit trail..."
                            className="pl-10 h-10 bg-muted/30 border-none rounded-xl font-medium focus:ring-rose-500/30"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-muted/50 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                        {["all", "open", "resolved"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl bg-muted/50" />)
                    ) : filteredAlerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                            <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center">
                                <ShieldCheck className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Network Clear</h3>
                                <p className="text-xs text-muted-foreground/60">No security anomalies detected in the current audit window.</p>
                            </div>
                        </div>
                    ) : (
                        filteredAlerts.map((alert) => (
                            <div
                                key={alert.id}
                                className={`group relative p-6 bg-muted/20 hover:bg-muted/30 rounded-2xl border-2 transition-all duration-300 ${alert.is_resolved ? 'border-transparent' : 'border-rose-500/10 hover:border-rose-500/30 shadow-lg shadow-rose-500/5'}`}
                            >
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    <div className="flex gap-4">
                                        <div className={`mt-1 h-12 w-12 shrink-0 rounded-xl flex items-center justify-center ${alert.is_resolved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500 animate-pulse'}`}>
                                            {alert.is_resolved ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline" className={`text-[10px] font-black tracking-widest px-2 py-0 border-2 uppercase ${alert.risk_score >= 80 ? 'border-rose-500/50 text-rose-500 bg-rose-500/10' : 'border-amber-500/30 text-amber-500 bg-amber-500/10'}`}>
                                                    <AlertTriangle className="h-2.5 w-2.5 mr-1" /> Risk Score: {alert.risk_score}
                                                </Badge>
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold">
                                                    <Calendar className="h-3 w-3" /> {new Date(alert.detected_at).toLocaleString()}
                                                </div>
                                                {alert.is_resolved && (
                                                    <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border-none">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" /> RESOLVED
                                                    </Badge>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-black tracking-tight text-foreground uppercase italic">{alert.reason}</h3>
                                            <p className="text-sm text-muted-foreground/90 font-medium max-w-2xl bg-background/30 p-3 rounded-lg border border-border/20 italic">
                                                "{alert.trigger_message}"
                                            </p>

                                            {alert.metadata && (
                                                <div className="flex flex-wrap gap-4 pt-2">
                                                    <MetaItem label="Exposure" value={`₹${alert.metadata.exposure?.toLocaleString()}`} />
                                                    <MetaItem label="Source" value={alert.metadata.source || "Chat Assistant"} />
                                                    <MetaItem label="Qty" value={alert.metadata.quantity} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-end items-end gap-3 min-w-[200px]">
                                        {!alert.is_resolved ? (
                                            <Button
                                                onClick={() => handleResolve(alert.id)}
                                                className="w-full bg-foreground text-background hover:bg-rose-500 hover:text-white font-black uppercase tracking-widest text-[10px] h-10 rounded-xl transition-all shadow-xl shadow-foreground/10"
                                            >
                                                Mark as Resolved
                                            </Button>
                                        ) : (
                                            <div className="flex flex-col items-end  gap-1 text-[10px] font-bold text-muted-foreground">
                                                <span className="uppercase text-[8px] tracking-[0.2em] opacity-50">Audited By</span>
                                                <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/30">
                                                    <User className="h-3 w-3 text-emerald-400" />
                                                    {alert.employees ? `${alert.employees.f_name} ${alert.employees.l_name}` : "System Admin"}
                                                </div>
                                            </div>
                                        )}
                                        <Button variant="ghost" className="w-full text-muted-foreground hover:text-indigo-400 text-[10px] font-black uppercase tracking-tighter transition-colors">
                                            View Full Evidence <ChevronRight className="ml-1 h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
    return (
        <Card className="bg-card/40 border-border/50 rounded-3xl overflow-hidden group hover:border-rose-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-rose-500/5">
            <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{label}</span>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent className="p-4 pt-1">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black italic tracking-tighter tabular-nums">{value}</span>
                    {sub && <span className="text-[10px] font-bold text-muted-foreground italic uppercase tracking-tighter">{sub}</span>}
                </div>
            </CardContent>
        </Card>
    )
}

function MetaItem({ label, value }: { label: string, value: string | number }) {
    if (!value) return null
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">{label}</span>
            <span className="text-[11px] font-bold text-foreground italic">{value}</span>
        </div>
    )
}
