import Link from "next/link"
import { getPageTree } from "../../lib/content/docs.ts"
import { Brand } from "./Brand.tsx"
import { docsSectionsOf } from "./sections.ts"
import { externalLinks } from "./TopNav.tsx"

const tools = [
	{ title: "Playground", href: "/playground" },
	{ title: "Editor setup", href: "/docs/editor" },
	{ title: "llms.txt", href: "/llms.txt" },
	{ title: "Blog", href: "/docs/blog" }
]

const community = [
	...externalLinks,
	{ title: "npm", href: "https://www.npmjs.com/package/arktype" },
	{ title: "Sponsor", href: "https://github.com/sponsors/arktypeio" }
]

/** the site's link columns and legal line, under the homepage's closer */
export const SiteFooter = () => (
	<div className="site-foot">
		<div className="foot-grid">
			<div>
				<Brand />
				<p className="foot-tag">
					TypeScript's 1:1 validator, optimized from editor to runtime.
				</p>
			</div>
			<FootColumn title="docs">
				{docsSectionsOf(getPageTree()).map(section => (
					<li key={section.id}>
						<Link href={section.url} prefetch={false}>
							{section.title}
						</Link>
					</li>
				))}
			</FootColumn>
			<FootColumn title="tools">
				{tools.map(link => (
					<li key={link.title}>
						{link.href.endsWith(".txt") ?
							<a href={link.href}>{link.title}</a>
						:	<Link href={link.href} prefetch={false}>
								{link.title}
							</Link>
						}
					</li>
				))}
			</FootColumn>
			<FootColumn title="community">
				{community.map(link => (
					<li key={link.title}>
						<a
							className="ext"
							href={link.href}
							target="_blank"
							rel="noreferrer"
						>
							{link.title}
						</a>
					</li>
				))}
			</FootColumn>
		</div>
		<div className="legal">
			<span>MIT licensed</span>
			<span>
				built with ArkType, <span className="only-dark">ArkDark</span>
				<span className="only-light">ArkLight</span> and Cascadia Code
			</span>
		</div>
	</div>
)

const FootColumn = ({
	title,
	children
}: {
	title: string
	children: React.ReactNode
}) => (
	<nav aria-label={title}>
		<p className="foot-label">// {title}</p>
		<ul>{children}</ul>
	</nav>
)
