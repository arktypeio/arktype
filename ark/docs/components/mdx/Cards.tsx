import { cx } from "class-variance-authority"
import Link from "next/link"
import type { ReactNode } from "react"

export const Cards = ({
	className,
	children
}: {
	className?: string | undefined
	children: ReactNode
}) => <div className={cx("cards", className)}>{children}</div>

export type CardProps = {
	title: ReactNode
	description?: ReactNode
	/** a short mono label above the title */
	kicker?: ReactNode
	href?: string | undefined
	icon?: ReactNode
	className?: string | undefined
	children?: ReactNode
}

const isExternal = (href: string) =>
	/^https?:\/\//.test(href) && !href.startsWith("https://arktype.io/")

export const Card = ({
	title,
	description,
	kicker,
	href,
	icon,
	className,
	children
}: CardProps) => {
	const external = href !== undefined && isExternal(href)
	const content = (
		<>
			{kicker && <span className="card-kicker">{kicker}</span>}
			<span className="card-title">
				{icon && <span className="card-icon">{icon}</span>}
				{title}
				{href && (
					<span className="card-arrow" aria-hidden>
						{external ? "↗" : "→"}
					</span>
				)}
			</span>
			{description && <span className="card-description">{description}</span>}
			{children}
		</>
	)
	return (
		href === undefined ? <div className={cx("card", className)}>{content}</div>
		: external ?
			<a
				href={href}
				target="_blank"
				rel="noreferrer"
				className={cx("card", className)}
				data-link=""
			>
				{content}
			</a>
		:	<Link
				href={href}
				prefetch={false}
				className={cx("card", className)}
				data-link=""
			>
				{content}
			</Link>
	)
}

export type LinkCardProps = {
	href: string
	title: string
	description?: string
	/** a post's date, shown above the title */
	date?: string
	className?: string
}

/** a Card that is a single link */
export const LinkCard = ({
	href,
	title,
	description,
	date,
	className
}: LinkCardProps) => (
	<Card
		href={href}
		title={title}
		description={description}
		kicker={date && <time>{date}</time>}
		className={className}
	/>
)
