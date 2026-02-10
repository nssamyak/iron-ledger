"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Send, Terminal, Play, CheckCircle, AlertTriangle, RefreshCw, Copy, Check, Paperclip, FileText, X, Loader2, Shield, ShieldAlert, Clock, TrendingDown, TrendingUp, Box, Info, LayoutDashboard, Plus, Trash2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "../../components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "../../components/ui/select"
import { Badge } from "@/app/components/ui/badge"
import { normalizeRole } from "@/utils/roles"

type PlanItem = {
    intent: "move" | "order" | "adjustment" | "receive" | "cancel" | "query"
    params: any
    sql?: string
    description: string
}

type Message = {
    role: "user" | "assistant" | "system"
    content: string
    sql?: string
    results?: any
    explanation?: string
    previewData?: any
    requiresConfirmation?: boolean
    intent?: "plan" | "move" | "order" | "adjustment" | "receive" | "cancel" | "query" | "none"
    params?: any
    classification?: {
        intent_type: string
        risk: "low" | "medium" | "high"
        time_sensitivity: string
    }
    system_checks?: {
        stock: { status: string; message: string }
        capacity: { status: string; message: string }
        lead_time: { status: string; message: string }
        permissions: { status: string; message: string }
    }
    plan?: PlanItem[]
    is_split_suggestion?: boolean
}

