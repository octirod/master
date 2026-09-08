import { useState } from "react"
import { useGetSessions, useCreateSession, useUpdateSession, getGetSessionsQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Plus, Users, Search, Calendar, FileText, CheckCircle2, PlayCircle, Loader2, Fingerprint, ClipboardCheck, HelpCircle, ListChecks } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { DiscoverySession, SessionUpdateStatus } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"

export default function Sessions() {
  const { data: sessions, isLoading } = useGetSessions()
  const [searchTerm, setSearchTerm] = useState("")

  const filteredSessions = sessions?.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.stakeholder.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="text-primary" /> Sessions
          </h1>
          <p className="text-muted-foreground mt-1">Manage stakeholder discovery interviews and working groups.</p>
        </div>
        <CreateSessionDialog />
      </div>

      <Card>
        <CardHeader className="p-4 border-b bg-muted/10 flex flex-row items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search sessions..." 
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="animate-spin h-5 w-5" /> Loading sessions...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Session & Stakeholder</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
                {filteredSessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No sessions found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SessionRow({ session }: { session: DiscoverySession }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const updateSession = useUpdateSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey() })
        toast({ title: "Session updated" })
      }
    }
  })

  const handleStatusChange = (newStatus: SessionUpdateStatus) => {
    updateSession.mutate({ id: session.id, data: { status: newStatus } })
  }

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium text-foreground flex flex-wrap items-center gap-2">
          {session.title}
          {session.id === "ses-pdf-kickoff" && (
            <Badge variant="success" className="text-[10px]">
              Apple Notes reviewed
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-0.5">{session.stakeholder} • {session.role}</div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">{session.track}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm">
          <Calendar size={14} className="text-muted-foreground" />
          {formatDateTime(session.scheduledAt)}
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge status={session.status} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {session.status === 'planned' && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange('in_progress')} disabled={updateSession.isPending}>
              <PlayCircle size={14} className="mr-1" /> Start
            </Button>
          )}
          {session.status === 'in_progress' && (
            <Button size="sm" variant="accent" onClick={() => handleStatusChange('completed')} disabled={updateSession.isPending}>
              <CheckCircle2 size={14} className="mr-1" /> Complete
            </Button>
          )}
          <ViewSessionDialog session={session} />
        </div>
      </TableCell>
    </TableRow>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'planned': return <Badge variant="secondary">Planned</Badge>
    case 'in_progress': return <Badge variant="accent" className="animate-pulse">In Progress</Badge>
    case 'completed': return <Badge variant="success">Completed</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

function CreateSessionDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const createSession = useCreateSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey() })
        setOpen(false)
        toast({ title: "Session scheduled successfully" })
      }
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createSession.mutate({
      data: {
        title: formData.get("title") as string,
        stakeholder: formData.get("stakeholder") as string,
        role: formData.get("role") as string,
        track: formData.get("track") as string,
        scheduledAt: formData.get("scheduledAt") as string || new Date().toISOString()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus size={16} className="mr-2" /> Schedule Session</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule New Session</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Session Title</Label>
            <Input id="title" name="title" required placeholder="e.g. Driver Workflow Discovery" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stakeholder">Stakeholder Name</Label>
              <Input id="stakeholder" name="stakeholder" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" name="role" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="track">Discovery Track</Label>
              <Select name="track" defaultValue="Operations">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Safety">Safety</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Date & Time</Label>
              <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createSession.isPending}>
              {createSession.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ViewSessionDialog({ session }: { session: DiscoverySession }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary"><FileText size={14} className="mr-1" /> View</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl">{session.title}</DialogTitle>
            <StatusBadge status={session.status} />
          </div>
          <div className="text-sm text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-2">
            <div><strong className="text-foreground">Stakeholder:</strong> {session.stakeholder} ({session.role})</div>
            <div><strong className="text-foreground">Track:</strong> {session.track}</div>
            <div><strong className="text-foreground">Scheduled:</strong> {formatDateTime(session.scheduledAt)}</div>
          </div>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <div>
            <h4 className="font-semibold text-sm mb-2 uppercase tracking-wide text-muted-foreground">Session Summary</h4>
            <div className="bg-muted/30 p-4 rounded-md text-sm border">
              {session.summary || <span className="italic text-muted-foreground">No summary recorded yet.</span>}
            </div>
          </div>

           {session.id === "ses-pdf-kickoff" && <KickoffReview />}
          
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Questions Asked</div>
                  <div className="text-2xl font-mono mt-1">{session.questionCount}</div>
                </div>
                <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                  <FileText size={20} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Evidence Captured</div>
                  <div className="text-2xl font-mono mt-1">{session.evidenceCount}</div>
                </div>
                <div className="h-10 w-10 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center">
                  <Fingerprint size={20} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function KickoffReview() {
  return (
    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <ClipboardCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold text-sm">Reviewed against Apple Notes</div>
          <p className="text-xs text-muted-foreground mt-1">
            Confirmed content is separated from recorded follow-ups and items that still need a decision.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            <Users size={14} /> Confirmed attendees
          </div>
          <ul className="mt-2 space-y-1 text-sm text-foreground/85">
            <li>Agustín Jorquera · project organizer</li>
            <li>Roderick W. · project organizer</li>
            <li>Rodrigo Gandara · Gerente de Comercial</li>
            <li>Viviana Aqueveque · Presidenta del Directorio</li>
            <li>Héctor Salcedo · Jefe Área TI</li>
          </ul>
        </div>
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
            <ListChecks size={14} /> Confirmed direction
          </div>
          <ul className="mt-2 space-y-1 text-sm text-foreground/85">
            <li>GateControl and intelligent fleet tracking</li>
            <li>Address “hacer tierra” through actual departure and route visibility</li>
            <li>Relate GateControl to Puerto Seco plate reading</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-emerald-500/20 pt-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
          <ListChecks size={14} /> Recorded follow-ups
        </div>
        <ul className="mt-2 space-y-1 text-sm text-foreground/85">
          <li>Agustín to arrange a presentation with Carlos Manosalva; date not defined.</li>
          <li>Agustín and Roderick to hold a remote session with Héctor and Jorge on 2026-08-28.</li>
        </ul>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
          <HelpCircle size={14} /> Open question
        </div>
        <p className="text-sm text-foreground/85 mt-1">
          Decide whether Essex maintenance and spare-parts work belongs in this project, and how to address it initially if it does not.
        </p>
      </div>
    </div>
  )
}
