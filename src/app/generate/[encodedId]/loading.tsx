export default function Loading() {
  return (
    <div className="h-screen bg-muted flex justify-center overflow-hidden">
      <div className="w-full max-w-120 bg-background border-x border-foreground h-full flex flex-col">
        <header className="px-6 pt-6 pb-5 border-b border-foreground flex items-start justify-between shrink-0">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-foreground/10 animate-pulse" />
            <div className="h-6 w-20 bg-foreground/10 animate-pulse" />
          </div>
          <div className="h-6 w-14 bg-foreground/10 animate-pulse mt-1" />
        </header>
        <div className="px-6 pt-4 pb-3 border-b border-foreground shrink-0 space-y-2">
          <div className="h-3 w-16 bg-foreground/10 animate-pulse" />
          <div className="h-6 w-40 bg-foreground/10 animate-pulse" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-muted/40">
          <div className="p-6 bg-white border-2 border-foreground/20">
            <div className="size-[240px] bg-foreground/10 animate-pulse" />
          </div>
        </div>
        <div className="px-6 py-5 border-t border-foreground bg-background shrink-0">
          <div className="h-14 w-full bg-foreground/10 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
