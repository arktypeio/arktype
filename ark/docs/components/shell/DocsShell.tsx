import type { ReactNode } from "react"
import { Drawer } from "./MobileNav.tsx"

export type DocsShellProps = {
	/** the sidebar, which is also the drawer on phones */
	sidebar: ReactNode
	/** the "On this page" column; the bar above the article replaces it on narrower screens */
	toc?: ReactNode
	mobileToc?: ReactNode
	children: ReactNode
}

/** the docs grid: sidebar | article | table of contents */
export const DocsShell = ({
	sidebar,
	toc,
	mobileToc,
	children
}: DocsShellProps) => (
	<div className="layout docs">
		<Drawer>{sidebar}</Drawer>
		<main className="docs-main" id="main">
			{mobileToc}
			<article className="docs-article">{children}</article>
		</main>
		<div className="docs-toc">{toc}</div>
	</div>
)
