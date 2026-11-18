import Link from "next/link"
import { CopyPage } from "./CopyPage.tsx"

export type PageHeaderProps = {
	title: string
	description: string
	section: { title: string; url: string }
	/** the sidebar group the page is in, e.g. "Definitions" */
	group?: string | undefined
	markdownUrl: string
}

export const PageHeader = ({
	title,
	description,
	section,
	group,
	markdownUrl
}: PageHeaderProps) => (
	<header className="page-head">
		<nav aria-label="Breadcrumb">
			<ol className="crumbs">
				<li>
					<Link href={section.url} prefetch={false}>
						{section.title}
					</Link>
				</li>
				{group && <li>{group}</li>}
			</ol>
		</nav>
		<div className="ph-row">
			<h1>{title}</h1>
			<CopyPage markdownUrl={markdownUrl} />
		</div>
		<p className="description">{description}</p>
	</header>
)
