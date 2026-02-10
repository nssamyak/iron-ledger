"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card"

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6']

interface TopProductsChartProps {
    data: { name: string; revenue: number; quantity: number }[]
}

interface TopWarehousesChartProps {
    data: { name: string; value: number; transactions: number }[]
}

export function TopProductsChart({ data }: TopProductsChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Top Performing Products</CardTitle>
                    <CardDescription>By revenue generated</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">No data available</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Top Performing Products</CardTitle>
                <CardDescription>By revenue generated from orders</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                type="number" 
                                stroke="#9ca3af"
                                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                            />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                stroke="#9ca3af" 
                                width={100}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1f2937', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px'
                                }}
                                formatter={(value, name) => {
                                    if (name === 'revenue') return [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Revenue']
                                    return [value, 'Quantity']
                                }}
                            />
                            <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

export function TopWarehousesChart({ data }: TopWarehousesChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Warehouse Performance</CardTitle>
                    <CardDescription>By inventory value</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">No data available</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Warehouse Performance</CardTitle>
                <CardDescription>Inventory value distribution</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                labelLine={{ stroke: '#9ca3af' }}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1f2937', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px'
                                }}
                                formatter={(value) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Value']}
                            />
                            <Legend 
                                verticalAlign="bottom" 
                                height={36}
                                formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

export function ProductQuantityChart({ data }: TopProductsChartProps) {
    if (!data || data.length === 0) {
        return null
    }

    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Top Products by Order Volume</CardTitle>
                <CardDescription>Units ordered</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="name" 
                                stroke="#9ca3af" 
                                tick={{ fontSize: 11 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1f2937', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px'
                                }}
                                formatter={(value) => [value, 'Units Ordered']}
                            />
                            <Bar dataKey="quantity" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

export function WarehouseTransactionsChart({ data }: TopWarehousesChartProps) {
    if (!data || data.length === 0) {
        return null
    }

    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Warehouse Activity</CardTitle>
                <CardDescription>Transaction count</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="name" 
                                stroke="#9ca3af" 
                                tick={{ fontSize: 11 }}
                            />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1f2937', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px'
                                }}
                                formatter={(value) => [value, 'Transactions']}
                            />
                            <Bar dataKey="transactions" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
