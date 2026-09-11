import React, { useState } from "react"
import { 
  useGetProposalStrategy, 
  useUpdateProposalPhase, 
  getGetProposalStrategyQueryKey,
  ProposalPhase 
} from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, BookOpen, AlertTriangle, CheckCircle2, Clock, 
  DollarSign, Target, Briefcase, Zap, AlertCircle, FileText, Activity 
} from "lucide-react"

import { BaseCompanyProcess } from "@/components/strategy/base-company-process"

function formatCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function PhaseControlCard({ phase }: { phase: ProposalPhase }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const updatePhase = useUpdateProposalPhase()
  const [isUpdating, setIsUpdating] = useState(false)
  const [localProgress, setLocalProgress] = useState(phase.progress)

  React.useEffect(() => {
    setLocalProgress(phase.progress)
  }, [phase.progress])

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as ProposalPhase["status"]
    setIsUpdating(true)
    updatePhase.mutate(
      { id: phase.id, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProposalStrategyQueryKey() })
          toast({ title: "Phase status updated" })
        },
        onError: () => toast({ title: "Status update failed", variant: "destructive" }),
        onSettled: () => setIsUpdating(false)
      }
    )
  }

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalProgress(parseInt(e.target.value, 10))
  }

  const handleProgressCommit = () => {
    if (localProgress === phase.progress) return;
    setIsUpdating(true)
    updatePhase.mutate(
      { id: phase.id, data: { progress: localProgress } },
      {
        onSuccess: () => {
          queryClient.setQueryData(getGetProposalStrategyQueryKey(), (old: any) => {
            if (!old) return old;
            return {
              ...old,
              phases: old.phases.map((p: ProposalPhase) => 
                p.id === phase.id ? { ...p, progress: localProgress } : p
              )
            }
          })
          queryClient.invalidateQueries({ queryKey: getGetProposalStrategyQueryKey() })
          toast({ title: "Phase progress saved" })
        },
        onError: () => toast({ title: "Progress update failed", variant: "destructive" }),
        onSettled: () => setIsUpdating(false)
      }
    )
  }

  const statusColors = {
    not_started: "bg-muted text-muted-foreground border-muted-foreground/20",
    active: "bg-accent/10 text-accent border-accent/20",
    at_risk: "bg-destructive/10 text-destructive border-destructive/20",
    completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
  }

  return (
    <Card className={`relative overflow-hidden transition-all duration-200 border-l-4 ${
      phase.status === 'active' ? 'border-l-accent shadow-md' : 
      phase.status === 'completed' ? 'border-l-emerald-500' :
      phase.status === 'at_risk' ? 'border-l-destructive' : 'border-l-muted-foreground/30'
    }`}>
      {isUpdating && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary h-6 w-6" />
        </div>
      )}
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">{phase.window}</div>
                <h4 className="text-xl font-bold">{phase.name}</h4>
              </div>
              <Badge variant="outline" className={statusColors[phase.status] || statusColors.not_started}>
                {phase.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            
            <p className="text-foreground/80 leading-relaxed text-sm">
              {phase.objective}
            </p>
            
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="bg-muted/40 rounded-md px-3 py-1.5 border flex items-center gap-2">
                <DollarSign size={14} className="text-muted-foreground" />
                <span className="font-mono text-sm font-medium">{phase.budgetUf.toLocaleString()} UF</span>
              </div>
              {phase.deadline && (
                <div className="bg-muted/40 rounded-md px-3 py-1.5 border flex items-center gap-2">
                  <Clock size={14} className={phase.status === 'at_risk' ? "text-destructive" : "text-muted-foreground"} />
                  <span className={`font-mono text-sm font-medium ${phase.status === 'at_risk' ? "text-destructive" : ""}`}>
                    Deadline: {new Date(phase.deadline).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="lg:w-72 bg-muted/30 p-5 rounded-xl border flex flex-col justify-center space-y-5">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</label>
              </div>
              <select 
                value={phase.status} 
                onChange={handleStatusChange}
                disabled={isUpdating}
                className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="not_started">Not Started</option>
                <option value="active">Active</option>
                <option value="at_risk">At Risk</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Progress</label>
                <span className="font-mono font-bold text-primary text-sm">{localProgress}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="5"
                value={localProgress}
                onChange={handleProgressChange}
                disabled={isUpdating}
                style={{ accentColor: "hsl(var(--primary))" }}
                className="w-full h-2 bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Button
                type="button"
                size="sm"
                className="mt-3 w-full"
                onClick={handleProgressCommit}
                disabled={isUpdating || localProgress === phase.progress}
              >
                Save progress
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Strategy() {
  const { data: proposal, isLoading: proposalLoading, error: proposalError } = useGetProposalStrategy()
  
  if (proposalLoading) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground space-y-4">
        <Loader2 className="animate-spin h-8 w-8 text-primary" /> 
        <p className="font-mono text-sm uppercase tracking-widest">Loading ÓRBITA Strategy...</p>
      </div>
    )
  }

  if (proposalError || !proposal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-destructive space-y-4 bg-destructive/5 rounded-xl border border-destructive/20 p-8">
        <AlertTriangle className="h-10 w-10" />
        <p className="font-medium text-lg">Failed to load proposal strategy.</p>
        <p className="text-sm opacity-80">Verify API connection or contact operations.</p>
      </div>
    )
  }

  const totalBudget = proposal.phases.reduce((acc, p) => acc + p.budgetUf, 0)
  const averageProgress = proposal.phases.length 
    ? Math.round(proposal.phases.reduce((acc, p) => acc + p.progress, 0) / proposal.phases.length)
    : 0

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              {proposal.projectName}
            </Badge>
            <Badge variant="outline" className="font-mono bg-muted/50 text-muted-foreground border-muted hover:bg-muted/50">
              Prepared: {proposal.preparedAt}
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            ÓRBITA Program Control
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm md:text-base leading-relaxed">
            Source-backed execution surface for <span className="font-semibold text-foreground">{proposal.client}</span> in partnership with <span className="font-semibold text-foreground">{proposal.provider}</span>.
          </p>
        </div>
        <div className="flex flex-col gap-1 md:text-right bg-destructive/5 border border-destructive/20 rounded-xl p-4 md:p-3 min-w-[200px]">
          <div className="text-xs font-bold text-destructive/80 uppercase tracking-widest">Regulatory Deadline</div>
          <div className="text-xl font-bold font-mono text-destructive flex items-center md:justify-end gap-2 mt-1">
            <Clock size={18} /> {formatCalendarDate(proposal.regulatoryDeadline)}
          </div>
        </div>
      </div>

      {/* Operating Principle & Alignment */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 bg-primary text-primary-foreground border-primary shadow-lg overflow-hidden relative">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <CardHeader className="pb-4 relative z-10">
            <CardTitle className="text-xl text-primary-foreground/90 font-bold flex items-center gap-2">
              <Zap className="text-accent" size={20} /> Operating Principle
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-2xl leading-snug font-medium mb-8">
              "{proposal.operatingPrinciple}"
            </p>
            <div className="flex items-center gap-2 text-xs font-mono tracking-wide text-primary-foreground/70 bg-black/20 w-fit px-3 py-2 rounded-md border border-white/10">
              <FileText size={14} /> SOURCE: {proposal.sourceDocument}
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-amber-500/10">
            <CardTitle className="text-sm uppercase tracking-widest font-bold flex items-center gap-2 text-amber-700 dark:text-amber-500">
              <AlertCircle size={16} /> Timeline Alignment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex flex-col">
            <p className="text-sm text-foreground/80 leading-relaxed font-medium">
              {proposal.timelineAlignmentNote}
            </p>
            <div className="mt-auto pt-6 grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Investment</div>
                <div className="text-lg font-bold font-mono text-foreground">{totalBudget.toLocaleString()} UF</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Program Progress</div>
                <div className="text-lg font-bold font-mono text-foreground">{averageProgress}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Base Company Process */}
      <div className="pt-2 pb-4">
        <BaseCompanyProcess />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Strategic Goals */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 pb-2 border-b">
            <Target size={18} className="text-primary" /> Strategic Goals
          </h3>
          <div className="grid gap-4">
            {proposal.goals.map(goal => (
              <Card key={goal.id} className="bg-card shadow-sm">
                <CardContent className="p-5">
                  <h4 className="font-bold text-foreground text-lg mb-2">{goal.title}</h4>
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{goal.description}</p>
                  <div className="bg-emerald-500/5 rounded-md p-3 border border-emerald-500/20 flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400/80 mb-1">Success Signal</div>
                      <div className="text-sm font-medium text-emerald-900 dark:text-emerald-100">{goal.successSignal}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Agents */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 pb-2 border-b">
            <Briefcase size={18} className="text-primary" /> Proposed Agents
          </h3>
          <div className="grid gap-4">
            {proposal.agents.map(agent => (
              <Card key={agent.id} className="bg-card shadow-sm hover:border-primary/30 transition-colors group">
                <CardContent className="p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <BookOpen size={20} className="text-primary group-hover:text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-foreground text-lg">{agent.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{agent.mission}</p>
                  </div>
                  <div className="sm:w-1/3 bg-accent/10 border border-accent/30 rounded-md p-3 text-sm text-foreground font-medium flex items-center justify-center text-center">
                    {agent.impact}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Phase Timeline & Progress Controls */}
      <div className="pt-6">
        <h3 className="text-lg font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-6">
          <Activity size={18} className="text-primary" /> Execution Phasing & Control
        </h3>
        <div className="space-y-4">
          {proposal.phases.map(phase => (
            <PhaseControlCard key={phase.id} phase={phase} />
          ))}
        </div>
      </div>
    </div>
  )
}