export default function ChatPage() {
    const supabase = createClient()
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "I'm ready to help. Describe what you'd like to do, and I'll prepare the form for you." }
    ])
    const scrollRef = useRef<HTMLDivElement>(null)
    const [copiedId, setCopiedId] = useState<number | null>(null)

    // Form Data Cache
    const [products, setProducts] = useState<any[]>([])
    const [warehouses, setWarehouses] = useState<any[]>([])
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [allOrders, setAllOrders] = useState<any[]>([])
    const [stockLevels, setStockLevels] = useState<any[]>([])
    const [employeeId, setEmployeeId] = useState<string | null>(null)
    const [employeeWId, setEmployeeWId] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<string>('sales_representative')

    // Bill Upload State
    const [isBillModalOpen, setIsBillModalOpen] = useState(false)
    const [pendingSql, setPendingSql] = useState<string | null>(null)
    const [pendingExplanation, setPendingExplanation] = useState<string | null>(null)
    const [billFile, setBillFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const copyToClipboard = (text: string, id: number) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    useEffect(() => {
        fetchFormData()
    }, [])

    const fetchFormData = async () => {
        const [p, w, s, o, pw, userRes] = await Promise.all([
            supabase.from('products').select('pid, p_name, unit_price'),
            supabase.from('warehouses').select('w_id, w_name, capacity'),
            supabase.from('suppliers').select('sup_id, s_name'),
            supabase.from('orders').select(`po_id, quantity, received_quantity, p_id, target_w_id, status, products(p_name), warehouses!orders_target_w_id_fkey(w_name)`).neq('status', 'received').neq('status', 'cancelled'),
            supabase.from('product_warehouse').select('*'),
            supabase.auth.getUser()
        ]);
        setProducts(p.data || [])
        setWarehouses(w.data || [])
        setSuppliers(s.data || [])
        setAllOrders(o.data || [])
        setStockLevels(pw.data || [])

        if (userRes.data?.user) {
            const { data: emp } = await supabase.from('employees').select('e_id, role_id').eq('user_id', userRes.data.user.id).single()
            if (emp) {
                setEmployeeId(emp.e_id)
                // Check if they manage a warehouse
                const { data: wData } = await supabase.from('warehouses').select('w_id').eq('mgr_id', emp.e_id).maybeSingle()
                setEmployeeWId(wData ? String(wData.w_id) : null)

                // Resolve role
                if (emp.role_id) {
                    const { data: roleData } = await supabase.from('roles').select('role_name').eq('role_id', emp.role_id).single()
                    if (roleData) {
                        setUserRole(normalizeRole(roleData.role_name))
                    }
                }
            }
        }
    }

    const handleUploadAndExecute = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !pendingSql) return

        setBillFile(file)
        setUploading(true)

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `chat-bills/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('order-assets')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('order-assets')
                .getPublicUrl(filePath)

            // Replace placeholder in SQL
            const finalizedSql = pendingSql.replace(/ATTACHED_BILL_URL/g, publicUrl)

            setIsBillModalOpen(false)
            await handleConfirm(finalizedSql, pendingExplanation || undefined)

            setBillFile(null)
            setPendingSql(null)
            setPendingExplanation(null)
        } catch (err: any) {
            alert("Upload failed: " + err.message)
            setBillFile(null)
        } finally {
            setUploading(false)
        }
    }

    const handleSend = async () => {
        if (!input.trim()) return

        const userMsg: Message = { role: "user", content: input }
        setMessages(prev => [...prev, userMsg])
        setInput("")
        setLoading(true)

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: input })
            })
            const data = await res.json()

            // Pre-process SQL if it contains CUR_EMP_ID
            if (data.sql && employeeId) {
                data.sql = data.sql.replace(/CUR_EMP_ID/g, `'${employeeId}'`);
            }

            if (data.intent === 'plan' || (data.plan && data.plan.length > 0)) {
                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: data.message,
                    intent: 'plan',
                    plan: data.plan,
                    classification: data.classification,
                    system_checks: data.system_checks,
                    is_split_suggestion: data.is_split_suggestion
                }])
            } else if (data.intent && data.intent !== 'none' && data.intent !== 'query') {
                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: data.message,
                    intent: data.intent,
                    params: data.params,
                    classification: data.classification,
                    system_checks: data.system_checks
                }])
            } else if (data.sql) {
                // Determine if it's a SELECT query or Manipulation
                const isManipulation = /^(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE)/i.test(data.sql.trim());

                if (isManipulation) {
                    // Check if it's an order needing a bill
                    if (data.sql.includes("INSERT INTO orders") && data.sql.includes("ATTACHED_BILL_URL")) {
                        setPendingSql(data.sql)
                        setPendingExplanation(data.explanation)
                        setIsBillModalOpen(true)
                        // Add a system message indicating what's happening
                        setMessages(prev => [...prev, {
                            role: "assistant",
                            content: "I've detected an order request. Please upload the bill in the popup to proceed.",
                            classification: data.classification,
                            system_checks: data.system_checks
                        }])
                        return
                    }

                    // For other manipulations, show preview and wait for confirmation
                    const previewRes = await fetch("/api/query/preview", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ sql: data.sql })
                    })
                    const previewData = await previewRes.json()

                    setMessages(prev => [...prev, {
                        role: "assistant",
                        content: data.message || data.explanation || "I've prepared the query for you.",
                        sql: data.sql,
                        previewData: previewData,
                        requiresConfirmation: true,
                        classification: data.classification,
                        system_checks: data.system_checks
                    }])
                } else {
                    // For SELECT queries, execute immediately and show results
                    const previewRes = await fetch("/api/query/preview", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ sql: data.sql })
                    })
                    const previewData = await previewRes.json()

                    setMessages(prev => [...prev, {
                        role: "assistant",
                        content: data.message || data.explanation || "Here are the results of your query:",
                        sql: data.sql,
                        previewData: previewData,
                        requiresConfirmation: false,
                        classification: data.classification,
                        system_checks: data.system_checks
                    }])
                }
            } else {
                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: data.message || data.explanation || "I couldn't understand that request.",
                    classification: data.classification,
                    system_checks: data.system_checks
                }])
            }

        } catch (e) {
            setMessages(prev => [...prev, { role: "system", content: "Error processing request." }])
        } finally {
            setLoading(false)
        }
    }

    const handleConfirm = async (sql: string, explanation?: string) => {
        // If it's an order and doesn't have a bill yet, trigger popup
        if (sql.includes("INSERT INTO orders") && sql.includes("ATTACHED_BILL_URL")) {
            setPendingSql(sql)
            setPendingExplanation(explanation || null)
            setIsBillModalOpen(true)
            return
        }

        setLoading(true)
        try {
            // Final safety check for CUR_EMP_ID in case it missed earlier processing
            const finalizedSql = employeeId ? sql.replace(/CUR_EMP_ID/g, `'${employeeId}'`) : sql;

            const res = await fetch("/api/query/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sql: finalizedSql })
            })
            const data = await res.json()
            if (data.success) {
                if (data.success) {
                    const successMsg = explanation ? `Successfully ${explanation.toLowerCase().replace(/^success/, '').trim()}` : "Action completed successfully."
                    setMessages(prev => [...prev, { role: "system", content: successMsg }])

                    // NEW: Refresh form data (orders, etc.) after success
                    await fetchFormData();
                }
            } else {
                setMessages(prev => [...prev, { role: "system", content: `Failed: ${data.error}` }])
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: "system", content: "Execution error." }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-4" ref={scrollRef}>
                {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                        <div className={`rounded-xl shadow-sm border p-4 max-w-[85%] ${m.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-card text-card-foreground"}`}>
                            <div className="space-y-3">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-2 flex-1">
                                        {m.role === 'assistant' && m.classification && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                <Badge variant="outline" className={`text-[9px] uppercase font-black px-2 py-0.5 border-2 ${m.classification.risk === 'high' ? 'border-rose-500/50 text-rose-400 bg-rose-500/10' : m.classification.risk === 'medium' ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' : 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'}`}>
                                                    <Shield className="h-2 w-2 mr-1" /> {m.classification.risk} Risk
                                                </Badge>
                                                <Badge variant="outline" className="text-[9px] uppercase font-black px-2 py-0.5 border-2 border-primary/20 bg-primary/5 text-primary/80">
                                                    <Clock className="h-2 w-2 mr-1" /> {m.classification.time_sensitivity}
                                                </Badge>
                                                <Badge variant="outline" className="text-[9px] uppercase font-black px-2 py-0.5 border-2 border-indigo-500/30 text-indigo-400 bg-indigo-500/10">
                                                    <Terminal className="h-2 w-2 mr-1" /> {m.classification.intent_type}
                                                </Badge>
                                            </div>
                                        )}
                                        <p className="text-sm leading-relaxed font-medium">{m.content}</p>

                                        {/* High Risk Critical Alert for Admins */}
                                        {m.classification?.risk === 'high' && userRole === 'admin' && (
                                            <div className="mt-4 p-4 rounded-xl border-2 border-rose-500/30 bg-rose-500/5 backdrop-blur-sm relative overflow-hidden group animate-in fade-in slide-in-from-top-2 duration-500">
                                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <ShieldAlert className="h-16 w-16 text-rose-500" />
                                                </div>
                                                <div className="flex items-start gap-3 relative z-10">
                                                    <div className="h-10 w-10 shrink-0 bg-rose-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse">
                                                        <ShieldAlert className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest leading-none mb-1">Administrative Critical Alert</h4>
                                                        <p className="text-[10px] font-bold text-rose-400/80 leading-tight">This action involves extreme capital exposure or logistical anomaly. Verify entry integrity before confirmation.</p>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex gap-2">
                                                    <Badge variant="outline" className="text-[8px] bg-rose-500/10 text-rose-500 border-rose-500/20 px-2 py-0">ENTRY OVERRIDE REQUIRED</Badge>
                                                    <Badge variant="outline" className="text-[8px] bg-rose-500/10 text-rose-500 border-rose-500/20 px-2 py-0">HIGH CAPITAL VELOCITY</Badge>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {m.sql && m.role === "assistant" && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0 hover:bg-muted"
                                            onClick={() => copyToClipboard(m.sql!, i)}
                                            title="Copy SQL Query"
                                        >
                                            {copiedId === i ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    )}
                                </div>

                                {/* Intelligent System Checks Visualization */}
                                {m.role === 'assistant' && m.system_checks && (
                                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-dashed border-muted-foreground/20">
                                        <CheckItem icon={TrendingDown} label="Stock" check={m.system_checks.stock} />
                                        <CheckItem icon={Box} label="Capacity" check={m.system_checks.capacity} />
                                        <CheckItem icon={Clock} label="Procurement" check={m.system_checks.lead_time} />
                                        <CheckItem icon={Shield} label="Access" check={m.system_checks.permissions} />
                                    </div>
                                )}
                            </div>

                            {m.intent === 'plan' && m.plan && (
                                <div className="space-y-4 mt-6">
                                    <div className="flex items-center justify-between gap-2 bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20">
                                        <div className="flex items-center gap-2 text-indigo-400 font-black text-[10px] uppercase tracking-widest">
                                            <LayoutDashboard className="h-4 w-4" /> Strategic Coordination Plan
                                        </div>
                                        {m.is_split_suggestion && (
                                            <Badge className="bg-indigo-500 text-white text-[8px] px-2 py-0 border-none animate-pulse">OPTIMIZED</Badge>
                                        )}
                                    </div>

                                    {/* Distribution Visualization */}
                                    {m.is_split_suggestion && (
                                        <div className="px-1 py-2">
                                            <div className="flex justify-between text-[8px] font-bold text-muted-foreground uppercase mb-1">
                                                <span>Capacity Allocation</span>
                                                <span>{m.plan.length} Warehouses</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-muted/30 rounded-full flex overflow-hidden">
                                                {m.plan.map((item, idx) => {
                                                    const total = m.plan!.reduce((acc, curr) => acc + (curr.params?.quantity || 0), 0);
                                                    const percent = ((item.params?.quantity || 0) / total) * 100;
                                                    const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-cyan-500', 'bg-violet-500'];
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`${colors[idx % colors.length]} h-full border-r border-background/20`}
                                                            style={{ width: `${percent}%` }}
                                                            title={`WH ${item.params?.target_w_id || item.params?.w_id}: ${item.params?.quantity}`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {m.is_split_suggestion ? (
                                        <BulkPlanForm
                                            message={m}
                                            products={products}
                                            warehouses={warehouses}
                                            suppliers={suppliers}
                                            stockLevels={stockLevels}
                                            userRole={userRole}
                                            handleConfirm={handleConfirm}
                                        />
                                    ) : (
                                        <div className="relative space-y-6 pt-2">
                                            {m.plan.map((item, idx) => (
                                                <div key={idx} className="relative pl-6">
                                                    <div className="absolute left-0 top-0 bottom-0 w-px bg-indigo-500/20" />
                                                    <div className="absolute left-[-4px] top-0 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />

                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-indigo-400/70">STEP {idx + 1}</span>
                                                            <span className="text-[11px] font-bold text-foreground/90">{item.description}</span>
                                                        </div>

                                                        <ActionForm
                                                            message={{ ...m, intent: item.intent, params: item.params }}
                                                            products={products}
                                                            warehouses={warehouses}
                                                            suppliers={suppliers}
                                                            allOrders={allOrders}
                                                            employeeId={employeeId}
                                                            employeeWId={employeeWId}
                                                            userRole={userRole}
                                                            handleConfirm={handleConfirm}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {m.intent && !['none', 'query', 'plan'].includes(m.intent) && (
                                <ActionForm
                                    message={m}
                                    products={products}
                                    warehouses={warehouses}
                                    suppliers={suppliers}
                                    allOrders={allOrders}
                                    employeeId={employeeId}
                                    employeeWId={employeeWId}
                                    userRole={userRole}
                                    handleConfirm={handleConfirm}
                                />
                            )}

                            {/* Results Display logic */}
                            {m.previewData && (
                                <div className={`mt-4 border-l-4 rounded-lg overflow-hidden ${m.requiresConfirmation ? 'border-amber-500/50 bg-amber-500/5' : 'border-emerald-500/50 bg-emerald-500/5'}`}>
                                    {m.requiresConfirmation && (
                                        <div className="flex items-center gap-2 text-amber-400 mb-2 font-black text-[10px] px-4 py-2 border-b border-amber-500/20 bg-amber-500/10 uppercase tracking-tighter">
                                            <AlertTriangle className="h-3 w-3" /> PREVIEW MODE (Transaction Rolled Back)
                                        </div>
                                    )}

                                    {/* Handle Error in Preview/Result */}
                                    {m.previewData.error ? (
                                        <div className="text-rose-400 text-xs p-4 font-medium">{m.previewData.error}</div>
                                    ) : (
                                        <div className="p-0">
                                            {Array.isArray(m.previewData.data) && m.previewData.data.length > 0 ? (
                                                <div className="overflow-x-auto max-h-64 scrollbar-thin">
                                                    <table className="min-w-full text-[11px] border-collapse">
                                                        <thead className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                                                            <tr>
                                                                {Object.keys(m.previewData.data[0]).map(k => (
                                                                    <th key={k} className="px-4 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider">{k}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {m.previewData.data.slice(0, 10).map((row: any, idx: number) => (
                                                                <tr key={idx} className="border-b transition-colors hover:bg-muted/50">
                                                                    {Object.values(row).map((val: any, vIdx) => (
                                                                        <td key={vIdx} className="px-4 py-2 font-medium truncate max-w-[150px]">{String(val)}</td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {m.previewData.data.length > 10 && (
                                                        <div className="px-4 py-2 text-[10px] text-muted-foreground text-center bg-muted/20">
                                                            Showing first 10 rows. Try a more specific query to see more.
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-muted-foreground text-xs italic p-4 text-center">
                                                    {m.requiresConfirmation ? "No changes would be made in preview." : "Query executed. No data found."}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {m.requiresConfirmation && (
                                        <div className="p-3 border-t border-amber-500/20 bg-amber-500/5">
                                            <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white transition-all transform hover:scale-[1.02]" onClick={() => handleConfirm(m.sql!, m.explanation)}>
                                                <CheckCircle className="mr-2 h-4 w-4" /> Finalize Changes
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                        <RefreshCw className="h-4 w-4 animate-spin" /> Thinking...
                    </div>
                )}
            </div>
            <div className="flex gap-2 p-2 bg-muted/20 rounded-lg">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Describe what you want to do (e.g. 'Order 50 units...')"
                    disabled={loading}
                    className="flex-1"
                />
                <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon">
                    <Send className="h-4 w-4" />
                </Button>
            </div>

            {/* Bill Upload Dialog */}
            <Dialog open={isBillModalOpen} onOpenChange={setIsBillModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Audit Compliance: Bill Required</DialogTitle>
                        <DialogDescription>
                            Placement of purchase orders requires a digital bill or invoice for auditing.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl gap-4 hover:border-primary transition-colors cursor-pointer relative">
                        <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleUploadAndExecute}
                            accept="image/*,application/pdf"
                        />
                        {uploading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <span className="text-sm font-bold">Uploading & Finalizing...</span>
                            </div>
                        ) : (
                            <>
                                <Paperclip className="h-12 w-12 text-muted-foreground" />
                                <div className="text-center">
                                    <p className="font-bold text-sm">Click to upload bill</p>
                                    <p className="text-xs text-muted-foreground">PDF or Images accepted</p>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function CheckItem({ icon: Icon, label, check }: { icon: any, label: string, check: { status: string, message: string } }) {
    if (!check) return null;
    const isError = check.status === 'alert' || check.status === 'error' || check.status === 'unauthorized';
    const isWarning = check.status === 'warning';

    return (
        <div className={`flex items-start gap-2 p-2 rounded-lg border-l-2 transition-all ${isError ? 'bg-rose-500/10 border-rose-500 text-rose-400' : isWarning ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-emerald-500/10 border-emerald-500 text-emerald-400'}`}>
            <Icon className={`h-3 w-3 mt-0.5 shrink-0 ${isError ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`} />
            <div className="flex-1">
                <div className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter mb-0.5 flex justify-between">
                    {label}
                    <span className={`px-1 rounded-[4px] text-[7px] ${isError ? 'bg-rose-500 text-white' : isWarning ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>
                        {check.status.toUpperCase()}
                    </span>
                </div>
                <p className="text-[10px] leading-tight font-semibold text-foreground/90">{check.message}</p>
            </div>
        </div>
    );
}

function ActionForm({ message, products, warehouses, suppliers, allOrders, employeeId, employeeWId, userRole, handleConfirm }: any) {
    const [formState, setFormState] = useState({
        pid: message.params?.pid ? String(message.params.pid) : "",
        w_id: message.params?.w_id ? String(message.params.w_id) : "",
        target_w_id: message.params?.target_w_id ? String(message.params.target_w_id) : "",
        sup_id: message.params?.sup_id ? String(message.params.sup_id) : "",
        po_id: message.params?.po_id ? String(message.params.po_id) : "",
        quantity: message.params?.quantity || 1,
        price: message.params?.price || 0
    });

    // Auto-select assigned warehouse for 'w_id' (Source) if restricted
    useEffect(() => {
        if (employeeWId && (userRole === 'manager' || userRole === 'warehouse_staff')) {
            // Force source warehouse to be the assigned one
            setFormState(prev => ({ ...prev, w_id: employeeWId }));
        }
    }, [employeeWId, userRole]);

    // Auto-update other fields when po_id changes for 'receive' intent
    useEffect(() => {
        if (message.intent === 'receive' && formState.po_id) {
            // Robust matching: convert to Number to ignore leading zeros and 'PO-' prefix
            const cleanPoId = Number(formState.po_id.replace(/\D/g, ''));
            const order = allOrders.find((o: any) => Number(o.po_id) === cleanPoId);
            if (order) {
                setFormState(prev => ({
                    ...prev,
                    pid: String(order.p_id),
                    target_w_id: String(order.target_w_id),
                    quantity: message.params?.quantity || (order.quantity - order.received_quantity)
                }));
            }
        }
    }, [formState.po_id, message.intent, allOrders, message.params?.quantity]);

    useEffect(() => {
        if (message.intent === 'order' && formState.pid) {
            const product = products.find((p: any) => String(p.pid) === String(formState.pid));
            if (product && product.unit_price) {
                const qty = Number(formState.quantity) || 1;
                setFormState(prev => ({ ...prev, price: Number((Number(product.unit_price) * qty).toFixed(2)) }));
            }
        }
    }, [formState.pid, formState.quantity, message.intent, products]);

    const getProductName = (id: any) => products.find((p: any) => String(p.pid) === String(id))?.p_name || "Select Product";
    const getWarehouseName = (id: any) => warehouses.find((w: any) => String(w.w_id) === String(id))?.w_name || "Select Warehouse";
    const getSupplierName = (id: any) => suppliers.find((s: any) => String(s.sup_id) === String(id))?.s_name || "Select Supplier";

    const isAuthorized = () => {
        if (userRole === 'sales_representative') return false; // READ-ONLY
        if (message.intent === 'order' || message.intent === 'cancel') {
            return userRole === 'admin' || userRole === 'manager';
        }
        return true;
    };

    if (!isAuthorized()) return null;

    return (
        <div className="mt-4 p-4 border rounded-xl bg-background/50 backdrop-blur-sm space-y-4 min-w-[300px] border-primary/10">
            <div className="text-[10px] font-black uppercase text-primary/80 tracking-widest mb-2 flex items-center gap-2">
                <Terminal className="h-3 w-3" /> {message.intent} ACTION FORM
            </div>

            <div className="grid grid-cols-1 gap-4">
                {(message.intent === 'receive' || message.intent === 'cancel') && (
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">{message.intent === 'receive' ? 'Target Purchase Order' : 'Order to Cancel'}</label>
                        <Select value={formState.po_id} onValueChange={(val: any) => setFormState(prev => ({ ...prev, po_id: String(val) }))}>
                            <SelectTrigger className="h-9 text-xs bg-muted/20 border-primary/10">
                                <SelectValue placeholder="Select Order">
                                    {formState.po_id ?
                                        (() => {
                                            const cleanId = Number(formState.po_id.replace(/\D/g, ''));
                                            const o = allOrders.find((o: any) => Number(o.po_id) === cleanId);
                                            return o ? `PO-${String(o.po_id).padStart(4, '0')} (${o.products?.p_name})` : "Select Order";
                                        })()
                                        : "Select Order"
                                    }
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {allOrders.map((o: any) => (
                                    <SelectItem key={o.po_id} value={String(o.po_id)}>
                                        PO-{String(o.po_id).padStart(4, '0')} - {o.products?.p_name} ({o.status})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {(message.intent === 'move' || message.intent === 'order' || message.intent === 'adjustment' || message.intent === 'receive') && (
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Product</label>
                        <Select
                            value={formState.pid}
                            onValueChange={(val: any) => setFormState(prev => ({ ...prev, pid: String(val) }))}
                            disabled={message.intent === 'receive'}
                        >
                            <SelectTrigger className="h-9 text-xs bg-muted/20 border-primary/10">
                                <SelectValue placeholder="Select Product">{getProductName(formState.pid)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {products.map((p: any) => <SelectItem key={p.pid} value={String(p.pid)}>{p.p_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {message.intent === 'move' && (
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase">Source (From)</label>
                                {(userRole === 'admin' || (userRole === 'manager' && employeeWId === formState.w_id)) && formState.w_id && (
                                    <Link href={`/dashboard/warehouses/${formState.w_id}`} className="text-[8px] text-indigo-500 font-bold hover:underline">ANALYTICS</Link>
                                )}
                            </div>
                            <Select value={formState.w_id} onValueChange={(val: any) => setFormState(prev => ({ ...prev, w_id: String(val) }))}>
                                <SelectTrigger className="h-9 text-xs bg-muted/20 border-primary/10">
                                    <SelectValue placeholder="Source">{getWarehouseName(formState.w_id)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((w: any) => <SelectItem key={w.w_id} value={String(w.w_id)}>{w.w_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase">Target (To)</label>
                                {(userRole === 'admin' || (userRole === 'manager' && employeeWId === formState.target_w_id)) && formState.target_w_id && (
                                    <Link href={`/dashboard/warehouses/${formState.target_w_id}`} className="text-[8px] text-indigo-500 font-bold hover:underline">ANALYTICS</Link>
                                )}
                            </div>
                            <Select value={formState.target_w_id} onValueChange={(val: any) => setFormState(prev => ({ ...prev, target_w_id: String(val) }))}>
                                <SelectTrigger className="h-9 text-xs bg-muted/20 border-primary/10">
                                    <SelectValue placeholder="Destination">{getWarehouseName(formState.target_w_id)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((w: any) => <SelectItem key={w.w_id} value={String(w.w_id)}>{w.w_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                {message.intent === 'adjustment' && (
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Warehouse</label>
                        <Select
                            value={formState.w_id}
                            onValueChange={(val: any) => setFormState(prev => ({ ...prev, w_id: String(val) }))}
                            disabled={!!employeeWId && (userRole === 'manager' || userRole === 'warehouse_staff')}
                        >
                            <SelectTrigger className="h-9 text-xs bg-muted/20 border-primary/10">
                                <SelectValue placeholder="Select Warehouse">{getWarehouseName(formState.w_id)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses.map((w: any) => <SelectItem key={w.w_id} value={String(w.w_id)}>{w.w_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {(message.intent === 'order' || message.intent === 'receive') && (
                    <div className="grid grid-cols-2 gap-2">
                        {message.intent === 'order' && (
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase">Supplier</label>
                                <Select value={formState.sup_id} onValueChange={(val: any) => setFormState(prev => ({ ...prev, sup_id: String(val) }))}>
                                    <SelectTrigger className="h-9 text-xs bg-muted/20 border-primary/10">
                                        <SelectValue placeholder="Supplier">{getSupplierName(formState.sup_id)}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map((s: any) => <SelectItem key={s.sup_id} value={String(s.sup_id)}>{s.s_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className={`${message.intent === 'receive' ? 'col-span-2' : ''} space-y-1`}>
                            <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase">Target Warehouse</label>
                                {(userRole === 'admin' || (userRole === 'manager' && employeeWId === formState.target_w_id)) && formState.target_w_id && (
                                    <Link href={`/dashboard/warehouses/${formState.target_w_id}`} className="text-[8px] text-indigo-500 font-bold hover:underline">ANALYTICS</Link>
                                )}
                            </div>
                            <Select
                                value={formState.target_w_id}
                                onValueChange={(val: any) => setFormState(prev => ({ ...prev, target_w_id: String(val) }))}
                                disabled={message.intent === 'receive'}
                            >
                                <SelectTrigger className="h-9 text-xs bg-muted/20 border-primary/10">
                                    <SelectValue placeholder="Target">{getWarehouseName(formState.target_w_id)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((w: any) => <SelectItem key={w.w_id} value={String(w.w_id)}>{w.w_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                <div className={`grid ${message.intent === 'order' || message.intent === 'receive' ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Quantity</label>
                        <Input
                            type="number"
                            className="h-9 text-xs bg-muted/20 border-primary/10"
                            value={formState.quantity}
                            onChange={(e) => setFormState(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                        />
                    </div>

                    {(message.intent === 'order' || message.intent === 'receive') && (
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase">{message.intent === 'order' ? 'Price (₹)' : 'PO Total Price'}</label>
                            <Input
                                type="number"
                                step="0.01"
                                className="h-9 text-xs border-primary/10 bg-muted/20"
                                value={formState.price}
                                disabled={message.intent === 'receive'}
                                onChange={(e) => setFormState(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                            />
                        </div>
                    )}
                </div>
            </div>

            <Button
                size="sm"
                variant={message.intent === 'cancel' ? 'destructive' : 'default'}
                className="w-full h-11 mt-2 font-bold shadow-lg"
                disabled={(message.intent === 'receive' || message.intent === 'cancel') && !formState.po_id}
                onClick={() => {
                    let sql = "";
                    const e_id = employeeId ? `'${employeeId}'` : "(SELECT e_id FROM employees WHERE user_id = auth.uid())";

                    if (message.intent === 'move') {
                        sql = `
                            UPDATE product_warehouse SET stock = stock - ${formState.quantity} 
                            WHERE pid = ${formState.pid} AND w_id = ${formState.w_id};
                            
                            INSERT INTO product_warehouse (pid, w_id, stock) 
                            VALUES (${formState.pid}, ${formState.target_w_id}, ${formState.quantity})
                            ON CONFLICT (pid, w_id) DO UPDATE SET stock = product_warehouse.stock + ${formState.quantity};
                            
                            INSERT INTO transactions (amt, type, pid, w_id, target_w_id, description, e_id)
                            VALUES (${formState.quantity}, 'transfer', ${formState.pid}, ${formState.w_id}, ${formState.target_w_id}, 'Move via Chat Form', ${e_id});
                            
                            UPDATE products SET quantity = (SELECT SUM(stock) FROM product_warehouse WHERE pid = ${formState.pid}) WHERE pid = ${formState.pid};
                        `;
                    } else if (message.intent === 'order') {
                        // Use Number() to ensure we don't pass empty strings to SQL
                        const p = Number(formState.pid) || 0;
                        const s = Number(formState.sup_id) || 0;
                        const w = Number(formState.target_w_id) || 0;
                        const q = Number(formState.quantity) || 0;
                        const pr = Number(formState.price) || 0;

                        sql = `INSERT INTO orders (p_id, sup_id, target_w_id, quantity, price, created_by, status) VALUES (${p}, ${s}, ${w}, ${q}, ${pr}, ${e_id}, 'pending'); INSERT INTO bills (order_id, supplier_id, file_url, uploaded_by) VALUES ((SELECT max(po_id) FROM orders), ${s}, 'ATTACHED_BILL_URL', ${e_id});`;
                    } else if (message.intent === 'receive') {
                        sql = `
                            UPDATE orders 
                            SET 
                                received_quantity = COALESCE(received_quantity, 0) + ${formState.quantity},
                                last_received_at = NOW(),
                                status = CASE WHEN (COALESCE(received_quantity, 0) + ${formState.quantity}) >= quantity THEN 'received'::order_status ELSE 'partial'::order_status END 
                            WHERE po_id = ${formState.po_id};
                            
                            INSERT INTO transactions (amt, type, pid, w_id, description, e_id)
                            VALUES (${formState.quantity}, 'receive', ${formState.pid}, ${formState.target_w_id}, 'Partial fulfillment via Chat Form PO-' || ${formState.po_id}, ${e_id});
                            
                            INSERT INTO product_warehouse (pid, w_id, stock) 
                            VALUES (${formState.pid}, ${formState.target_w_id}, ${formState.quantity})
                            ON CONFLICT (pid, w_id) DO UPDATE SET stock = product_warehouse.stock + ${formState.quantity};
                            
                            UPDATE products SET quantity = (SELECT SUM(stock) FROM product_warehouse WHERE pid = ${formState.pid}) WHERE pid = ${formState.pid};
                        `;
                    } else if (message.intent === 'cancel') {
                        const newStatus = userRole === 'admin' ? 'cancelled' : 'cancel_pending';
                        sql = `UPDATE orders SET status = '${newStatus}'::order_status WHERE po_id = ${formState.po_id};`;
                    } else if (message.intent === 'adjustment') {
                        const qty = parseInt(String(formState.quantity)); // could be negative

                        // We use UPSERT on product_warehouse to ensure we don't break if row missing (though for negative adj it should exist)
                        // If negative, we decrease.
                        sql = `
            INSERT INTO product_warehouse (pid, w_id, stock)
            VALUES (${formState.pid}, ${formState.w_id}, ${qty})
            ON CONFLICT (pid, w_id) DO UPDATE SET stock = product_warehouse.stock + ${qty};

            INSERT INTO transactions (amt, type, pid, w_id, description, e_id)
            VALUES (${qty}, 'adjustment', ${formState.pid}, ${formState.w_id}, 'Adjustment via Chat: ${qty} units', ${e_id});

            UPDATE products SET quantity = (SELECT SUM(stock) FROM product_warehouse WHERE pid = ${formState.pid}) WHERE pid = ${formState.pid};
            `;
                    }

                    let customExplanation = `processed ${message.intent} for ${formState.quantity} units.`;
                    if (message.intent === 'receive') {
                        const order = allOrders.find((o: any) => String(o.po_id) === String(formState.po_id));
                        if (order) {
                            const newReceived = (order.received_quantity || 0) + Number(formState.quantity);
                            const pending = Math.max(0, order.quantity - newReceived);
                            customExplanation = `received ${newReceived}/${order.quantity} units (PO-${formState.po_id.padStart(4, '0')}). ${pending > 0 ? `${pending} pending.` : 'Order complete!'}`;
                        }
                    } else if (message.intent === 'cancel') {
                        customExplanation = userRole === 'admin' ? `cancelled order PO-${formState.po_id.padStart(4, '0')}.` : `requested cancellation for PO-${formState.po_id.padStart(4, '0')}. Pending admin approval.`;
                    } else if (message.intent === 'adjustment') {
                        const qty = parseInt(String(formState.quantity));
                        customExplanation = `adjusted stock for product by ${qty} units in warehouse.`;
                    }

                    handleConfirm(sql, customExplanation);
                }}
            >
                <Play className="h-4 w-4 mr-2" /> {message.intent === 'cancel' ? 'Confirm Cancellation' : 'Confirm & Execute Action'}
            </Button>

            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-dashed border-muted-foreground/20">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-indigo-400">Tactical Summary</span>
                    <p className="text-[11px] font-bold text-foreground leading-tight italic">
                        {message.intent === 'order' ? `Ready to draft procurement for ${formState.quantity} un.` :
                            message.intent === 'move' ? `Ready to initiate transfer of ${formState.quantity} un.` :
                                message.intent === 'receive' ? `Ready to record incoming shipment for ${formState.quantity} un.` :
                                    `Prepared to execute ${message.intent} operation.`}
                    </p>
                </div>

                {message.classification?.risk === 'high' && userRole !== 'admin' && (
                    <div className="flex flex-col gap-2">
                        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-rose-500 animate-pulse" />
                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Administrative Intervention Required</span>
                        </div>
                        <p className="text-[10px] text-rose-400/80 font-medium px-1">This action is locked due to high system risk. Contact an administrator to proceed.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function BulkPlanForm({ message, products, warehouses, suppliers, stockLevels, userRole, handleConfirm }: any) {
    const isAuthorized = () => {
        if (userRole === 'sales_representative') return false; // READ-ONLY
        // Many plans involve 'order' splits
        if (message.plan?.[0]?.intent === 'order') {
            return userRole === 'admin' || userRole === 'manager';
        }
        return true;
    };

    if (!isAuthorized()) return null;

    const defaultSplits = message.plan?.map((p: any) => ({
        target_w_id: (p.params?.target_w_id || p.params?.w_id) ? String(p.params?.target_w_id || p.params?.w_id) : "",
        quantity: Number(p.params?.quantity) || 0,
        price: Number(p.params?.price) || 0
    })) || [{ target_w_id: "", quantity: 0, price: 0 }];

    const initialTotal = defaultSplits.reduce((acc: number, curr: any) => acc + curr.quantity, 0);

    const [supId, setSupId] = useState(message.plan?.[0]?.params?.sup_id ? String(message.plan[0].params.sup_id) : "");
    const [pid, setPid] = useState(message.plan?.[0]?.params?.pid ? String(message.plan[0].params.pid) : "");
    const [splits, setSplits] = useState(defaultSplits);
    const [totalQuantity, setTotalQuantity] = useState(initialTotal);

    useEffect(() => {
        if (!pid) return;
        const product = products.find((p: any) => String(p.pid) === pid);
        if (product && product.unit_price) {
            setSplits((prev: any[]) => prev.map((s: any) => ({ ...s, price: product.unit_price })));
        }
    }, [pid, products]);

    const getStock = (wId: string) => {
        const item = stockLevels.find((sl: any) => String(sl.w_id) === wId && String(sl.pid) === pid);
        return item ? item.stock : 0;
    };

    const getCapacity = (wId: string) => {
        const wh = warehouses.find((w: any) => String(w.w_id) === wId);
        if (!wh) return 0;
        const currentTotal = stockLevels.filter((sl: any) => String(sl.w_id) === wId).reduce((acc: number, curr: any) => acc + curr.stock, 0);
        return wh.capacity - currentTotal;
    };

    // When total quantity changes, adjust all splits based on available capacity ratios
    const handleTotalQuantityChange = (newTotal: number) => {
        if (newTotal < 0) return;
        setTotalQuantity(newTotal);

        if (splits.length === 0) return;

        // Calculate total available capacity across all selected warehouses
        const totalAvail = splits.reduce((acc: number, s: any) => acc + Math.max(0, getCapacity(s.target_w_id)), 0);

        if (totalAvail <= 0) {
            // Fallback to equal distribution if no capacity data
            const share = Math.floor(newTotal / splits.length);
            const remainder = newTotal % splits.length;
            setSplits(splits.map((s: any, i: number) => ({
                ...s,
                quantity: share + (i === splits.length - 1 ? remainder : 0)
            })));
        } else {
            // Distribute based on capacity ratio
            let runningSum = 0;
            const newSplits = splits.map((s: any, i: number) => {
                if (i === splits.length - 1) {
                    return { ...s, quantity: newTotal - runningSum };
                }
                const avail = Math.max(0, getCapacity(s.target_w_id));
                const newQty = Math.floor((avail / totalAvail) * newTotal);
                runningSum += newQty;
                return { ...s, quantity: newQty };
            });
            setSplits(newSplits);
        }
    };

    const handleAddSplit = () => {
        // When adding a split, we just add it with 0 and keep total the same
        setSplits([...splits, { target_w_id: "", quantity: 0, price: splits[0]?.price || 0 }]);
    };

    const handleRemoveSplit = (idx: number) => {
        if (splits.length <= 1) return;

        const removedQty = splits[idx].quantity;
        const remainingSplits = splits.filter((_: any, i: number) => i !== idx);

        // Redistribute based on available capacity of survivors
        const totalAvailRemaining = remainingSplits.reduce((acc: number, s: any) => acc + Math.max(0, getCapacity(s.target_w_id)), 0);

        let newSplits;
        if (totalAvailRemaining <= 0) {
            // Fallback to proportional to current splits
            const currentSum = remainingSplits.reduce((acc: number, s: any) => acc + s.quantity, 0);
            if (currentSum === 0) {
                const share = Math.floor(removedQty / remainingSplits.length);
                const remainder = removedQty % remainingSplits.length;
                newSplits = remainingSplits.map((s: any, i: number) => ({
                    ...s,
                    quantity: share + (i === remainingSplits.length - 1 ? remainder : 0)
                }));
            } else {
                let runningAdded = 0;
                newSplits = remainingSplits.map((s: any, i: number) => {
                    if (i === remainingSplits.length - 1) {
                        return { ...s, quantity: s.quantity + (removedQty - runningAdded) };
                    }
                    const added = Math.floor((s.quantity / currentSum) * removedQty);
                    runningAdded += added;
                    return { ...s, quantity: s.quantity + added };
                });
            }
        } else {
            // Capacity-weighted redistribution
            let runningAdded = 0;
            newSplits = remainingSplits.map((s: any, i: number) => {
                if (i === remainingSplits.length - 1) {
                    return { ...s, quantity: s.quantity + (removedQty - runningAdded) };
                }
                const avail = Math.max(0, getCapacity(s.target_w_id));
                const added = Math.floor((avail / totalAvailRemaining) * removedQty);
                runningAdded += added;
                return { ...s, quantity: s.quantity + added };
            });
        }
        setSplits(newSplits);
    };

    const handleUpdateSplit = (idx: number, field: string, value: any) => {
        if (field === 'quantity') {
            const newQty = parseInt(value) || 0;
            const oldQty = splits[idx].quantity;
            const delta = oldQty - newQty; // what we need to distribute to others

            const otherSplits = splits.filter((_: any, i: number) => i !== idx);
            if (otherSplits.length === 0) {
                // Only one split, it MUST match total quantity
                setTotalQuantity(newQty);
                setSplits([{ ...splits[0], quantity: newQty }]);
                return;
            }

            const totalAvailOthers = otherSplits.reduce((acc: number, s: any) => acc + Math.max(0, getCapacity(s.target_w_id)), 0);

            let newOtherSplits;
            if (totalAvailOthers <= 0) {
                // Fallback to proportional if no positive capacity available elsewhere
                const otherSum = otherSplits.reduce((acc: number, s: any) => acc + s.quantity, 0);
                if (otherSum === 0) {
                    const share = Math.floor(delta / otherSplits.length);
                    const remainder = delta % otherSplits.length;
                    newOtherSplits = otherSplits.map((s: any, i: number) => ({
                        ...s,
                        quantity: Math.max(0, s.quantity + share + (i === otherSplits.length - 1 ? remainder : 0))
                    }));
                } else {
                    let runningDeltaUsed = 0;
                    newOtherSplits = otherSplits.map((s: any, i: number) => {
                        if (i === otherSplits.length - 1) {
                            return { ...s, quantity: Math.max(0, s.quantity + (delta - runningDeltaUsed)) };
                        }
                        const shareOfDelta = Math.floor((s.quantity / otherSum) * delta);
                        runningDeltaUsed += shareOfDelta;
                        return { ...s, quantity: Math.max(0, s.quantity + shareOfDelta) };
                    });
                }
            } else {
                // Capacity-weighted delta distribution
                let runningDeltaUsed = 0;
                newOtherSplits = otherSplits.map((s: any, i: number) => {
                    const avail = Math.max(0, getCapacity(s.target_w_id));
                    if (i === otherSplits.length - 1) {
                        return { ...s, quantity: Math.max(0, s.quantity + (delta - runningDeltaUsed)) };
                    }
                    const shareOfDelta = Math.floor((avail / totalAvailOthers) * delta);
                    runningDeltaUsed += shareOfDelta;
                    return { ...s, quantity: Math.max(0, s.quantity + shareOfDelta) };
                });
            }

            // Reconstruct splits array
            const finalSplits = [...splits];
            finalSplits[idx] = { ...finalSplits[idx], quantity: newQty };
            let otherIdx = 0;
            const patchedSplits = finalSplits.map((s, i) => i === idx ? s : newOtherSplits[otherIdx++]);

            setSplits(patchedSplits);
            // Re-sync total quantity just in case of rounding
            setTotalQuantity(patchedSplits.reduce((acc: number, s: any) => acc + s.quantity, 0));
        } else {
            const newSplits = [...splits];
            newSplits[idx] = { ...newSplits[idx], [field]: value };
            setSplits(newSplits);
        }
    };

    const handleBulkExecute = async () => {
        let combinedSql = "";
        let combinedExplanation = "Executed strategic bulk distribution:";
        let hasActions = false;

        for (const split of splits) {
            if (!split.target_w_id || split.quantity <= 0) continue;
            hasActions = true;

            if (message.plan[0].intent === 'order') {
                combinedSql += `
                    INSERT INTO orders (p_id, quantity, target_w_id, sup_id, status, price, created_by) 
                    VALUES (${pid}, ${split.quantity}, ${split.target_w_id}, ${supId}, 'pending', ${split.price || 0}, (SELECT e_id FROM employees WHERE user_id = auth.uid())); 
                    
                    INSERT INTO bills (order_id, supplier_id, file_url, uploaded_by) 
                    VALUES ((SELECT max(po_id) FROM orders), ${supId}, 'ATTACHED_BILL_URL', (SELECT e_id FROM employees WHERE user_id = auth.uid()));
                `;
                combinedExplanation += `\n- ${split.quantity} units to Warehouse ${split.target_w_id}`;
            } else if (message.plan[0].intent === 'move') {
                combinedSql += `
                    INSERT INTO transactions (pid, w_id, amt, type, description, e_id) 
                    VALUES (${pid}, ${split.target_w_id}, ${split.quantity}, 'receive', 'Bulk strategic movement', (SELECT e_id FROM employees WHERE user_id = auth.uid()));
                `;
                combinedExplanation += `\n- Moved ${split.quantity} units to Warehouse ${split.target_w_id}`;
            }
        }

        if (hasActions && combinedSql) {
            await handleConfirm(combinedSql, combinedExplanation);
        }
    };

    return (
        <div className="mt-4 p-5 border rounded-2xl bg-background/50 backdrop-blur-md border-indigo-500/20 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-indigo-500/10 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <LayoutDashboard className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-tighter text-foreground/80">Bulk Strategic Distribution</h3>
                        <p className="text-[10px] text-muted-foreground font-medium">Coordinate logistics across multiple sites</p>
                    </div>
                </div>
                {/* Total Quantity Master Control */}
                <div className="bg-indigo-500/5 px-4 py-2 rounded-xl border border-indigo-500/10 flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Total Strategic Volume</div>
                        <div className="text-[10px] font-bold text-indigo-400">Fixed Anchor</div>
                    </div>
                    <Input
                        type="number"
                        className="w-24 h-9 bg-background/50 border-indigo-500/20 text-indigo-400 font-black text-center text-sm focus:ring-indigo-500/30"
                        value={totalQuantity}
                        onChange={(e) => handleTotalQuantityChange(parseInt(e.target.value) || 0)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest pl-1">Target Product</label>
                    <Select value={pid} onValueChange={setPid}>
                        <SelectTrigger className="h-10 bg-muted/20 border-indigo-500/10 hover:border-indigo-500/30 transition-all font-semibold text-xs text-foreground">
                            <SelectValue placeholder="Select Product">
                                {products.find((p: any) => String(p.pid) === pid)?.p_name}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {products.map((p: any) => <SelectItem key={p.pid} value={String(p.pid)}>{p.p_name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest pl-1">Primary Vendor</label>
                    <Select value={supId} onValueChange={setSupId}>
                        <SelectTrigger className="h-10 bg-muted/20 border-indigo-500/10 hover:border-indigo-500/30 transition-all font-semibold text-xs text-foreground">
                            <SelectValue placeholder="Select Vendor">
                                {suppliers.find((s: any) => String(s.sup_id) === supId)?.s_name}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {suppliers.map((s: any) => <SelectItem key={s.sup_id} value={String(s.sup_id)}>{s.s_name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2">
                        <TrendingUp className="h-3 w-3" /> Distribution Splits
                    </label>
                    <Button variant="ghost" size="sm" onClick={handleAddSplit} className="h-7 text-[9px] font-black hover:bg-indigo-500/10 text-indigo-400">
                        <Plus className="h-3 w-3 mr-1" /> ADD SPLIT
                    </Button>
                </div>

                <div className="space-y-2">
                    {splits.map((split: any, idx: number) => (
                        <div key={idx} className="group relative grid grid-cols-12 gap-2 p-3 bg-muted/10 rounded-xl border border-border/50 hover:border-indigo-500/20 transition-all">
                            <div className="col-span-4 space-y-1">
                                <label className="text-[8px] font-bold text-muted-foreground uppercase">Warehouse</label>
                                <Select value={split.target_w_id} onValueChange={(val: string) => handleUpdateSplit(idx, 'target_w_id', val)}>
                                    <SelectTrigger className="h-8 text-[11px] bg-background/50 border-primary/5 text-foreground">
                                        <SelectValue placeholder="Destination">
                                            {warehouses.find((w: any) => String(w.w_id) === split.target_w_id)?.w_name}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses.map((w: any) => <SelectItem key={w.w_id} value={String(w.w_id)}>{w.w_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-2 space-y-1">
                                <label className="text-[8px] font-bold text-muted-foreground uppercase">Stock</label>
                                <div className="h-8 flex items-center px-2 bg-muted/20 rounded border border-transparent text-[11px] font-black text-indigo-400">
                                    {getStock(split.target_w_id)}
                                </div>
                            </div>

                            <div className="col-span-2 space-y-1">
                                <label className="text-[8px] font-bold text-muted-foreground uppercase">Space Available</label>
                                <div className={`h-8 flex items-center px-2 rounded border border-transparent text-[11px] font-black transition-colors ${getCapacity(split.target_w_id) <= 0 ? 'bg-rose-500/10 text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                                    {getCapacity(split.target_w_id) <= 0 ? (
                                        <div className="flex flex-col leading-none">
                                            <span>{getCapacity(split.target_w_id)}</span>
                                            <span className="text-[6px] uppercase">OVER CAPACITY</span>
                                        </div>
                                    ) : (
                                        getCapacity(split.target_w_id)
                                    )}
                                </div>
                            </div>

                            <div className="col-span-2 space-y-1">
                                <label className="text-[8px] font-bold text-muted-foreground uppercase">Qty</label>
                                <Input
                                    type="number"
                                    className="h-8 text-[11px] font-bold bg-background/50 border-primary/5 focus:ring-indigo-500/30"
                                    value={split.quantity}
                                    onChange={(e) => handleUpdateSplit(idx, 'quantity', e.target.value)}
                                />
                            </div>

                            <div className="col-span-1 space-y-1">
                                <label className="text-[8px] font-bold text-muted-foreground uppercase">Price</label>
                                <Input
                                    type="number"
                                    className="h-8 text-[11px] font-bold bg-background/50 border-primary/5 text-foreground"
                                    value={split.price}
                                    onChange={(e) => handleUpdateSplit(idx, 'price', parseFloat(e.target.value) || 0)}
                                />
                            </div>

                            <div className="col-span-1 flex items-end pb-0.5 justify-center">
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveSplit(idx)} className="h-7 w-7 text-muted-foreground hover:text-rose-400 hover:bg-rose-400/10">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[11px] shadow-[0_4px_20px_rgba(79,70,229,0.3)] transition-all hover:scale-[1.01]" onClick={handleBulkExecute}>
                Finalize & Execute Strategic Dispatch
            </Button>
        </div>
    );
}
