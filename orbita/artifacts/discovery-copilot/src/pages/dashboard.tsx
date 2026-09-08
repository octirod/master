import { Link } from "wouter"
import { useGetDashboard, useGetActivity, useGetProposalStrategy, ActivityKind } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Fingerprint, Lightbulb, Activity as ActivityIcon, Clock, ArrowUpRight, TrendingUp, AlertTriangle, Briefcase, Calendar } from "lucide-react"

export default function Dashboard() {
  const { data: dashboard, isLoading: dashboardLoading } = useGetDashboard()
  const { data: activity, isLoading: activityLoading } = useGetActivity()
  const { data: proposal, isLoading: proposalLoading } = useGetProposalStrategy()

  if (dashboardLoading || activityLoading || proposalLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-xl"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2 h-96 bg-muted rounded-xl"></div>
          <div className="h-96 bg-muted rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (!dashboard || !proposal) return <div>Failed to load dashboard data</div>

  const isNearingDeadline = dashboard.daysRemaining < 30;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold uppercase tracking-widest mb-3">
            <Briefcase size={14} /> ÓRBITA Program
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-2xl leading-relaxed">
            {proposal.operatingPrinciple}
          </p>
        </div>
        
        <div className={`px-4 py-3 rounded-xl border min-w-[200px] ${isNearingDeadline ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-muted/30 border-muted text-foreground'}`}>
          <div className={`text-xs font-bold uppercase tracking-widest opacity-80 mb-1 ${isNearingDeadline ? 'text-destructive' : 'text-muted-foreground'}`}>
            Regulatory Deadline
          </div>
          <div className="text-2xl font-mono font-bold flex items-center gap-2">
            <Clock size={20} /> {new Date(proposal.regulatoryDeadline).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Discovery Sessions" 
          value={`${dashboard.sessionsCompleted} / ${dashboard.sessionsTotal}`}
          icon={Users}
          trend={`${dashboard.sessionsTotal - dashboard.sessionsCompleted} remaining in Modo Sombra`}
          href="/sessions"
        />
        <MetricCard 
          title="Evidence Logged" 
          value={dashboard.evidenceItems}
          icon={Fingerprint}
          trend="Captured operational facts"
          href="/evidence"
        />
        <MetricCard 
          title="Agent Opportunities" 
          value={dashboard.opportunities}
          icon={Lightbulb}
          trend={`${dashboard.highPriority} high priority for Pilot`}
          href="/opportunities"
        />
        <MetricCard 
          title="Discovery Progress" 
          value={`${dashboard.progress}%`}
          icon={TrendingUp}
          trend="Overall confidence score"
          highlight
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 flex flex-col border-primary/10 shadow-sm">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Fleet Context & Modo Sombra</CardTitle>
                <CardDescription>Current operational metrics during Discovery</CardDescription>
              </div>
              <div className="px-3 py-1 bg-accent/10 text-accent border border-accent/20 rounded-full text-xs font-bold uppercase tracking-wider">
                Phase: {dashboard.phase}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-6 flex flex-col justify-center">
            <div className="grid grid-cols-2 gap-8 border-b border-border/50 pb-8 mb-8">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Network Fleet Size</div>
                <div className="text-5xl font-light tracking-tight font-mono text-foreground">{dashboard.fleetSize.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground mt-2">Active vehicles in Modo Sombra scope</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Monthly Trips</div>
                <div className="text-5xl font-light tracking-tight font-mono text-foreground">{(dashboard.monthlyTrips / 1000).toFixed(1)}k</div>
                <div className="text-sm text-muted-foreground mt-2">Average operation volume mapped</div>
              </div>
            </div>
            
            <div className={`rounded-xl p-6 border ${isNearingDeadline ? 'bg-destructive/5 border-destructive/20' : 'bg-primary/5 border-primary/10'}`}>
              <h4 className={`font-bold mb-3 flex items-center gap-2 ${isNearingDeadline ? 'text-destructive' : 'text-primary'}`}>
                {isNearingDeadline ? <AlertTriangle size={18} /> : <Calendar size={18} />}
                Critical Timeline Alert
              </h4>
              <p className="text-sm text-foreground/80 leading-relaxed mb-5">
                The discovery team must validate 3 high-priority agent opportunities within {dashboard.daysRemaining} days. {proposal.timelineAlignmentNote}
              </p>
              <Link href="/strategy">
                <div className={`inline-flex items-center gap-1.5 text-sm font-bold transition-colors ${isNearingDeadline ? 'text-destructive hover:text-destructive/80' : 'text-accent hover:text-accent/80'}`}>
                  Open ÓRBITA Strategy Control <ArrowUpRight size={16} />
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <ActivityIcon size={18} className="text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[460px] overflow-y-auto scrollbar-thin">
              {activity?.map((act) => (
                <div key={act.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex gap-3">
                    <div className="mt-1 shrink-0">
                      <ActivityKindIcon kind={act.kind} />
                    </div>
                    <div>
                      <p className="text-sm text-foreground/90 font-medium leading-snug">{act.text}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1.5">
                        {act.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {!activity?.length && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No recent activity logged in Modo Sombra.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ title, value, icon: Icon, trend, highlight, href }: any) {
  const content = (
    <Card className={`relative overflow-hidden transition-all duration-200 h-full ${href ? 'hover:shadow-md hover:border-primary/30 cursor-pointer hover:-translate-y-0.5' : ''} ${highlight ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card'}`}>
      <CardContent className="p-5 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className={`text-xs font-bold uppercase tracking-widest ${highlight ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{title}</div>
          <Icon size={18} className={highlight ? 'text-accent' : 'text-muted-foreground'} />
        </div>
        <div className="text-3xl font-bold font-mono tracking-tight mt-auto">{value}</div>
        <div className={`text-xs mt-3 font-medium ${highlight ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{trend}</div>
      </CardContent>
      {highlight && (
        <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
          <Icon size={120} />
        </div>
      )}
    </Card>
  )

  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>
  }
  return content
}

function ActivityKindIcon({ kind }: { kind: ActivityKind }) {
  switch (kind) {
    case 'session': return <Users size={16} className="text-blue-500" />
    case 'evidence': return <Fingerprint size={16} className="text-emerald-500" />
    case 'opportunity': return <Lightbulb size={16} className="text-amber-500" />
    case 'system': return <ActivityIcon size={16} className="text-muted-foreground" />
    default: return <ActivityIcon size={16} className="text-muted-foreground" />
  }
}
