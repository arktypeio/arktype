import { DocsLayout } from "fumadocs-ui/layouts/docs"
import type { ReactNode } from "react"
import { source } from "../../lib/source.tsx"
import { baseOptions } from "../layout.config.tsx"
import { defineMetadata } from "../metadata.ts"

export const metadata = defineMetadata({
	title: "ArkType Docs",
	ogImage: "ogDocs.png"
})

export default ({ children }: { children: ReactNode }) => (
	<DocsLayout tree={source.pageTree} {...baseOptions}>
		{children}
	</DocsLayout>
)
