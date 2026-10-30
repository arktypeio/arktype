import { SiGithub } from "@icons-pack/react-simple-icons"
import Link from "next/link"
import { getPageTree } from "../../lib/content/docs.ts"
import { BoatLane } from "./BoatLane.tsx"
import { Brand } from "./Brand.tsx"
import { MenuButton } from "./MobileNav.tsx"
import { SearchButton, SearchIconButton } from "./SearchTrigger.tsx"
import { ThemeToggle } from "./ThemeToggle.tsx"
import { docsSectionsOf } from "./sections.ts"

const githubUrl = "https://github.com/arktypeio/arktype"

export const externalLinks = [
	{ title: "GitHub", href: githubUrl },
	{ title: "Discord", href: "https://arktype.io/discord" }
]

export type TopNavProps = {
	/** id of the docs section being read, e.g. "(arktype)" */
	section?: string
	/** the current page's url, so links to it are marked as the current page */
	url?: string
	/** the area the page belongs to, if the top nav links to it directly */
	active?: "docs" | "playground" | "blog"
	/** whether the page has a drawer for the menu button to open */
	drawer?: boolean
}

/** the docs top bar: brand, section tabs, search and site links */
export const TopNav = ({ section, url, active, drawer }: TopNavProps) => (
	<header className="topbar" data-drawer={drawer || undefined}>
		<BoatLane className="tb-boat" />
		<div className="tb-in">
			{drawer && <MenuButton />}
			<Brand />
			<nav className="sections" aria-label="Sections">
				{docsSectionsOf(getPageTree()).map(s => (
					<Link
						key={s.id}
						href={s.url}
						prefetch={false}
						aria-current={currentOf(s.url === url, s.id === section)}
					>
						{s.title}
					</Link>
				))}
			</nav>
			<SearchButton />
			<nav className="tb-links" aria-label="Site">
				<Link
					href="/playground"
					prefetch={false}
					aria-current={active === "playground" ? "page" : undefined}
				>
					Playground
				</Link>
				<Link
					href="/docs/blog"
					prefetch={false}
					aria-current={currentOf(url === "/docs/blog", active === "blog")}
				>
					Blog
				</Link>
				<a className="tb-gh" href={githubUrl} aria-label="GitHub">
					<SiGithub aria-hidden />
				</a>
			</nav>
			<SearchIconButton />
			<ThemeToggle className="tb-theme" />
		</div>
	</header>
)

/**
 * `page` for a link to the page being read, `true` for one to the section or
 * area it's in
 */
export const currentOf = (isPage: boolean, isWithin: boolean) =>
	isPage ? "page"
	: isWithin ? "true"
	: undefined
