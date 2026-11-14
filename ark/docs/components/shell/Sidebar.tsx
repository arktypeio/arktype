import Link from "next/link"
import type { PageIcon } from "../../lib/content/frontmatter.ts"
import type {
	NavFolder,
	NavItem,
	NavPage,
	Page,
	PageTree,
	Section
} from "../../lib/content/pageTree.ts"
import { containsPage, docsSectionsOf, type DocsSection } from "./sections.ts"
import { SidebarEffects } from "./SidebarEffects.tsx"
import { currentOf, externalLinks } from "./TopNav.tsx"

export type SidebarProps = {
	tree: PageTree
	section: Section
	page: Page
}

/**
 * The current section's pages in their groups. In the phone drawer it also
 * gets the section switcher above and the site links below.
 */
export const Sidebar = ({ tree, section, page }: SidebarProps) => (
	<>
		<SectionSwitcher
			sections={docsSectionsOf(tree)}
			current={section.id}
			url={page.url}
		/>
		<nav className="side-nav" aria-label={section.title}>
			{groupsOf(section.items).map((group, i) => (
				<div className="sn-group" key={group.title ?? i}>
					{group.title && (
						<p className="sn-label">
							<span aria-hidden>// </span>
							{group.title.toLowerCase()}
						</p>
					)}
					<ul>
						{group.items.map((item, i) => (
							<SidebarItem key={i} item={item} page={page} />
						))}
					</ul>
				</div>
			))}
		</nav>
		<div className="side-foot">
			<Link href="/playground" prefetch={false}>
				Playground
			</Link>
			<Link href="/docs/blog" prefetch={false}>
				Blog
			</Link>
			{externalLinks.map(link => (
				<a
					key={link.title}
					className="ext"
					href={link.href}
					target="_blank"
					rel="noreferrer"
				>
					{link.title}
				</a>
			))}
		</div>
		<SidebarEffects />
	</>
)

const SectionSwitcher = ({
	sections,
	current,
	url
}: {
	sections: DocsSection[]
	current: string
	url: string
}) => (
	<nav className="drawer-sections" aria-label="Sections">
		{sections.map(section => (
			<Link
				key={section.id}
				href={section.url}
				prefetch={false}
				aria-current={currentOf(section.url === url, section.id === current)}
			>
				<span>{section.title}</span>
				<small>{section.blurb}</small>
			</Link>
		))}
	</nav>
)

type Group = { title?: string; items: NavItem[] }

const groupsOf = (items: NavItem[]): Group[] => {
	const groups: Group[] = [{ items: [] }]
	for (const item of items) {
		if (item.kind === "separator") groups.push({ title: item.title, items: [] })
		else groups.at(-1)!.items.push(item)
	}
	return groups.filter(group => group.items.length)
}

/** where a folder without a page of its own leads: its first page */
const pageUrlOf = (item: NavItem): string | undefined =>
	item.kind === "page" ? item.page.url
	: item.kind === "folder" ?
		(item.index?.url ?? item.items.map(pageUrlOf).find(Boolean))
	:	undefined

const SidebarItem = ({ item, page }: { item: NavItem; page: Page }) => {
	if (item.kind === "separator") return null
	if (item.kind === "page") {
		return (
			<li>
				<SidebarLink
					href={item.page.url}
					current={item.page === page}
					icon={item.page.frontmatter.icon}
				>
					{item.page.frontmatter.title}
				</SidebarLink>
			</li>
		)
	}
	if (item.kind === "link") {
		// a heading's link: the TOC lists those
		if (item.url.includes("#")) return null
		return (
			<li>
				<SidebarLink href={item.url} current={false}>
					{item.title}
				</SidebarLink>
			</li>
		)
	}
	// a folder is one entry; on its own page, its pages are listed under it
	// (anchor links aren't: the TOC already lists the page's headings)
	const href = pageUrlOf(item)
	if (!href) return null
	const subs = containsPage(item, page) ? item.items.filter(isSubPage) : []
	return (
		<li>
			<SidebarLink
				href={href}
				current={href === page.url}
				icon={item.icon ?? item.index?.frontmatter.icon}
			>
				{item.title}
			</SidebarLink>
			{subs.length > 0 && (
				<ul className="sn-subs">
					{subs.map((sub, i) => {
						const subPage = sub.kind === "page" ? sub.page : sub.index
						return (
							<li key={i}>
								<Link
									href={pageUrlOf(sub)!}
									prefetch={false}
									className="sub"
									aria-current={subPage === page ? "page" : undefined}
								>
									{sub.kind === "page" ? sub.page.frontmatter.title : sub.title}
								</Link>
							</li>
						)
					})}
				</ul>
			)}
		</li>
	)
}

const isSubPage = (item: NavItem): item is NavPage | NavFolder =>
	pageUrlOf(item) !== undefined

const SidebarLink = ({
	href,
	current,
	icon,
	children
}: {
	href: string
	current: boolean
	icon?: PageIcon | undefined
	children: React.ReactNode
}) => (
	<Link
		href={href}
		prefetch={false}
		aria-current={current ? "page" : undefined}
	>
		{children}
		{icon && (
			<span className="sn-tag" data-icon={icon}>
				{icon === "New" ? "new" : "advanced"}
			</span>
		)}
	</Link>
)
