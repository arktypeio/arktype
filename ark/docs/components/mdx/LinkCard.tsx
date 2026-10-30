import { isExternal, Link } from "./Link.tsx"

export type LinkCardProps = {
	href: string
	title: string
	description?: string
	/** a post's date, shown above the title */
	date?: string
}

/** a card that is a single link, like each post on the blog's index */
export const LinkCard = ({ href, title, description, date }: LinkCardProps) => (
	<Link href={href} className="card" data-link="">
		{date && (
			<span className="card-kicker">
				<time>{date}</time>
			</span>
		)}
		<span className="card-title">
			{title}
			<span className="card-arrow" aria-hidden>
				{isExternal(href) ? "↗" : "→"}
			</span>
		</span>
		{description && <span className="card-description">{description}</span>}
	</Link>
)
