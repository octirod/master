import { useState } from "react"
import { useGetEvidence, EvidenceType } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Fingerprint, Search, AlertCircle, HelpCircle, CheckCircle, Zap, Loader2 } from "lucide-react"

export default function EvidenceLog() {
  const { data: evidence, isLoading } = useGetEvidence()
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const filteredEvidence = evidence?.filter(e => {
    const matchesSearch = e.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.source.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || e.type === typeFilter
    return matchesSearch && matchesType
  }) || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Fingerprint className="text-emerald-500" /> Evidence Log
          </h1>
          <p className="text-muted-foreground mt-1">Raw facts, signals, and assumptions captured during discovery.</p>
        </div>
      </div>

      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
        <div className="font-semibold text-emerald-800 dark:text-emerald-300">Kickoff review is complete</div>
        <p className="text-muted-foreground mt-1">
          Items sourced from the reviewed kickoff notes are marked below. Facts and recorded actions are distinct from open questions and working hypotheses.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search evidence details or sources..." 
            className="pl-9 bg-background shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          <FilterBadge label="All" active={typeFilter === "all"} onClick={() => setTypeFilter("all")} />
          <FilterBadge label="Fact" active={typeFilter === "fact"} onClick={() => setTypeFilter("fact")} icon={<CheckCircle size={12} className="mr-1" />} />
          <FilterBadge label="Signal" active={typeFilter === "signal"} onClick={() => setTypeFilter("signal")} icon={<Zap size={12} className="mr-1" />} />
          <FilterBadge label="Assumption" active={typeFilter === "assumption"} onClick={() => setTypeFilter("assumption")} icon={<AlertCircle size={12} className="mr-1" />} />
          <FilterBadge label="Question" active={typeFilter === "question"} onClick={() => setTypeFilter("question")} icon={<HelpCircle size={12} className="mr-1" />} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12 text-muted-foreground">
          <Loader2 className="animate-spin h-6 w-6 mr-2" /> Loading evidence...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvidence.map(item => (
            <EvidenceCard key={item.id} item={item} />
          ))}
          {filteredEvidence.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
              No evidence items found matching your filters.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FilterBadge({ label, active, onClick, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap border ${
        active 
          ? "bg-primary text-primary-foreground border-primary" 
          : "bg-background text-muted-foreground border-border hover:bg-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function EvidenceCard({ item }: { item: any }) {
  const isKickoffReview = item.sessionId === "ses-pdf-kickoff"

  const getTypeColor = (type: EvidenceType) => {
    switch (type) {
      case 'fact': return 'border-l-4 border-l-emerald-500'
      case 'signal': return 'border-l-4 border-l-blue-500'
      case 'assumption': return 'border-l-4 border-l-amber-500'
      case 'question': return 'border-l-4 border-l-purple-500'
      default: return 'border-l-4 border-l-gray-500'
    }
  }

  const getTypeIcon = (type: EvidenceType) => {
    switch (type) {
      case 'fact': return <CheckCircle size={14} className="text-emerald-500" />
      case 'signal': return <Zap size={14} className="text-blue-500" />
      case 'assumption': return <AlertCircle size={14} className="text-amber-500" />
      case 'question': return <HelpCircle size={14} className="text-purple-500" />
      default: return <HelpCircle size={14} className="text-gray-500" />
    }
  }

  const getTypeLabel = (type: EvidenceType) => {
    switch (type) {
      case 'fact': return 'Confirmed fact'
      case 'signal': return 'Decision / action'
      case 'assumption': return 'Working hypothesis'
      case 'question': return 'Open question'
      default: return type
    }
  }

  return (
    <Card className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow ${getTypeColor(item.type)}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {getTypeIcon(item.type)} {getTypeLabel(item.type)}
          </div>
          <div className="flex items-center gap-1.5">
            {isKickoffReview && <Badge variant="success" className="text-[10px]">Reviewed notes</Badge>}
            <Badge variant="outline" className="font-mono text-[10px]">Conf: {item.confidence}%</Badge>
          </div>
        </div>
        <h3 className="font-semibold text-base mt-2 leading-tight">{item.label}</h3>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-foreground/80 mt-2 line-clamp-4 leading-relaxed">
          {item.detail}
        </p>
        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <div className="truncate max-w-[70%] font-mono" title={item.source}>
            Source: {item.source}
          </div>
          {item.sessionId && (
            <div className="flex items-center gap-1 text-primary">
              Session Linked
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
