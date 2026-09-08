import { useState, useMemo } from "react"
import { useGetStakeholders, useCreateStakeholder, useUpdateStakeholder, getGetStakeholdersQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Network, Plus, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Stakeholder, StakeholderInputStance, StakeholderInputConfidence } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"

export default function Stakeholders() {
  const { data: stakeholders, isLoading } = useGetStakeholders()
  const [searchTerm, setSearchTerm] = useState("")
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!stakeholders) return []
    const term = searchTerm.toLowerCase()
    return stakeholders.filter(s => 
      s.name.toLowerCase().includes(term) ||
      s.organization.toLowerCase().includes(term) ||
      s.role.toLowerCase().includes(term)
    )
  }, [stakeholders, searchTerm])

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Network className="text-primary" /> Power Map
          </h1>
          <p className="text-muted-foreground mt-1">Map stakeholder influence, interest, and political stance.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} className="mr-2" /> Add Stakeholder
        </Button>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <Loader2 className="animate-spin h-6 w-6 mr-2" /> Loading power map...
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PowerMap stakeholders={stakeholders || []} onEdit={setEditingStakeholder} />
            </div>
            <div>
              <LegendCard />
            </div>
          </div>

          <Card>
            <CardHeader className="p-4 border-b bg-muted/10 flex flex-row items-center justify-between">
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search stakeholders..." 
                  className="pl-9 bg-background"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <StakeholdersTable stakeholders={filtered} onEdit={setEditingStakeholder} />
            </CardContent>
          </Card>
        </>
      )}

      <CreateStakeholderDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      {editingStakeholder && (
        <EditStakeholderDialog 
          stakeholder={editingStakeholder} 
          open={!!editingStakeholder} 
          onOpenChange={(o) => !o && setEditingStakeholder(null)} 
        />
      )}
    </div>
  )
}

