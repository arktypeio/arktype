import { cx } from "class-variance-authority"
import Link from "next/link"
import type { ComponentPropsWithoutRef } from "react"

export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
	size?: "sm" | "md"
	wiggle?: boolean
	href?: string
}

const sizeClasses = {
	sm: "py-1.5 px-2.5 text-xs",
	md: "py-2 px-3 text-sm"
}

/** the outlined pill over the blog's autoplay demo */
export const Button = ({
	size = "md",
	wiggle,
	href,
	className,
	...otherProps
}: ButtonProps) => {
	const combinedClasses = cx(
		"rounded-[1.5rem] flex items-center gap-[6px] transition-all duration-150 ease-linear cursor-pointer",
		"focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
		sizeClasses[size],
		"glow-btn bg-transparent text-white border-2 border-white/60 backdrop-blur-[5px]",
		"shadow-[0_0_7px_rgba(255,255,255,0.5),_0_0_14px_rgba(149,88,248,0.3),_inset_0_0_6px_rgba(255,255,255,0.15)]",
		"[text-shadow:0_0_6px_rgba(255,255,255,0.6)]",
		"hover:border-white hover:shadow-[0_0_12px_rgba(255,255,255,0.7),_0_0_22px_rgba(149,88,248,0.45)] hover:text-white/95 hover:-translate-y-[1px]",
		"active:scale-[0.98] active:brightness-95 active:translate-y-0",
		wiggle && "wiggle-animation",
		className
	)

	if (href) {
		return (
			<Link href={href} className={combinedClasses} {...(otherProps as any)}>
				{otherProps.children}
			</Link>
		)
	}

	return <button className={combinedClasses} {...otherProps} />
}
