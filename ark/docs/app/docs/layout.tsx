import { DocsLayout } from "fumadocs-ui/layouts/docs"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { source } from "../../lib/source.tsx"
import { baseOptions } from "../layout.config.tsx"

export const metadata: Metadata = {
	title:
		"ArkType Docs: TypeScript's 1:1 validator, optimized from editor to runtime",
	openGraph: {
		title: "ArkType Docs",
		images: "https://arktype.io/image/ogDocs.png"
	}
}

export default ({ children }: { children: ReactNode }) => (
	<DocsLayout tree={source.pageTree} {...baseOptions}>
		{children}
	</DocsLayout>
)
