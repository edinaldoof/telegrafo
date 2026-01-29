import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'

    const variantClasses = {
      primary: 'bg-green-600 text-white fill-white stroke-white hover:bg-green-700 active:bg-green-800 focus:ring-green-500 font-semibold shadow-md hover:shadow-lg [&_svg]:text-white',
      secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400 font-semibold',
      danger: 'bg-red-600 text-white fill-white stroke-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500 font-semibold shadow-md hover:shadow-lg [&_svg]:text-white',
      ghost: 'hover:bg-gray-100 text-gray-700',
    }

    const sizeClasses = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
    }

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
