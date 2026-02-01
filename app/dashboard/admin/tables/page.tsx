"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    Table as TableIcon,
    Search,
    Save,
    Trash2,
    Plus,
    RefreshCw,
    Database,
    AlertCircle,
    ChevronRight,
    SearchCode
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
} from "@/app/components/ui/select"

export default function TableEditorPage() {
    const supabase = createClient()
    const [tables, setTables] = useState<string[]>([])
    const [selectedTable, setSelectedTable] = useState<string>("")
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        fetchTables()
    }, [])

    useEffect(() => {
        if (selectedTable) {
            fetchTableData(selectedTable)
        }
    }, [selectedTable])

    const fetchTables = async () => {
        const { data, error } = await supabase.rpc('preview_sql', {
            query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
        })
        if (error) {
            setError(error.message)
        } else {
            setTables(data.map((t: any) => t.table_name))
        }
    }

    const fetchTableData = async (tableName: string) => {
        setLoading(true)
        setError(null)
        const { data, error } = await supabase.rpc('preview_sql', {
            query: `SELECT * FROM ${tableName} LIMIT 100`
        })
        if (error) {
            setError(error.message)
        } else {
            setData(data || [])
        }
        setLoading(false)
    }

    const handleDelete = async (idValue: any, idColumn: string) => {
        if (!confirm(`Are you sure you want to delete this row where ${idColumn} = ${idValue}?`)) return

        const sql = `DELETE FROM ${selectedTable} WHERE ${idColumn} = ${typeof idValue === 'string' ? `'${idValue}'` : idValue}`
        const { data, error } = await supabase.rpc('exec_sql', { query: sql })

        if (error || (data && data.error)) {
            alert("Delete failed: " + (error?.message || data.error))
        } else {
            fetchTableData(selectedTable)
        }
    }

    // Filtered data for searching locally in the 100 loaded rows
    const filteredData = data.filter(row =>
        Object.values(row).some(val =>
            String(val).toLowerCase().includes(searchQuery.toLowerCase())
        )
    )

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <Database className="h-8 w-8 text-indigo-600" />
                        Table Management
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        Administrative access to directly view and modify database tables.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchTables()} className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Refresh Tables
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                {/* Table List Sidebar */}
                <div className="space-y-4">
                    <Card className="border-none shadow-xl bg-card/60 backdrop-blur">
                        <CardHeader className="pb-3 border-b border-muted/30">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Select Table</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 px-2">
                            <div className="space-y-1">
                                {tables.map(table => (
                                    <button
                                        key={table}
                                        onClick={() => setSelectedTable(table)}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all ${selectedTable === table
                                                ? "bg-indigo-600 text-white shadow-lg font-bold"
                                                : "hover:bg-muted text-muted-foreground"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <TableIcon className={`h-4 w-4 ${selectedTable === table ? "text-white" : "text-indigo-600"}`} />
                                            {table}
                                        </div>
                                        {selectedTable === table && <ChevronRight className="h-3 w-3" />}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-amber-500/10 border-amber-500/20 text-amber-700">
                        <CardContent className="p-4 flex gap-3 text-xs leading-relaxed">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <p><strong>Warning:</strong> Changes made here are permanent. Exercise extreme caution when deleting rows.</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Table Data View */}
                <div className="space-y-4">
                    {selectedTable ? (
                        <>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-black capitalize">{selectedTable}</h2>
                                    <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full uppercase tracking-tighter text-muted-foreground">
                                        {data.length} Rows Loaded
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search across columns..."
                                            className="pl-9 h-9 text-xs"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <Button size="sm" className="bg-indigo-600 h-9">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => fetchTableData(selectedTable)} className="h-9">
                                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm flex gap-2">
                                    <AlertCircle className="h-5 w-5" /> {error}
                                </div>
                            )}

                            <Card className="overflow-hidden border-none shadow-2xl bg-card">
                                <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
                                    <table className="w-full text-[11px] border-collapse">
                                        <thead className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b">
                                            <tr>
                                                <th className="px-4 py-3 font-black text-muted-foreground uppercase text-center w-12 tracking-widest bg-muted/30">#</th>
                                                {data.length > 0 && Object.keys(data[0]).map(col => (
                                                    <th key={col} className="px-4 py-3 font-black text-muted-foreground uppercase text-left tracking-widest border-l">
                                                        {col}
                                                    </th>
                                                ))}
                                                <th className="px-4 py-3 font-black text-muted-foreground uppercase text-center w-24 tracking-widest border-l">Ops</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-muted/30">
                                            {filteredData.map((row, idx) => {
                                                // Try to guess the primary key (id, pid, w_id, etc)
                                                const pkCol = Object.keys(row).find(k => k.toLowerCase().includes('id') || k === 'pid') || Object.keys(row)[0];

                                                return (
                                                    <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                                                        <td className="px-4 py-3 text-center text-muted-foreground font-mono bg-muted/5">{idx + 1}</td>
                                                        {Object.entries(row).map(([col, val], vIdx) => (
                                                            <td key={vIdx} className="px-4 py-3 font-medium border-l border-muted/10 truncate max-w-[200px]" title={String(val)}>
                                                                {val === null ? <em className="text-muted-foreground/30">null</em> : String(val)}
                                                            </td>
                                                        ))}
                                                        <td className="px-4 py-3 border-l border-muted/10">
                                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-600 hover:bg-indigo-50">
                                                                    <Save className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-red-500 hover:bg-red-50"
                                                                    onClick={() => handleDelete(row[pkCol], pkCol)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {filteredData.length === 0 && (
                                    <div className="py-20 text-center text-muted-foreground italic flex flex-col items-center gap-2">
                                        <SearchCode className="h-10 w-10 text-muted-foreground/20" />
                                        No matching records found in {selectedTable}.
                                    </div>
                                )}
                            </Card>
                        </>
                    ) : (
                        <div className="h-[500px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground gap-4 bg-muted/5">
                            <div className="p-6 bg-indigo-600/5 rounded-full">
                                <SearchCode className="h-16 w-16 text-indigo-600/20" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-black text-foreground">No Table Selected</h3>
                                <p className="text-sm">Click on a table in the sidebar to view and manage its contents.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
