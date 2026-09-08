import { useState } from "react"
import { Link, useLocation } from "wouter"
import { LayoutDashboard, Users, Fingerprint, Lightbulb, Map, Activity as ActivityIcon, Network, Menu, ShieldCheck } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const navigation = [
  { name: "Command Center", href: "/", icon: LayoutDashboard },
  { name: "Sessions", href: "/sessions", icon: Users },
  { name: "Power Map", href: "/stakeholders", icon: Network },
  { name: "Evidence Log", href: "/evidence", icon: Fingerprint },
  { name: "Opportunities", href: "/opportunities", icon: Lightbulb },
  { name: "Strategy & Roadmap", href: "/strategy", icon: Map },
]

export function Layout({ children, signOut, isAdministrator = false }: { children: React.ReactNode; signOut?: React.ReactNode; isAdministrator?: boolean }) {
  const [location] = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const visibleNavigation = isAdministrator
    ? [...navigation, { name: "User access", href: "/users", icon: ShieldCheck }]
    : navigation

  return (
    <div className="flex min-h-[100dvh] w-full bg-background">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border gap-3">
          <div className="h-8 w-8 rounded bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
            <ActivityIcon size={18} strokeWidth={2.5} />
          </div>
          <div className="font-semibold text-sm tracking-tight leading-tight">
            Transport Discovery<br/>
            <span className="text-sidebar-foreground/60 text-xs font-normal">Copilot</span>
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-1">
          <div className="text-xs font-mono font-medium text-sidebar-foreground/40 px-2 pb-2 uppercase tracking-wider">Operations</div>
          {visibleNavigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
            return (
              <Link key={item.name} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}>
                  <item.icon size={18} className={isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"} />
                  {item.name}
                </div>
              </Link>
            )
          })}
        </div>
        
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent border border-sidebar-border flex items-center justify-center text-xs font-medium">
              OP
            </div>
             <div className="text-xs">
               <div className="font-medium">Signed-in team member</div>
               <div className="text-sidebar-foreground/50">ÓRBITA workspace</div>
            </div>
             {signOut}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 md:hidden">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-primary flex items-center justify-center text-primary-foreground">
              <ActivityIcon size={15} strokeWidth={2.5} />
            </div>
            <div className="font-semibold text-sm">Transport Discovery Copilot</div>
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-foreground"
                aria-label="Open navigation"
              >
                <Menu size={19} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[82vw] max-w-sm p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
              <SheetHeader className="h-16 px-5 flex-row items-center gap-3 border-b border-sidebar-border space-y-0">
                <div className="h-8 w-8 rounded bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
                  <ActivityIcon size={18} strokeWidth={2.5} />
                </div>
                <SheetTitle className="text-left text-sidebar-foreground">ÓRBITA Copilot</SheetTitle>
              </SheetHeader>
              <nav className="p-4 space-y-1">
                <div className="text-xs font-mono font-medium text-sidebar-foreground/40 px-2 pb-2 uppercase tracking-wider">Operations</div>
                {visibleNavigation.map((item) => {
                  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
                  return (
                    <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                      <div className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`}>
                        <item.icon size={18} className={isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"} />
                        {item.name}
                      </div>
                    </Link>
                  )
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
