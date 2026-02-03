"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    ShoppingCart,
    Plus,
    Search,
    Filter,
    Package,
    Truck,
    Warehouse as WarehouseIcon,
    FileText,
    ExternalLink,
    Calendar,
    User,
    IndianRupee,
    CheckCircle2,
    Clock,
    AlertCircle,
    Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "../../components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "../../components/ui/dialog"

export default function OrdersPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [orders, setOrders] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [warehouses, setWarehouses] = useState<any[]>([])
    const [role, setRole] = useState<string>('')
    const [user, setUser] = useState<any>(null)

    // Form State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [uploadOrderData, setUploadOrderData] = useState<{ id: number; sup_id: number } | null>(null)
    const [newOrder, setNewOrder] = useState({
        p_id: '',
        sup_id: '',
        target_w_id: '',
        quantity: '',
        price: ''
    })
    const [billFile, setBillFile] = useState<File | null>(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (newOrder.p_id) {
            const product = products.find(p => String(p.pid) === String(newOrder.p_id));
            if (product && product.unit_price) {
                const qty = parseInt(newOrder.quantity) || 1;
                setNewOrder(prev => ({ ...prev, price: (Number(product.unit_price) * qty).toFixed(2) }));
            }
        }
    }, [newOrder.p_id, newOrder.quantity, products]);

    useEffect(() => {
        fetchInitialData()
    }, [])

    const fetchInitialData = async () => {
        setLoading(true)

        // Auth & Role
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)

        if (authUser) {
            // 1. Get mapping from user_roles
            const { data: urData } = await supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', authUser.id)
                .maybeSingle()

            const empIdFromUR = (urData as any)?.emp_id

            // 2. Get employee record
            let employeeData = null
            if (empIdFromUR) {
                const { data: e } = await supabase.from('employees').select('role_id').eq('e_id', empIdFromUR).maybeSingle()
                employeeData = e
            } else {
                const { data: e } = await supabase.from('employees').select('role_id').eq('user_id', authUser.id).maybeSingle()
                employeeData = e
            }

            // 3. Resolve role name
            let dbRoleName = null
            if (employeeData?.role_id) {
                const { data: roleRec } = await supabase.from('roles').select('role_name').eq('role_id', employeeData.role_id).maybeSingle()
                dbRoleName = roleRec?.role_name
            }

            let userRole = 'warehouse_staff'
            if (dbRoleName === 'Administrator') {
                userRole = 'admin'
            } else if (dbRoleName === 'Warehouse Manager') {
                userRole = 'manager'
            } else if (dbRoleName) {
                userRole = dbRoleName.toLowerCase().replace(/ /g, '_')
            }

            setRole(userRole)
        }

        // Dropdown Data
        const [p, s, w] = await Promise.all([
            supabase.from('products').select('pid, p_name, unit_price'),
            supabase.from('suppliers').select('sup_id, s_name'),
            supabase.from('warehouses').select('w_id, w_name')
        ])

        setProducts(p.data || [])
        setSuppliers(s.data || [])
        setWarehouses(w.data || [])

        await fetchOrders()
        setLoading(false)
    }

    const fetchOrders = async () => {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                products(p_name),
                suppliers(s_name),
                warehouses!orders_target_w_id_fkey(w_name),
                employees!orders_created_by_fkey(f_name, l_name),
                bills(bill_id, file_url, file_type)
            `)
            .order('created_at', { ascending: false })

        if (!error) setOrders(data || [])
    }

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!billFile) return alert("Please upload a bill for this order.")

        setSubmitting(true)
        try {
            // 1. Upload Bill to Storage
            const fileExt = billFile.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `bills/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('order-assets')
                .upload(filePath, billFile)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('order-assets')
                .getPublicUrl(filePath)

            // 2. Get employee ID
            const { data: empData } = await supabase.from('employees').select('e_id').eq('user_id', user.id).single()

            // 3. Create Order
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    p_id: parseInt(newOrder.p_id),
                    sup_id: parseInt(newOrder.sup_id),
                    target_w_id: parseInt(newOrder.target_w_id),
                    quantity: parseInt(newOrder.quantity),
                    price: parseFloat(newOrder.price),
                    created_by: empData?.e_id,
                    status: 'pending'
                }])
                .select()
                .single()

            if (orderError) throw orderError

            // 4. Create Bill Record
            const { error: billError } = await supabase
                .from('bills')
                .insert([{
                    order_id: orderData.po_id,
                    supplier_id: parseInt(newOrder.sup_id),
                    file_url: publicUrl,
                    file_type: billFile.type,
                    uploaded_by: empData?.e_id
                }])

            if (billError) throw billError

            setIsCreateOpen(false)
            setNewOrder({ p_id: '', sup_id: '', target_w_id: '', quantity: '', price: '' })
            setBillFile(null)
            await fetchOrders()
            alert("Order created successfully!")

        } catch (err: any) {
            alert(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDirectBillUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!billFile || !uploadOrderData) return

        setSubmitting(true)
        try {
            // 1. Upload Bill to Storage
            const fileExt = billFile.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `bills/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('order-assets')
                .upload(filePath, billFile)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('order-assets')
                .getPublicUrl(filePath)

            // 2. Get employee ID
            const { data: empData } = await supabase.from('employees').select('e_id').eq('user_id', user.id).single()

            // 3. Create Bill Record
            const { error: billError } = await supabase
                .from('bills')
                .insert([{
                    order_id: uploadOrderData.id,
                    supplier_id: uploadOrderData.sup_id,
                    file_url: publicUrl,
                    file_type: billFile.type,
                    uploaded_by: empData?.e_id
                }])

            if (billError) throw billError

            setIsUploadOpen(false)
            setUploadOrderData(null)
            setBillFile(null)
            await fetchOrders()
            alert("Bill uploaded successfully!")

        } catch (err: any) {
            alert(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'received': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
            case 'shipped': return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
            case 'cancelled': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
            case 'cancel_pending': return 'bg-orange-500/10 text-orange-600 border-orange-500/20 animate-pulse';
            default: return 'bg-muted text-muted-foreground';
        }
    }

    const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
        setSubmitting(true)
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('po_id', orderId)

            if (error) throw error
            await fetchOrders()
            alert(`Order status updated to ${newStatus}`)
        } catch (err: any) {
            alert("Error: " + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                        <ShoppingCart className="h-10 w-10 text-primary" />
                        Order Management
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium">
                        Track procurements, manage status, and audit supplier bills.
                    </p>
                </div>

                {(role === 'admin' || role === 'procurement_officer' || role === 'manager') && (
                    <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-indigo-600 shadow-xl transform transition-transform hover:scale-105 h-12 px-6 rounded-xl font-bold">
                        <Plus className="h-5 w-5" /> New Purchase Order
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <Card className="border-none shadow-2xl bg-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr className="text-left py-4">
                                    <th className="px-6 py-4 font-black text-muted-foreground uppercase text-[10px] tracking-widest">Order Details</th>
                                    <th className="px-6 py-4 font-black text-muted-foreground uppercase text-[10px] tracking-widest">Supplier & Target</th>
                                    <th className="px-6 py-4 font-black text-muted-foreground uppercase text-[10px] tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 font-black text-muted-foreground uppercase text-[10px] tracking-widest text-right">Fulfillment</th>
                                    <th className="px-6 py-4 font-black text-muted-foreground uppercase text-[10px] tracking-widest text-right">Value</th>
                                    <th className="px-6 py-4 font-black text-muted-foreground uppercase text-[10px] tracking-widest text-center">Audit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-muted/30">
                                {orders.map((o) => (
                                    <tr key={o.po_id} className="group hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-base flex items-center gap-2">
                                                PO-{o.po_id.toString().padStart(4, '0')}
                                                <span className="text-[10px] font-normal text-muted-foreground">via {o.employees?.f_name}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground uppercase font-black tracking-tight mt-1">{o.products?.p_name}</div>
                                            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                                                <Calendar className="h-3 w-3" /> {new Date(o.date).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5 text-xs">
                                                <div className="flex items-center gap-2 font-bold text-slate-700">
                                                    <Truck className="h-3.5 w-3.5 text-indigo-500" /> {o.suppliers?.s_name}
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <WarehouseIcon className="h-3.5 w-3.5" /> {o.warehouses?.w_name}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${getStatusColor(o.status)}`}>
                                                {o.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <div className="text-sm font-black">
                                                    {o.received_quantity} / {o.quantity}
                                                </div>
                                                <div className="w-24 bg-muted rounded-full h-1 mt-1 overflow-hidden">
                                                    <div
                                                        className="bg-emerald-500 h-full transition-all"
                                                        style={{ width: `${(o.received_quantity / o.quantity) * 100}%` }}
                                                    />
                                                </div>
                                                {o.last_received_at && (
                                                    <span className="text-[8px] text-muted-foreground mt-1 italic">
                                                        Rec: {new Date(o.last_received_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-mono font-bold text-indigo-600 text-base">
                                                ₹{Number(o.price || 0).toLocaleString('en-IN')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                {o.bills?.[0] ? (
                                                    <a href={o.bills[0].file_url} target="_blank" className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="View Bill">
                                                        <FileText className="h-4 w-4" />
                                                    </a>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-[10px] text-muted-foreground italic mb-1">No Bill</span>
                                                        {(role === 'admin' || role === 'procurement_officer') && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 rounded-md border border-indigo-100"
                                                                onClick={() => {
                                                                    setUploadOrderData({ id: o.po_id, sup_id: o.sup_id })
                                                                    setIsUploadOpen(true)
                                                                }}
                                                            >
                                                                Add Bill
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Cancellation Workflow */}
                                                {o.status !== 'cancelled' && o.status !== 'received' && (
                                                    <div className="flex gap-1">
                                                        {role === 'admin' ? (
                                                            <>
                                                                {o.status === 'cancel_pending' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-7 text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-100"
                                                                        onClick={() => handleUpdateOrderStatus(o.po_id, 'cancelled')}
                                                                    >
                                                                        Approve Cancel
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 text-[9px] font-black uppercase bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100"
                                                                    onClick={() => handleUpdateOrderStatus(o.po_id, o.status === 'cancel_pending' ? 'pending' : 'cancelled')}
                                                                >
                                                                    {o.status === 'cancel_pending' ? 'Reject Cancel' : 'Cancel PO'}
                                                                </Button>
                                                            </>
                                                        ) : role === 'procurement_officer' && o.status !== 'cancel_pending' ? (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 text-[9px] font-black uppercase bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white border border-amber-100"
                                                                onClick={() => handleUpdateOrderStatus(o.po_id, 'cancel_pending')}
                                                            >
                                                                Request Cancel
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Direct Bill Upload Modal */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Direct Bill Upload</DialogTitle>
                        <DialogDescription>
                            Upload a missing bill for order PO-{uploadOrderData?.id.toString().padStart(4, '0')}.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleDirectBillUpload} className="space-y-4">
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Select Bill File (PDF/Image)</label>
                                <div className="border-2 border-dashed rounded-xl p-8 text-center group hover:border-indigo-600 transition-colors cursor-pointer relative">
                                    <Input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => setBillFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        required
                                    />
                                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                        <FileText className="h-10 w-10 group-hover:text-indigo-600" />
                                        <span className="text-xs font-bold leading-none">{billFile ? billFile.name : "Click to select file"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-4 border-t">
                            <Button variant="ghost" onClick={() => {
                                setIsUploadOpen(false)
                                setBillFile(null)
                            }} disabled={submitting} type="button">Cancel</Button>
                            <Button className="bg-indigo-600 font-bold px-8 shadow-lg shadow-indigo-500/20" disabled={submitting || !billFile} type="submit">
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                Upload Bill
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Create Order Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create Purchase Order</DialogTitle>
                        <DialogDescription>
                            Initiate a new procurement request. A digital bill/invoice is mandatory.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateOrder} className="space-y-4">
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Product</label>
                                    <Select value={newOrder.p_id} onValueChange={(val: any) => setNewOrder({ ...newOrder, p_id: val })}>
                                        <SelectTrigger className="h-10 text-xs font-bold border-2">
                                            <SelectValue placeholder="Select Product" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products.map(p => <SelectItem key={p.pid} value={p.pid.toString()}>{p.p_name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Supplier</label>
                                    <Select value={newOrder.sup_id} onValueChange={(val: any) => setNewOrder({ ...newOrder, sup_id: val })}>
                                        <SelectTrigger className="h-10 text-xs font-bold border-2">
                                            <SelectValue placeholder="Select Supplier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map(s => <SelectItem key={s.sup_id} value={s.sup_id.toString()}>{s.s_name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Target Warehouse</label>
                                <Select value={newOrder.target_w_id} onValueChange={(val: any) => setNewOrder({ ...newOrder, target_w_id: val })}>
                                    <SelectTrigger className="h-10 text-xs font-bold border-2">
                                        <SelectValue placeholder="Target Location" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses.map(w => <SelectItem key={w.w_id} value={w.w_id.toString()}>{w.w_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Order Quantity</label>
                                    <Input
                                        type="number"
                                        required
                                        className="h-10 border-2 font-bold"
                                        value={newOrder.quantity}
                                        onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Price (₹)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        required
                                        className="h-10 border-2 font-bold"
                                        value={newOrder.price}
                                        onChange={(e) => setNewOrder({ ...newOrder, price: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Upload Digital Bill (PDF/Image)</label>
                                <div className="border-2 border-dashed rounded-xl p-4 text-center group hover:border-indigo-600 transition-colors cursor-pointer relative">
                                    <Input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => setBillFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <FileText className="h-8 w-8 group-hover:text-indigo-600" />
                                        <span className="text-xs font-bold leading-none">{billFile ? billFile.name : "Click or drag and drop to upload"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-4 border-t">
                            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={submitting} type="button">Cancel</Button>
                            <Button className="bg-indigo-600 font-bold px-8 shadow-lg shadow-indigo-500/20" disabled={submitting} type="submit">
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                Finalize Order
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
