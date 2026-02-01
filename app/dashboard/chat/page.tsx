"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Send, Terminal, Play, CheckCircle, AlertTriangle, RefreshCw, Copy, Check, Paperclip, FileText, X, Loader2 } from "lucide-react"
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

type Message = {
    role: "user" | "assistant" | "system"
    content: string
    sql?: string
    results?: any
    explanation?: string
    previewData?: any
    requiresConfirmation?: boolean
    intent?: "move" | "order" | "adjustment" | "query" | "none"
    params?: any
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
    const [employeeId, setEmployeeId] = useState<string | null>(null)

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
        const [p, w, s, o, userRes] = await Promise.all([
            supabase.from('products').select('pid, p_name, unit_price'),
            supabase.from('warehouses').select('w_id, w_name'),
            supabase.from('suppliers').select('sup_id, s_name'),
            supabase.from('orders').select(`po_id, quantity, received_quantity, p_id, target_w_id, products(p_name), warehouses!orders_target_w_id_fkey(w_name)`).neq('status', 'received'),
            supabase.auth.getUser()
        ]);
        setProducts(p.data || [])
        setWarehouses(w.data || [])
        setSuppliers(s.data || [])
        setAllOrders(o.data || [])

        if (userRes.data?.user) {
            const { data: emp } = await supabase.from('employees').select('e_id').eq('user_id', userRes.data.user.id).single()
            if (emp) setEmployeeId(emp.e_id)
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

            if (data.intent && data.intent !== 'none' && data.intent !== 'query') {
                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: data.message,
                    intent: data.intent,
                    params: data.params
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
                            content: "I've detected an order request. Please upload the bill in the popup to proceed."
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
                        requiresConfirmation: true
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
                        requiresConfirmation: false
                    }])
                }
            } else {
                setMessages(prev => [...prev, { role: "assistant", content: data.message || data.explanation || "I couldn't understand that request." }])
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
                if (Array.isArray(data.data) && data.data.length === 0) {
                    setMessages(prev => [...prev, { role: "system", content: "Query executed successfully, but 0 records were affected. Double-check item names or warehouse spelling." }])
                } else {
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
                            <div className="flex justify-between items-start gap-4">
                                <p className="text-sm leading-relaxed">{m.content}</p>
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

                            {m.intent && m.intent !== 'none' && (
                                <ActionForm
                                    message={m}
                                    products={products}
                                    warehouses={warehouses}
                                    suppliers={suppliers}
                                    allOrders={allOrders}
                                    employeeId={employeeId}
                                    handleConfirm={handleConfirm}
                                />
                            )}

                            {/* Results Display logic */}
                            {m.previewData && (
                                <div className={`mt-4 border-l-4 rounded-lg overflow-hidden ${m.requiresConfirmation ? 'border-yellow-500 bg-yellow-500/5' : 'border-emerald-500 bg-emerald-500/5'}`}>
                                    {m.requiresConfirmation && (
                                        <div className="flex items-center gap-2 text-yellow-600 mb-2 font-semibold text-xs px-4 py-2 border-b border-yellow-500/20 bg-yellow-500/10">
                                            <AlertTriangle className="h-3 w-3" /> PREVIEW MODE (Transaction Rolled Back)
                                        </div>
                                    )}

                                    {/* Handle Error in Preview/Result */}
                                    {m.previewData.error ? (
                                        <div className="text-red-500 text-xs p-4">{m.previewData.error}</div>
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
                                        <div className="p-3 border-t bg-yellow-500/5">
                                            <Button size="sm" className="w-full bg-yellow-600 hover:bg-yellow-700 text-white transition-all transform hover:scale-[1.02]" onClick={() => handleConfirm(m.sql!, m.explanation)}>
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

function ActionForm({ message, products, warehouses, suppliers, allOrders, employeeId, handleConfirm }: any) {
    const [formState, setFormState] = useState({
        pid: message.params?.pid ? String(message.params.pid) : "",
        w_id: message.params?.w_id ? String(message.params.w_id) : "",
        target_w_id: message.params?.target_w_id ? String(message.params.target_w_id) : "",
        sup_id: message.params?.sup_id ? String(message.params.sup_id) : "",
        po_id: message.params?.po_id ? String(message.params.po_id) : "",
        quantity: message.params?.quantity || 1,
        price: message.params?.price || 0
    });

    // Auto-update other fields when po_id changes for 'receive' intent
    useEffect(() => {
        if (message.intent === 'receive' && formState.po_id) {
            const order = allOrders.find((o: any) => String(o.po_id) === String(formState.po_id));
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

    return (
        <div className="mt-4 p-4 border rounded-xl bg-muted/40 space-y-4 min-w-[300px]">
            <div className="text-[10px] font-black uppercase text-primary tracking-widest mb-2 flex items-center gap-2">
                <Terminal className="h-3 w-3" /> {message.intent} ACTION FORM
            </div>

            <div className="grid grid-cols-1 gap-4">
                {message.intent === 'receive' && (
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Target Purchase Order</label>
                        <Select value={formState.po_id} onValueChange={(val: any) => setFormState(prev => ({ ...prev, po_id: String(val) }))}>
                            <SelectTrigger className="h-9 text-xs bg-background border-2">
                                <SelectValue placeholder="Select Order">
                                    {formState.po_id ? `PO-${formState.po_id.padStart(4, '0')} (${allOrders.find((o: any) => String(o.po_id) === String(formState.po_id))?.products?.p_name})` : "Select Order"}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {allOrders.map((o: any) => (
                                    <SelectItem key={o.po_id} value={String(o.po_id)}>
                                        PO-{String(o.po_id).padStart(4, '0')} - {o.products?.p_name} ({o.quantity - o.received_quantity} pending)
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
                            <SelectTrigger className="h-9 text-xs bg-background border-2">
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
                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Source (From)</label>
                            <Select value={formState.w_id} onValueChange={(val: any) => setFormState(prev => ({ ...prev, w_id: String(val) }))}>
                                <SelectTrigger className="h-9 text-xs bg-background border-2">
                                    <SelectValue placeholder="Source">{getWarehouseName(formState.w_id)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((w: any) => <SelectItem key={w.w_id} value={String(w.w_id)}>{w.w_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Target (To)</label>
                            <Select value={formState.target_w_id} onValueChange={(val: any) => setFormState(prev => ({ ...prev, target_w_id: String(val) }))}>
                                <SelectTrigger className="h-9 text-xs bg-background border-2">
                                    <SelectValue placeholder="Destination">{getWarehouseName(formState.target_w_id)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((w: any) => <SelectItem key={w.w_id} value={String(w.w_id)}>{w.w_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                {(message.intent === 'order' || message.intent === 'receive') && (
                    <div className="grid grid-cols-2 gap-2">
                        {message.intent === 'order' && (
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase">Supplier</label>
                                <Select value={formState.sup_id} onValueChange={(val: any) => setFormState(prev => ({ ...prev, sup_id: String(val) }))}>
                                    <SelectTrigger className="h-9 text-xs bg-background border-2">
                                        <SelectValue placeholder="Supplier">{getSupplierName(formState.sup_id)}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map((s: any) => <SelectItem key={s.sup_id} value={String(s.sup_id)}>{s.s_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className={`${message.intent === 'receive' ? 'col-span-2' : ''} space-y-1`}>
                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Target Warehouse</label>
                            <Select
                                value={formState.target_w_id}
                                onValueChange={(val: any) => setFormState(prev => ({ ...prev, target_w_id: String(val) }))}
                                disabled={message.intent === 'receive'}
                            >
                                <SelectTrigger className="h-9 text-xs bg-background border-2">
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
                            className="h-9 text-xs border-2"
                            value={formState.quantity}
                            onChange={(e) => setFormState(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                        />
                    </div>

                    {(message.intent === 'order' || message.intent === 'receive') && (
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase">{message.intent === 'order' ? 'Price ($)' : 'PO Total Price'}</label>
                            <Input
                                type="number"
                                step="0.01"
                                className="h-9 text-xs border-2 bg-muted/50"
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
                className="w-full h-11 mt-2 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg"
                disabled={message.intent === 'receive' && !formState.po_id}
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
                        sql = `
                            WITH new_po AS (
                                INSERT INTO orders (p_id, sup_id, target_w_id, quantity, price, created_by, status)
                                VALUES (${formState.pid}, ${formState.sup_id}, ${formState.target_w_id}, ${formState.quantity}, ${formState.price}, ${e_id}, 'pending'::order_status)
                                RETURNING po_id
                            )
                            INSERT INTO bills (order_id, supplier_id, file_url, uploaded_by)
                            VALUES ((SELECT po_id FROM new_po), ${formState.sup_id}, 'ATTACHED_BILL_URL', ${e_id});
                        `;
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
                    }

                    let customExplanation = `processed ${message.intent} for ${formState.quantity} units.`;
                    if (message.intent === 'receive') {
                        const order = allOrders.find((o: any) => String(o.po_id) === String(formState.po_id));
                        if (order) {
                            const newReceived = (order.received_quantity || 0) + Number(formState.quantity);
                            const pending = Math.max(0, order.quantity - newReceived);
                            customExplanation = `received ${newReceived}/${order.quantity} units (PO-${formState.po_id.padStart(4, '0')}). ${pending > 0 ? `${pending} pending.` : 'Order complete!'}`;
                        }
                    }

                    handleConfirm(sql, customExplanation);
                }}
            >
                <Play className="h-4 w-4 mr-2" /> Confirm & Execute Action
            </Button>
        </div>
    );
}