function PowerMap({ stakeholders, onEdit }: { stakeholders: Stakeholder[], onEdit: (s: Stakeholder) => void }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Influence Matrix</span>
          <span className="text-xs font-normal text-muted-foreground">Power vs Interest</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-square md:aspect-auto md:h-[420px] w-full flex overflow-hidden">
          <div className="flex flex-col items-center justify-center w-8 md:w-12 shrink-0 border-r border-border/40 mr-1 md:mr-2">
             <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest -rotate-90 whitespace-nowrap">Power (Influence)</span>
          </div>

          <div className="flex-1 flex flex-col relative min-w-0">
            <div className="flex-1 relative border rounded-md bg-muted/10">
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none z-0">
                <div className="border-r border-b border-border/30 bg-blue-500/5 flex items-center justify-center p-2 text-center">
                  <span className="text-blue-600/20 dark:text-blue-400/10 font-black uppercase tracking-widest text-lg md:text-2xl leading-none">Keep Satisfied</span>
                </div>
                <div className="border-b border-border/30 bg-emerald-500/5 flex items-center justify-center p-2 text-center">
                  <span className="text-emerald-600/20 dark:text-emerald-400/10 font-black uppercase tracking-widest text-lg md:text-2xl leading-none">Manage Closely</span>
                </div>
                <div className="border-r border-border/30 bg-slate-500/5 flex items-center justify-center p-2 text-center">
                  <span className="text-slate-600/20 dark:text-slate-400/10 font-black uppercase tracking-widest text-lg md:text-2xl leading-none">Monitor</span>
                </div>
                <div className="bg-amber-500/5 flex items-center justify-center p-2 text-center">
                  <span className="text-amber-600/20 dark:text-amber-400/10 font-black uppercase tracking-widest text-lg md:text-2xl leading-none">Keep Informed</span>
                </div>
              </div>

              <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 z-10">
                {Array.from({ length: 25 }).map((_, i) => {
                  const row = Math.floor(i / 5) + 1;
                  const col = (i % 5) + 1;
                  const power = 6 - row;
                  const interest = col;
                  const cellStakeholders = stakeholders.filter(s => s.power === power && s.interest === interest);
                  
                  return (
                    <div 
                      key={i} 
                      className="border-[0.5px] border-border/20 p-1 flex flex-col gap-1 content-start hover:bg-card/50 transition-colors group relative overflow-y-auto scrollbar-none"
                    >
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] text-muted-foreground/30 opacity-0 group-hover:opacity-100 font-mono pointer-events-none">
                        {power},{interest}
                      </span>
                      {cellStakeholders.map(s => (
                        <StakeholderChip key={s.id} stakeholder={s} onClick={() => onEdit(s)} />
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="flex items-center justify-center h-8 md:h-10 shrink-0 border-t border-border/40 mt-1 md:mt-2">
              <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Interest (Alignment)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StakeholderChip({ stakeholder, onClick }: { stakeholder: Stakeholder, onClick: () => void }) {
  const stanceStyles = {
    champion: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    supportive: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    neutral: 'bg-slate-100 text-slate-800 dark:bg-slate-900/60 dark:text-slate-300 border-slate-300 dark:border-slate-800',
    cautious: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    resistant: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800',
  }

  const confidenceStyles = {
    confirmed: 'border-solid shadow-sm',
    working_hypothesis: 'border-dashed border-[1.5px] border-opacity-70 shadow-none',
    needs_validation: 'border-dotted border-2 border-opacity-50 shadow-none opacity-80',
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button 
          onClick={onClick}
          className={cn(
            "text-[10px] md:text-xs font-semibold px-1.5 py-0.5 rounded-sm block truncate w-full text-left transition-transform hover:scale-[1.03] hover:z-20 cursor-pointer border",
            stanceStyles[stakeholder.stance],
            confidenceStyles[stakeholder.confidence]
          )}
        >
          {stakeholder.name}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="flex flex-col gap-1 max-w-xs z-50 p-3">
        <div>
          <div className="font-bold text-sm leading-tight">{stakeholder.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{stakeholder.role} @ {stakeholder.organization}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Stance</div>
            <div className="text-xs capitalize font-medium">{stakeholder.stance}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Confidence</div>
            <div className="text-xs capitalize font-medium">{stakeholder.confidence.replace('_', ' ')}</div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function LegendCard() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm">Map Legend</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-6 text-sm">
        
        <div className="space-y-3">
          <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Stance</div>
          <div className="grid gap-2.5">
            {[
              { stance: 'champion', label: 'Champion', desc: 'Actively drives adoption', color: 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300' },
              { stance: 'supportive', label: 'Supportive', desc: 'In favor, will assist', color: 'bg-teal-100 border-teal-300 text-teal-800 dark:bg-teal-950/60 dark:border-teal-800 dark:text-teal-300' },
              { stance: 'neutral', label: 'Neutral', desc: 'No strong opinion', color: 'bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-300' },
              { stance: 'cautious', label: 'Cautious', desc: 'Has reservations', color: 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300' },
              { stance: 'resistant', label: 'Resistant', desc: 'Actively opposed', color: 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300' },
            ].map(l => (
              <div key={l.stance} className="flex items-start gap-3">
                <div className={cn("w-4 h-4 rounded-sm border shrink-0 mt-0.5", l.color)} />
                <div>
                  <div className="font-medium text-foreground leading-none">{l.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{l.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Confidence</div>
          <div className="grid gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 border-t-2 border-solid border-foreground shrink-0" />
              <span className="text-xs font-medium text-foreground">Confirmed</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 border-t-[1.5px] border-dashed border-foreground opacity-70 shrink-0" />
              <span className="text-xs font-medium text-foreground">Working Hypothesis</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 border-t-[2px] border-dotted border-foreground opacity-50 shrink-0" />
              <span className="text-xs font-medium text-foreground">Needs Validation</span>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}

function StakeholdersTable({ stakeholders, onEdit }: { stakeholders: Stakeholder[], onEdit: (s: Stakeholder) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableHead className="w-[30%]">Name & Role</TableHead>
          <TableHead className="w-[20%]">Organization</TableHead>
          <TableHead className="w-16 text-center">Power</TableHead>
          <TableHead className="w-16 text-center">Interest</TableHead>
          <TableHead className="w-[15%]">Stance</TableHead>
          <TableHead className="w-[15%]">Confidence</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stakeholders.map((s) => (
          <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onEdit(s)}>
            <TableCell>
              <div className="font-semibold text-foreground">{s.name}</div>
              <div className="text-xs text-muted-foreground truncate max-w-[200px]">{s.role}</div>
            </TableCell>
            <TableCell>
              <span className="text-sm">{s.organization}</span>
            </TableCell>
            <TableCell className="text-center font-mono text-sm">{s.power}/5</TableCell>
            <TableCell className="text-center font-mono text-sm">{s.interest}/5</TableCell>
            <TableCell>
              <span className={cn(
                "text-xs px-2 py-1 rounded-sm capitalize border font-medium",
                s.stance === 'champion' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400' :
                s.stance === 'supportive' ? 'bg-teal-500/10 text-teal-700 border-teal-500/20 dark:text-teal-400' :
                s.stance === 'neutral' ? 'bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-400' :
                s.stance === 'cautious' ? 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400' :
                'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400'
              )}>
                {s.stance}
              </span>
            </TableCell>
            <TableCell>
              <span className="text-[11px] font-medium bg-muted px-2 py-1 rounded capitalize border">
                {s.confidence.replace('_', ' ')}
              </span>
            </TableCell>
          </TableRow>
        ))}
        {stakeholders.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
              No stakeholders found matching your criteria.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

function CreateStakeholderDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const createStakeholder = useCreateStakeholder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetStakeholdersQueryKey() })
        onOpenChange(false)
        toast({ title: "Stakeholder added to power map" })
      },
      onError: () => {
        toast({ title: "Failed to add stakeholder", variant: "destructive" })
      }
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add Stakeholder to Power Map</DialogTitle>
        </DialogHeader>
        <StakeholderForm 
          isPending={createStakeholder.isPending}
          onSubmit={(data) => createStakeholder.mutate({ data })}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function EditStakeholderDialog({ stakeholder, open, onOpenChange }: { stakeholder: Stakeholder, open: boolean, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const updateStakeholder = useUpdateStakeholder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetStakeholdersQueryKey() })
        onOpenChange(false)
        toast({ title: "Stakeholder details updated" })
      },
      onError: () => {
        toast({ title: "Failed to update stakeholder", variant: "destructive" })
      }
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Stakeholder</DialogTitle>
        </DialogHeader>
        <StakeholderForm 
          initialValues={stakeholder}
          isPending={updateStakeholder.isPending}
          onSubmit={(data) => updateStakeholder.mutate({ id: stakeholder.id, data })}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

type FormValues = {
  name: string;
  organization: string;
  role: string;
  keyPoints: string;
  power: number;
  interest: number;
  stance: StakeholderInputStance;
  confidence: StakeholderInputConfidence;
}

function StakeholderForm({ 
  initialValues, 
  onSubmit, 
  isPending, 
  onCancel 
}: { 
  initialValues?: Partial<FormValues>, 
  onSubmit: (data: FormValues) => void, 
  isPending: boolean, 
  onCancel: () => void 
}) {
  const [values, setValues] = useState<FormValues>({
    name: initialValues?.name || "",
    organization: initialValues?.organization || "",
    role: initialValues?.role || "",
    keyPoints: initialValues?.keyPoints || "",
    power: initialValues?.power || 3,
    interest: initialValues?.interest || 3,
    stance: initialValues?.stance || 'neutral',
    confidence: initialValues?.confidence || 'needs_validation',
  })

  const update = (key: keyof FormValues, val: any) => setValues(prev => ({ ...prev, [key]: val }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(values); }} className="space-y-6 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" value={values.name} onChange={e => update('name', e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="organization">Organization / Dept</Label>
          <Input id="organization" value={values.organization} onChange={e => update('organization', e.target.value)} required />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="role">Role / Title</Label>
        <Input id="role" value={values.role} onChange={e => update('role', e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-8 py-2">
        <RatingSelector 
          label="Power (Influence)" 
          description="1 = Low, 5 = High" 
          value={values.power} 
          onChange={v => update('power', v)} 
        />
        <RatingSelector 
          label="Interest (Alignment)" 
          description="1 = Low, 5 = High" 
          value={values.interest} 
          onChange={v => update('interest', v)} 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Political Stance</Label>
          <Select value={values.stance} onValueChange={v => update('stance', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="champion">Champion</SelectItem>
              <SelectItem value="supportive">Supportive</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="cautious">Cautious</SelectItem>
              <SelectItem value="resistant">Resistant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Assessment Confidence</Label>
          <Select value={values.confidence} onValueChange={v => update('confidence', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="working_hypothesis">Working Hypothesis</SelectItem>
              <SelectItem value="needs_validation">Needs Validation</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="keyPoints">Key Motivations & Context</Label>
        <Textarea 
          id="keyPoints" 
          className="min-h-[100px] resize-none text-sm" 
          placeholder="What are their main drivers? What do they care about most? Any historical baggage?"
          value={values.keyPoints} 
          onChange={e => update('keyPoints', e.target.value)} 
        />
      </div>

      <DialogFooter className="pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Stakeholder
        </Button>
      </DialogFooter>
    </form>
  )
}

function RatingSelector({ value, onChange, label, description }: { value: number, onChange: (v: number) => void, label: string, description?: string }) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "h-10 flex-1 border rounded font-mono text-sm font-semibold transition-all",
              value === v 
                ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]" 
                : "bg-card text-foreground hover:bg-muted"
            )}
          >
            {v}
          </button>
        ))}
      </div>
      {description && <div className="text-[10.5px] text-muted-foreground font-medium">{description}</div>}
    </div>
  )
}
