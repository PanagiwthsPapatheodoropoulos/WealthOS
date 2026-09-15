import React, { useState, useRef, useEffect } from 'react'
import { Info, CheckCircle2 } from 'lucide-react'

export interface BenchmarkRange {
  label: string
  range: string
  status: 'bad' | 'neutral' | 'good' | 'elite'
  description?: string
}

export interface MetricTooltipProps {
  title: string
  description: string
  benchmarks?: BenchmarkRange[]
  verdict?: string
  align?: 'left' | 'right' | 'center'
  width?: string
}

export function MetricTooltip({
  title,
  description,
  benchmarks,
  verdict,
  align = 'left',
  width = 'w-72 sm:w-96',
}: MetricTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const alignmentClasses =
    align === 'right'
      ? 'right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'left-0 sm:left-auto sm:right-1/2 sm:translate-x-1/2'

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer rounded-full hover:bg-zinc-100"
        aria-label={`Info about ${title}`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-2 z-50 ${width} max-h-[30rem] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl text-left transition-all ${alignmentClasses} animate-in fade-in zoom-in-95 duration-150 pointer-events-auto`}
        >
          {/* Header */}
          <div className="flex items-center gap-1.5 pb-2 border-b border-zinc-100 sticky top-0 bg-white z-10">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 font-bold text-[10px]">
              i
            </span>
            <h4 className="text-xs font-bold text-zinc-900">{title}</h4>
          </div>

          {/* Description */}
          <p className="text-[11px] text-zinc-600 mt-2 leading-relaxed whitespace-pre-line">{description}</p>

          {/* Benchmark Ranges Table */}
          {benchmarks && benchmarks.length > 0 && (
            <div className="mt-3 space-y-1.5 pt-2 border-t border-zinc-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Evaluation Scale & Benchmarks
              </span>
              <div className="space-y-1">
                {benchmarks.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-[11px] font-mono py-0.5 px-1.5 rounded-lg bg-zinc-50"
                  >
                    <span className="flex items-center gap-1.5 text-zinc-600 font-sans text-[11px]">
                      {b.status === 'bad' && <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />}
                      {b.status === 'neutral' && <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />}
                      {b.status === 'good' && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />}
                      {b.status === 'elite' && <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />}
                      <span>{b.label}</span>
                    </span>
                    <span
                      className={`font-bold ${
                        b.status === 'bad'
                          ? 'text-rose-600'
                          : b.status === 'neutral'
                          ? 'text-amber-700'
                          : b.status === 'good'
                          ? 'text-emerald-700'
                          : 'text-indigo-700'
                      }`}
                    >
                      {b.range}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verdict / Tip */}
          {verdict && (
            <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200/80 p-2 text-[11px] text-emerald-900 font-medium leading-tight flex items-start gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{verdict}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
