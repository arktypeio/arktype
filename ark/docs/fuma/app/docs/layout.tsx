import { DocsLayout } from "fumadocs-ui/layouts/docs"
import type { ReactNode } from "react"
import { source } from "../../lib/source.js"
import { baseOptions } from "../layout.config.jsx"

export default ({ children }: { children: ReactNode }) => (
	<DocsLayout tree={source.pageTree} {...baseOptions}>
		{children}
	</DocsLayout>
)
