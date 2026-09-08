import { useState } from "react"
import { useGetOpportunities, useCreateOpportunity, useUpdateOpportunity, getGetOpportunitiesQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Lightbulb, Plus, Loader2, ArrowRight, ShieldAlert, CheckCircle2, TrendingUp, Filter } from "lucide-react"
import { Opportunity, OpportunityStatus, OpportunityPriority, OpportunityUpdateStatus } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"

export default function Opportunities() {
  const { data: opportunities, isLoading } = useGetOpportunities()
  const [filter, setFilter] = useState<OpportunityStatus | "all">("all")

  const filteredOps = opportunities?.filter(o => filter === "all" || o.status === filter).sort((a, b) => b.score - a.score) || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Lightbulb className="text-accent" /> Opportunities
          </h1>
          <p className="text-muted-foreground mt-1">Candidate workflows identified for agentic automation.</p>
        </div>
        <CreateOpportunityDialog />
      </div>

      <div className="flex gap-2 overflow-x-auto border-b pb-4">
        <Button variant={filter === "all" ? "default" : "ghost"} size="sm" onClick={() => setFilter("all")}>All</Button>
        <Button variant={filter === "shortlist" ? "default" : "ghost"} size="sm" onClick={() => setFilter("shortlist")}>Shortlist</Button>
        <Button variant={filter === "validate" ? "default" : "ghost"} size="sm" onClick={() => setFilter("validate")}>Validation</Button>
        <Button variant={filter === "pilot" ? "default" : "ghost"} size="sm" onClick={() => setFilter("pilot")}>Pilot Ready</Button>
        <Button variant={filter === "parked" ? "default" : "ghost"} size="sm" onClick={() => setFilter("parked")}>Parked</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12 text-muted-foreground">
          <Loader2 className="animate-spin h-6 w-6 mr-2" /> Loading opportunities...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredOps.map(op => (
            <OpportunityCard key={op.id} opportunity={op} />
          ))}
          {filteredOps.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
              No opportunities found in this status.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OpportunityCard({ opportunity: op }: { opportunity: Opportunity }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const updateOp = useUpdateOpportunity({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetOpportunitiesQueryKey() })
        toast({ title: "Status updated" })
      }
    }
  })

  const getPriorityColor = (p: string) => {
    if (p === 'high') return 'text-destructive bg-destructive/10'
    if (p === 'medium') return 'text-accent bg-accent/10'
    return 'text-muted-foreground bg-muted'
  }

  const handleAdvance = () => {
    let nextStatus: OpportunityUpdateStatus | null = null
    if (op.status === 'shortlist') nextStatus = 'validate'
    else if (op.status === 'validate') nextStatus = 'pilot'
    
    if (nextStatus) {
      updateOp.mutate({ id: op.id, data: { status: nextStatus } })
    }
  }

  return (
    <Card className="flex flex-col relative overflow-hidden group">
      <div className={`absolute top-0 left-0 w-1.5 h-full ${op.status === 'pilot' ? 'bg-success' : op.priority === 'high' ? 'bg-accent' : 'bg-muted'}`} />
      
      <CardHeader className="pb-3 pl-6">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="mb-2 font-mono uppercase text-[10px] tracking-wider bg-background">{op.area}</Badge>
          <Badge className={`uppercase text-[10px] font-bold ${getPriorityColor(op.priority)}`} variant="outline">
            {op.priority}
          </Badge>
        </div>
        <CardTitle className="text-xl leading-tight group-hover:text-primary transition-colors">{op.name}</CardTitle>
      </CardHeader>
      
      <CardContent className="pb-4 pl-6 flex-1">
        <p className="text-sm text-foreground/80 line-clamp-3 mb-4">
          {op.description}
        </p>
        
        <div className="grid grid-cols-3 gap-3 pt-4 border-t">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Impact</span>
            <div className="flex items-center gap-1 font-mono text-sm mt-1">
              <TrendingUp size={14} className="text-emerald-500" /> {op.impact}/10
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Feasibility</span>
            <div className="flex items-center gap-1 font-mono text-sm mt-1">
              <CheckCircle2 size={14} className="text-blue-500" /> {op.feasibility}/10
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Risk</span>
            <div className="flex items-center gap-1 font-mono text-sm mt-1">
              <ShieldAlert size={14} className="text-amber-500" /> {op.risk}/10
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pl-6 pt-0 flex items-center justify-between border-t bg-muted/10 p-4">
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono">
            <span className="text-muted-foreground">Score:</span> 
            <strong className="ml-1 text-base">{op.score}</strong>
          </div>
          <div className="text-xs font-mono">
            <span className="text-muted-foreground">Evidence:</span> 
            <strong className="ml-1">{op.sourceCount}</strong>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {op.status !== 'pilot' && op.status !== 'parked' && (
            <Button size="sm" variant="accent" onClick={handleAdvance} disabled={updateOp.isPending}>
              Advance <ArrowRight size={14} className="ml-1" />
            </Button>
          )}
          {op.status === 'pilot' && (
            <Badge variant="success" className="px-3 py-1">Ready for Pilot</Badge>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}

function CreateOpportunityDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const createOp = useCreateOpportunity({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetOpportunitiesQueryKey() })
        setOpen(false)
        toast({ title: "Opportunity drafted" })
      }
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createOp.mutate({
      data: {
        name: formData.get("name") as string,
        area: formData.get("area") as string,
        description: formData.get("description") as string,
        owner: formData.get("owner") as string,
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default"><Plus size={16} className="mr-2" /> Draft Opportunity</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Draft New Opportunity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Opportunity Name</Label>
            <Input id="name" name="name" required placeholder="e.g. Automated Dispatch Routing" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area">Operational Area</Label>
              <Input id="area" name="area" required placeholder="e.g. Logistics" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">Proposed Owner</Label>
              <Input id="owner" name="owner" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description & Hypothesis</Label>
            <Textarea id="description" name="description" rows={4} required placeholder="Describe the workflow and expected AI impact..." />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createOp.isPending}>
              {createOp.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
