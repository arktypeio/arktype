import { DocsLayout } from "fumadocs-ui/layouts/docs"
import type { ReactNode } from "react"
import { baseOptions } from "../../app/layout.config.tsx"
import { source } from "../../lib/source.ts"

export default ({ children }: { children: ReactNode }) => (
	<DocsLayout tree={source.pageTree} {...baseOptions}>
		{children}
	</DocsLayout>
)
