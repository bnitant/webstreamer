import { ButtonHTMLAttributes, forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?:    Size
  loading?: boolean
  icon?:    React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-glow hover:from-sky-400 hover:to-blue-500 hover:shadow-glow-lg',
  secondary: 'bg-white/10 border border-white/15 text-white hover:bg-white/20',
  ghost:     'text-slate-300 hover:bg-white/8 hover:text-white',
  danger:    'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30',
  outline:   'border border-sky-500/40 text-sky-400 hover:bg-sky-500/10 hover:border-sky-400',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-xl',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, icon, children, className = '', disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2 font-semibold
          transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...rest}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        ) : icon}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
