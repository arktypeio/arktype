import { cn } from "fumadocs-ui/utils/cn"
import Link from "next/link"
import { type ComponentPropsWithoutRef, forwardRef } from "react"

type ButtonSize = "sm" | "md" | "lg"
type ButtonVariant = "outline" | "filled"

export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
	variant?: ButtonVariant
	size?: ButtonSize
	wiggle?: boolean
	href?: string
	linkTarget?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			variant = "outline",
			size = "md",
			wiggle,
			href,
			className,
			linkTarget,
			...otherProps
		},
		ref
	) => {
		const sizeClasses = {
			sm: "py-1.5 px-2.5 text-xs",
			md: "py-2 px-3 text-sm",
			lg: "py-4 px-6 text-base"
		}

		const baseClasses = cn(
			"rounded-[1.5rem] flex items-center gap-[6px] transition-all duration-150 ease-linear cursor-pointer",
			"focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
		)

		const variantClasses = {
			outline: cn(
				"bg-transparent text-white border-2 border-white/60 backdrop-blur-[5px]",
				"shadow-[0_0_7px_rgba(255,255,255,0.5),_0_0_14px_rgba(149,88,248,0.3),_inset_0_0_6px_rgba(255,255,255,0.15)]",
				"[text-shadow:0_0_6px_rgba(255,255,255,0.6)]",
				"hover:border-white hover:shadow-[0_0_12px_rgba(255,255,255,0.7),_0_0_22px_rgba(149,88,248,0.45)] hover:text-white/95 hover:-translate-y-[1px]",
				"active:scale-[0.98] active:brightness-95 active:translate-y-0"
			),
			filled: cn(
				"bg-[#f5cf8f] text-black border-2 border-transparent",
				"shadow-[0_4px_10px_rgba(0,0,0,0.2),_0_0_10px_#f5cf8f]",
				"hover:bg-[#f7e1b1] hover:shadow-[0_4px_15px_rgba(0,0,0,0.15),_0_0_15px_#f7e1b1] hover:-translate-y-[1px]",
				"active:scale-[0.98] active:bg-[#f5cf8f] active:translate-y-0"
			)
		}

		const wiggleClasses = wiggle ? "wiggle-animation" : ""

		const combinedClasses = cn(
			baseClasses,
			sizeClasses[size],
			variantClasses[variant],
			wiggleClasses,
			className
		)

		const commonProps = {
			className: combinedClasses,
			...otherProps
		}

		if (href) {
			return (
				<Link href={href} target={linkTarget} {...(commonProps as any)}>
					{otherProps.children}
				</Link>
			)
		}

		return <button ref={ref} {...commonProps} />
	}
)
