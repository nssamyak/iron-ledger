
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    Users,
    Search,
    UserPlus,
    MoreVertical,
    Shield,
    Building2,
    Briefcase,
    Loader2,
    CheckCircle2,
    XCircle,
    Info
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/app/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/app/components/ui/dialog"
import { Badge } from "@/app/components/ui/badge"

export default function UserManagementPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState<any[]>([])
    const [departments, setDepartments] = useState<any[]>([])
    const [roles, setRoles] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [currentAdminRole, setCurrentAdminRole] = useState<string | null>(null)

    // Selection/Editing State
    const [editingUser, setEditingUser] = useState<any>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        fetchInitialData()
    }, [])

    const fetchInitialData = async () => {
        setLoading(true)

        // 1. Check Authenticated User Role (Robust Resolution)
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
            const { data: urData } = await supabase.from('user_roles').select('*').eq('user_id', authUser.id).maybeSingle()
            const empIdFromUR = (urData as any)?.emp_id

            let employeeData = null
            if (empIdFromUR) {
                const { data: e } = await supabase.from('employees').select('role_id').eq('e_id', empIdFromUR).maybeSingle()
                employeeData = e
            } else {
                const { data: e } = await supabase.from('employees').select('role_id').eq('user_id', authUser.id).maybeSingle()
                employeeData = e
            }

            let dbRoleName = null
            if (employeeData?.role_id) {
                const { data: roleRec } = await supabase.from('roles').select('role_name').eq('role_id', employeeData.role_id).maybeSingle()
                dbRoleName = roleRec?.role_name
            }

            let adminRole = 'warehouse_staff'
            if (dbRoleName === 'Administrator') adminRole = 'admin'
            else if (dbRoleName === 'Warehouse Manager') adminRole = 'manager'
            else if (dbRoleName) adminRole = dbRoleName.toLowerCase().replace(/ /g, '_')

            setCurrentAdminRole(adminRole)
        }

        // 2. Fetch Employees and User Roles separately (to avoid join issues)
        const [empResult, rolesResult] = await Promise.all([
            supabase
                .from('employees')
                .select(`
                    *,
                    departments(d_id, d_name),
                    roles(role_id, role_name)
                `)
                .order('f_name'),
            supabase
                .from('user_roles')
                .select('*')
        ])

        if (empResult.error) console.error("Fetch Employees Error:", empResult.error)
        if (rolesResult.error) console.error("Fetch User Roles Error:", rolesResult.error)

        // Merge roles into employee data
        const mergedUsers = (empResult.data || []).map(emp => ({
            ...emp,
            raw_user_roles: (rolesResult.data || []).filter(r => r.user_id === emp.user_id)
        }))

        // 3. Fetch Metadata for Dropdowns
        const [dData, rData] = await Promise.all([
            supabase.from('departments').select('*').order('d_name'),
            supabase.from('roles').select('*').order('role_name')
        ])

        setUsers(mergedUsers)
        setDepartments(dData.data || [])
        setRoles(rData.data || [])
        setLoading(false)
    }

    const handleUpdateUser = async () => {
        if (!editingUser) return
        setUpdating(true)

        try {
            // 1. Update Employee Record
            const { error: empError } = await supabase
                .from('employees')
                .update({
                    d_id: editingUser.d_id,
                    role_id: editingUser.role_id,
                    updated_at: new Date().toISOString()
                })
                .eq('e_id', editingUser.e_id)

            if (empError) throw empError

            // 2. Sync Technical Role in user_roles
            // Check if record exists
            const { data: existingUR } = await supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', editingUser.user_id)
                .maybeSingle()

            if (existingUR) {
                await supabase
                    .from('user_roles')
                    .update({ role: editingUser.app_role as any })
                    .eq('user_id', editingUser.user_id)
            } else {
                await supabase
                    .from('user_roles')
                    .insert({
                        user_id: editingUser.user_id,
                        role: editingUser.app_role as any,
                        emp_id: editingUser.e_id
                    })
            }

            await fetchInitialData()
            setIsEditDialogOpen(false)
            setEditingUser(null)
            alert("Identity update committed successfully!")
        } catch (error: any) {
            alert("Update Failure: " + error.message)
        } finally {
            setUpdating(false)
        }
    }

    const filteredUsers = users.filter(u =>
        u.e_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.f_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.l_name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (currentAdminRole !== 'admin' && !loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Card className="max-w-md bg-rose-50 border-rose-200">
                    <CardHeader className="text-center">
                        <XCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
                        <CardTitle className="text-rose-900">Access Denied</CardTitle>
                        <CardDescription className="text-rose-700">
                            You do not have administrative privileges to access this area.
                            Please contact your system administrator if you believe this is an error.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-100">
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                        <Users className="h-10 w-10 text-indigo-600" />
                        User Management
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium">
                        Control directory access, assign technical roles, and manage organizational departments.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3"
                >
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Find an agent..."
                            className="pl-10 h-11 border-slate-200 bg-white focus-visible:ring-indigo-500 rounded-xl"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </motion.div>
            </div>

            {loading ? (
                <div className="flex h-96 items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                </div>
            ) : (
                <div className="grid gap-6">
                    <Card className="border-none shadow-2xl bg-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b">
                                    <tr className="text-left">
                                        <th className="px-6 py-4 font-black text-muted-foreground uppercase text-[10px] tracking-widest">Agent Identity</th>
                                        <th className="px-6 py-4 font-black text-muted-foreground uppercase text-[10px] tracking-widest">Department</th>
                                        <th className="px-6 py-4 font-black text-muted-foreground uppercase text-[10px] tracking-widest text-center">Business Role</th>
                                        <th className="px-6 py-4 font-black text-muted-foreground uppercase text-[10px] tracking-widest text-center">Technical Role</th>
                                        <th className="px-6 py-4 font-black text-muted-foreground uppercase text-[10px] tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-muted/30">
                                    <AnimatePresence mode="popLayout">
                                        {filteredUsers.map((user) => (
                                            <motion.tr
                                                layout
                                                key={user.e_id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="group hover:bg-indigo-50/30 transition-colors"
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                                                            {user.f_name[0]}{user.l_name[0]}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-base text-slate-800">{user.e_name}</div>
                                                            <div className="text-[10px] font-mono text-muted-foreground tracking-tighter">{user.user_id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-4 w-4 text-emerald-500" />
                                                        <span className="font-semibold text-slate-700">{user.departments?.d_name || 'Unassigned'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <Badge variant="outline" className="bg-indigo-50/50 text-indigo-700 font-bold border-indigo-100 px-3 py-1">
                                                        {user.roles?.role_name || 'General Staff'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <Badge className={`font-black uppercase text-[10px] px-3 py-1.5 shadow-sm border ${user.raw_user_roles[0]?.role === 'admin' ? 'bg-indigo-600 text-white border-indigo-700' :
                                                        user.raw_user_roles[0]?.role === 'manager' ? 'bg-emerald-600 text-white border-emerald-700' :
                                                            'bg-slate-700 text-white border-slate-800'
                                                        }`}>
                                                        {user.raw_user_roles[0]?.role || 'NONE'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-2 px-4 rounded-lg"
                                                        onClick={() => {
                                                            setEditingUser({
                                                                ...user,
                                                                app_role: user.raw_user_roles[0]?.role || 'warehouse_staff'
                                                            })
                                                            setIsEditDialogOpen(true)
                                                        }}
                                                    >
                                                        Modify
                                                    </Button>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Quick Insight Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-indigo-600 border-none shadow-xl text-white overflow-hidden relative group">
                            <Shield className="absolute -right-4 -bottom-4 h-24 w-24 text-white/10 group-hover:scale-110 transition-transform" />
                            <CardContent className="p-6">
                                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Total Admins</div>
                                <div className="text-4xl font-black mt-1">
                                    {users.filter(u => u.raw_user_roles[0]?.role === 'admin').length}
                                </div>
                                <p className="text-[10px] mt-2 font-medium text-indigo-100 flex items-center gap-1">
                                    <Info className="h-3 w-3" /> Full infrastructure control
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-emerald-600 border-none shadow-xl text-white overflow-hidden relative group">
                            <Briefcase className="absolute -right-4 -bottom-4 h-24 w-24 text-white/10 group-hover:scale-110 transition-transform" />
                            <CardContent className="p-6">
                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Management Tier</div>
                                <div className="text-4xl font-black mt-1">
                                    {users.filter(u => u.raw_user_roles[0]?.role === 'manager').length}
                                </div>
                                <p className="text-[10px] mt-2 font-medium text-emerald-100 flex items-center gap-1">
                                    <Info className="h-3 w-3" /> Operational oversight access
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-none shadow-xl text-white overflow-hidden relative group">
                            <Building2 className="absolute -right-4 -bottom-4 h-24 w-24 text-white/10 group-hover:scale-110 transition-transform" />
                            <CardContent className="p-6">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Departments</div>
                                <div className="text-4xl font-black mt-1">
                                    {departments.length}
                                </div>
                                <p className="text-[10px] mt-2 font-medium text-slate-500 flex items-center gap-1">
                                    <Info className="h-3 w-3" /> Organizational business units
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[480px] bg-white border-none shadow-2xl rounded-3xl overflow-hidden p-0">
                    <div className="bg-indigo-600 p-8 text-white relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Users size={120} />
                        </div>
                        <DialogTitle className="text-3xl font-black tracking-tight">Modify Identity</DialogTitle>
                        <DialogDescription className="text-indigo-100 font-medium text-base mt-2">
                            Adjusting permissions and placement for <b>{editingUser?.e_name}</b>.
                        </DialogDescription>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Department Placement</label>
                            <Select
                                value={String(editingUser?.d_id)}
                                onValueChange={(val: string) => setEditingUser({ ...editingUser, d_id: parseInt(val) })}
                            >
                                <SelectTrigger className="h-12 border-slate-200 rounded-xl font-bold bg-white text-slate-900 focus:ring-indigo-500 shadow-sm">
                                    <SelectValue placeholder="Select Department">
                                        {departments.find(d => String(d.d_id) === String(editingUser?.d_id))?.d_name}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map(d => (
                                        <SelectItem key={d.d_id} value={String(d.d_id)}>{d.d_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Business Role Assignment</label>
                            <Select
                                value={String(editingUser?.role_id)}
                                onValueChange={(val: string) => setEditingUser({ ...editingUser, role_id: parseInt(val) })}
                            >
                                <SelectTrigger className="h-12 border-slate-200 rounded-xl font-bold bg-white text-slate-900 focus:ring-indigo-500 shadow-sm">
                                    <SelectValue placeholder="Select Business Role">
                                        {roles.find(r => String(r.role_id) === String(editingUser?.role_id))?.role_name}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map(r => (
                                        <SelectItem key={r.role_id} value={String(r.role_id)}>{r.role_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Technical Access Level</label>
                            <Select
                                value={editingUser?.app_role}
                                onValueChange={(val: string) => setEditingUser({ ...editingUser, app_role: val })}
                            >
                                <SelectTrigger className="h-12 border-indigo-200 rounded-xl font-bold bg-indigo-50/50 text-indigo-900 focus:ring-indigo-500 shadow-sm">
                                    <SelectValue placeholder="Select Access Level">
                                        {{
                                            'admin': 'Admin (Full Control)',
                                            'manager': 'Manager (Operations)',
                                            'warehouse_staff': 'Warehouse Staff (Execution)',
                                            'procurement_officer': 'Procurement Officer (Buying)'
                                        }[editingUser?.app_role as string] || 'Select Access Level'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin (Full Control)</SelectItem>
                                    <SelectItem value="manager">Manager (Operations)</SelectItem>
                                    <SelectItem value="warehouse_staff">Warehouse Staff (Execution)</SelectItem>
                                    <SelectItem value="procurement_officer">Procurement Officer (Buying)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-400 font-medium px-1 italic">
                                Technical role affects Row Level Security (RLS) policies and dashboard navigation.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-slate-50 border-t flex flex-row gap-3">
                        <Button
                            variant="ghost"
                            className="flex-1 h-12 rounded-xl font-bold text-slate-500"
                            onClick={() => setIsEditDialogOpen(false)}
                            disabled={updating}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 h-12 rounded-xl bg-indigo-600 font-bold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40"
                            onClick={handleUpdateUser}
                            disabled={updating}
                        >
                            {updating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                            Commit Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
