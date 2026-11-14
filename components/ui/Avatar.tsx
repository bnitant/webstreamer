interface AvatarProps {
  name:        string
  size?:       'sm' | 'md' | 'lg' | 'xl'
  index?:      number
  className?:  string
}

const gradients = [
  'from-sky-500 to-blue-600',
  'from-indigo-500 to-purple-600',
  'from-cyan-500 to-sky-600',
  'from-blue-500 to-indigo-600',
  'from-teal-500 to-cyan-600',
  'from-violet-500 to-indigo-600',
  'from-blue-400 to-cyan-500',
  'from-sky-600 to-blue-700',
]

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getGradient(name: string, index?: number): string {
  if (index !== undefined) return gradients[index % gradients.length]
  let hash = 0
  for (const c of name) hash = (hash << 5) - hash + c.charCodeAt(0)
  return gradients[Math.abs(hash) % gradients.length]
}

export default function Avatar({ name, size = 'md', index, className = '' }: AvatarProps) {
  return (
    <div
      className={`
        rounded-full bg-gradient-to-br ${getGradient(name, index)}
        flex items-center justify-center font-bold text-white shrink-0
        shadow-glow-sm
        ${sizeClasses[size]}
        ${className}
      `}
      title={name}
    >
      {getInitials(name)}
    </div>
  )
}
