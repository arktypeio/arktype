import Link from "next/link"
import type { Neighbors } from "../../lib/content/pageTree.ts"

export type PageFooterProps = Neighbors & {
	editUrl: string
	markdownUrl: string
	/** when the page's source last changed, as an ISO date */
	updated?: string | undefined
	/** when a blog post was announced, as an ISO date (shown instead of `updated`) */
	published?: string | undefined
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	year: "numeric",
	timeZone: "UTC"
})

const Dated = ({ label, date }: { label: string; date: string }) => (
	<span className="pf-right">
		{label} <time dateTime={date}>{dateFormat.format(new Date(date))}</time>
	</span>
)

/** previous and next pages, then the page's links and when it last changed */
export const PageFooter = ({
	previous,
	next,
	editUrl,
	markdownUrl,
	updated,
	published
}: PageFooterProps) => (
	<>
		{(previous || next) && (
			<nav className="pager" aria-label="Previous and next page">
				{previous && (
					<Link href={previous.url} className="pg prev" rel="prev">
						<span className="pg-dir">← Previous</span>
						<span className="pg-title">{previous.frontmatter.title}</span>
					</Link>
				)}
				{next && (
					<Link href={next.url} className="pg next" rel="next">
						<span className="pg-dir">Next →</span>
						<span className="pg-title">{next.frontmatter.title}</span>
					</Link>
				)}
			</nav>
		)}
		<footer className="page-foot">
			<a className="ext" href={editUrl} target="_blank" rel="noreferrer">
				Edit this page on GitHub
			</a>
			<span aria-hidden>·</span>
			<a href={markdownUrl}>View as Markdown</a>
			{published ?
				<Dated label="Published" date={published} />
			:	updated && <Dated label="Updated" date={updated} />}
		</footer>
	</>
)
