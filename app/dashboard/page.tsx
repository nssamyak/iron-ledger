import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { createClient } from "@/utils/supabase/server"
import { IndianRupee, ShoppingCart, AlertTriangle, TrendingUp } from "lucide-react"
import { TopProductsChart, TopWarehousesChart, ProductQuantityChart, WarehouseTransactionsChart } from "@/app/components/dashboard/charts"

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

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
        .in('status', ['pending', 'approved', 'ordered', 'shipped', 'cancel_pending'])

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

    // Fetch top products by revenue (from orders)
    const { data: topProductsData } = await supabase
        .from('orders')
        .select('quantity, price, products(p_name)')
        .in('status', ['received', 'shipped', 'ordered'])

    // Fetch warehouse inventory values
    const { data: warehouseData } = await supabase
        .from('product_warehouse')
        .select('stock, w_id, warehouses(w_name), products(unit_price)')

    // Fetch warehouse transaction counts
    const { data: warehouseTransactions } = await supabase
        .from('transactions')
        .select('w_id, warehouses(w_name)')

    // Process top products data
    const productRevenueMap = new Map<string, { revenue: number; quantity: number }>()
    topProductsData?.forEach((order: any) => {
        const productName = order.products?.p_name || 'Unknown'
        const existing = productRevenueMap.get(productName) || { revenue: 0, quantity: 0 }
        productRevenueMap.set(productName, {
            revenue: existing.revenue + (Number(order.price) || 0),
            quantity: existing.quantity + (order.quantity || 0)
        })
    })
    const topProducts = Array.from(productRevenueMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6)

    // Process warehouse inventory values
    const warehouseValueMap = new Map<string, number>()
    warehouseData?.forEach((pw: any) => {
        const warehouseName = pw.warehouses?.w_name || 'Unknown'
        const value = (pw.stock || 0) * (Number(pw.products?.unit_price) || 0)
        warehouseValueMap.set(warehouseName, (warehouseValueMap.get(warehouseName) || 0) + value)
    })
    const topWarehouses = Array.from(warehouseValueMap.entries())
        .map(([name, value]) => ({ name, value, transactions: 0 }))
        .sort((a, b) => b.value - a.value)

    // Add transaction counts to warehouses
    const warehouseTransactionCount = new Map<string, number>()
    warehouseTransactions?.forEach((txn: any) => {
        const warehouseName = txn.warehouses?.w_name || 'Unknown'
        warehouseTransactionCount.set(warehouseName, (warehouseTransactionCount.get(warehouseName) || 0) + 1)
    })
    topWarehouses.forEach(wh => {
        wh.transactions = warehouseTransactionCount.get(wh.name) || 0
    })

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

    // Resolve Role for UI Filtering
    let userRole = 'warehouse_staff'
    const { data: emp } = await supabase.from('employees').select('role_id').eq('user_id', user.id).single()
    if (emp?.role_id) {
        const { data: roleRec } = await supabase.from('roles').select('role_name').eq('role_id', emp.role_id).single()
        if (roleRec?.role_name === 'Administrator') userRole = 'admin'
        else if (roleRec?.role_name === 'Warehouse Manager') userRole = 'manager'
        else if (roleRec?.role_name === 'Sales Representative') userRole = 'sales_representative'
        else if (roleRec?.role_name) userRole = roleRec.role_name.toLowerCase().replace(/ /g, '_')
    }

    return (
        <div className="space-y-4">
            <div className={`grid gap-4 md:grid-cols-2 ${userRole === 'sales_representative' ? 'lg:grid-cols-2' : 'lg:grid-cols-4'}`}>
                {userRole !== 'sales_representative' && (
                    <>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Revenue
                                </CardTitle>
                                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
                    </>
                )}

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
                        <div className="text-2xl font-bold">₹{totalInventoryValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-muted-foreground">
                            Total stock value
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Charts - Hidden for Sales Representatives */}
            {userRole !== 'sales_representative' && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <TopProductsChart data={topProducts} />
                    <TopWarehousesChart data={topWarehouses} />
                </div>
            )}

            {/* Secondary Charts */}
            {userRole !== 'sales_representative' && topProducts.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <ProductQuantityChart data={topProducts} />
                    <WarehouseTransactionsChart data={topWarehouses} />
                </div>
            )}

            <div className={`grid gap-4 ${userRole === 'sales_representative' ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-7'}`}>
                {userRole !== 'sales_representative' && (
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
                )}

                <Card className={userRole === 'sales_representative' ? 'col-span-1' : 'col-span-3'}>
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
                            {userRole !== 'sales_representative' && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Completed Orders</span>
                                        <span className="text-sm font-bold">{revenueData?.length || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Avg Order Value</span>
                                        <span className="text-sm font-bold">
                                            ₹{revenueData && revenueData.length > 0
                                                ? (totalRevenue / revenueData.length).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                : '0.00'}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
