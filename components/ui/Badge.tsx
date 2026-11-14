interface BadgeProps {
  label:      string
  variant?:   'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  dot?:       boolean
  className?: string
}

const variantClasses = {
  default: 'bg-white/8 border-white/15 text-slate-300',
  success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  warning: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
  danger:  'bg-red-500/15 border-red-500/30 text-red-400',
  info:    'bg-sky-500/15 border-sky-500/30 text-sky-400',
  purple:  'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
}

const dotColors = {
  default: 'bg-slate-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger:  'bg-red-400',
  info:    'bg-sky-400',
  purple:  'bg-indigo-400',
}

export default function Badge({ label, variant = 'default', dot = false, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-0.5 rounded-full text-xs font-medium border
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} animate-pulse`} />
      )}
      {label}
    </span>
  )
}
