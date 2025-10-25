import React from 'react'

const Button = ({ children, className, ...props }: {
    children: React.ReactNode
    [key: string]: any
}) => {
  return (
    <button {...props} className={`h-9 px-4 rounded-md flex items-center justify-center bg-primary text-primary-foreground gap-2 text-base ${className}`}>{children}</button>
  )
}

export default Button