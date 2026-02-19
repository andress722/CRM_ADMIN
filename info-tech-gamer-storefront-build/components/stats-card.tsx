import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  icon: LucideIcon
  label: string
  value: string
}

export function StatsCard({ icon: Icon, label, value }: StatsCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/20 bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-mono text-xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
