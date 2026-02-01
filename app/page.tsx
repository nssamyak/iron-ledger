import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { GalleryVerticalEnd, ArrowRight, BarChart3, MessageSquare, ShieldCheck } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Link className="flex items-center justify-center font-bold" href="#">
          <GalleryVerticalEnd className="h-6 w-6 mr-2" />
          IronLedger
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
            Features
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
            Pricing
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
            About
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
            Contact
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-dot-white/[0.2] relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-background to-secondary/20 z-0" />
          <div className="container relative z-10 px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                  Talk to your Inventory.
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-400 md:text-xl">
                  Next-generation inventory management powered by Natural Language Processing. Just ask, and we'll handle the SQL.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/login">
                  <Button size="lg" className="h-12 px-8">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#">
                  <Button variant="outline" size="lg" className="h-12 px-8">
                    Read Documentation
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 border-t">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3">
              <div className="flex flex-col items-center space-y-2 border-gray-800 p-4 rounded-lg">
                <div className="p-2 bg-gray-800 rounded-full">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl font-bold">NLP Interface</h2>
                <p className="text-sm text-gray-400 text-center">
                  Complex queries made simple. "Show me all products with low stock in Warehouse A".
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border-gray-800 p-4 rounded-lg">
                <div className="p-2 bg-gray-800 rounded-full">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl font-bold">Real-time Analytics</h2>
                <p className="text-sm text-gray-400 text-center">
                  Live dashboards tailored to your role. Monitor flow, assets, and performance.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border-gray-800 p-4 rounded-lg">
                <div className="p-2 bg-gray-800 rounded-full">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl font-bold">Role-Based Security</h2>
                <p className="text-sm text-gray-400 text-center">
                  Granular access control. Everyone sees exactly what they need to see.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-400">© 2024 IronLedger Inc. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4 text-gray-400" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4 text-gray-400" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
