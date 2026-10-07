import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,69,230,0.5)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97] active:transition-transform active:duration-100 select-none cursor-pointer max-sm:min-h-[44px]",
  {
    variants: {
      variant: {
        default: "bg-[#FFFFFF] text-black border border-black/5 hover:bg-[#0045e6] hover:text-white hover:border-[#0045e6] shadow-none hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150",
        destructive:
          "bg-red-600 text-white rounded-full hover:bg-red-700 active:bg-red-800",
        outline:
          "border border-black/5 bg-[#FFFFFF] text-black hover:bg-[#0045e6] hover:text-white hover:border-[#0045e6] shadow-none hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150",
        secondary:
          "border border-black/5 bg-[#FFFFFF] text-black hover:bg-[#0045e6] hover:text-white hover:border-[#0045e6] shadow-none hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150",
        ghost: "bg-transparent text-black hover:bg-[#0045e6] hover:text-white hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150",
        link: "text-black underline-offset-4 hover:underline active:opacity-70 active:scale-100",
      },
      size: {
        default: "h-9 px-5 py-2",
        sm: "h-8 px-4",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }