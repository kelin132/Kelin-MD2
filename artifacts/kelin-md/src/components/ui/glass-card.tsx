import { cn } from "@/lib/utils"

export function GlassCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("glass-panel rounded-xl overflow-hidden relative group", className)} {...props}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      {children}
    </div>
  )
}
