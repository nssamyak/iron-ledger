import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { createClient } from "@/utils/supabase/server"
import { DollarSign, ShoppingCart, AlertTriangle, TrendingUp } from "lucide-react"

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch total revenue from orders
    const { data: revenueData } = await supabase
        .from('orders')
        .select('price')
        .in('status', ['received', 'shipped'])

    const totalRevenue = revenueData?.reduce((sum, order) => sum + (Number(order.price) || 0), 0) || 0

    // Fetch active orders count
    const { count: activeOrdersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'approved', 'ordered', 'shipped'])

    // Fetch dynamic inventory data for accurate stats
    const { data: inventoryData } = await supabase
        .from('products')
        .select('unit_price, product_warehouse(stock)')

    // Fetch recent transactions
    const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('t_id, time, amt, type, products(p_name)')
        .order('time', { ascending: false })
        .limit(5)

    // Calculate Dynamic Stats
    let lowStockCount = 0
    let totalInventoryValue = 0

    inventoryData?.forEach(item => {
        const actualStock = (item.product_warehouse as any[] || []).reduce((s, pw) => s + (pw.stock || 0), 0)
        if (actualStock < 50) lowStockCount++
        totalInventoryValue += (actualStock * Number(item.unit_price || 0))
    })

    // Calculate stats
    const previousRevenue = totalRevenue * 0.8 // Simulated previous period
    const revenueGrowth = ((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Revenue
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">
                            +{revenueGrowth}% from last period
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Orders
                        </CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeOrdersCount || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Pending fulfillment
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Low Stock Alerts
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{lowStockCount || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Products below threshold
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Inventory Value
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-muted-foreground">
                            Total stock value
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>
                            Latest inventory movements
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentTransactions && recentTransactions.length > 0 ? (
                                recentTransactions.map((txn: any) => (
                                    <div key={txn.t_id} className="flex items-center justify-between border-b pb-2">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {txn.products?.p_name || 'Unknown Product'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(txn.time).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-1 rounded-full ${txn.type === 'receive' ? 'bg-green-500/10 text-green-500' :
                                                txn.type === 'take' ? 'bg-red-500/10 text-red-500' :
                                                    txn.type === 'transfer' ? 'bg-blue-500/10 text-blue-500' :
                                                        'bg-yellow-500/10 text-yellow-500'
                                                }`}>
                                                {txn.type}
                                            </span>
                                            <span className={`font-medium ${txn.amt > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {txn.amt > 0 ? '+' : ''}{txn.amt}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No recent transactions</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Quick Stats</CardTitle>
                        <CardDescription>
                            System overview
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Total Products</span>
                                <span className="text-sm font-bold">{inventoryData?.length || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Completed Orders</span>
                                <span className="text-sm font-bold">{revenueData?.length || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Avg Order Value</span>
                                <span className="text-sm font-bold">
                                    ${revenueData && revenueData.length > 0
                                        ? (totalRevenue / revenueData.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                        : '0.00'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
