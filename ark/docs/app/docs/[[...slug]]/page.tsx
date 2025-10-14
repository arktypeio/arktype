import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui"
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock"
import { Tab, Tabs } from "fumadocs-ui/components/tabs"
import defaultMdxComponents from "fumadocs-ui/mdx"
import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle
} from "fumadocs-ui/page"
import { notFound, redirect } from "next/navigation"
import { AnchorAliases } from "../../../components/AnchorAliases.tsx"
import { SyntaxTab, SyntaxTabs } from "../../../components/SyntaxTabs.tsx"
import { source } from "../../../lib/source.tsx"

export default async (props: { params: Promise<{ slug?: string[] }> }) => {
	const params = await props.params

	if (
		!params.slug?.length ||
		(params.slug?.length === 1 && params.slug[0] === "intro")
	)
		redirect("/docs/intro/setup")

	const page = source.getPage(params.slug)

	if (!page) notFound()

	const { body: MDX, toc } = await page.data.load()

	const isApiPage =
		page.data.title.endsWith("API") || page.data.title.endsWith("Configuration")

	return (
		<DocsPage
			toc={isApiPage ? [] : toc}
			// "clerk" causes left border to wind in and out to mirror header structure
			tableOfContent={{ style: "clerk" }}
			full={page.data.full ?? false}
		>
			<DocsTitle>
				{page.data.title}
				<DocsDescription>{page.data.description}</DocsDescription>
			</DocsTitle>

			<DocsBody className="docs-body">
				<MDX
					components={{
						...defaultMdxComponents,
						Popup,
						PopupContent,
						PopupTrigger,
						Tabs,
						Tab,
						SyntaxTabs,
						SyntaxTab,
						AnchorAliases,
						...(await import("../../../components/AutoplayDemo.tsx")),
						...(await import("../../../components/CodeBlock.tsx")),
						...(await import("../../../components/InstallationTabs.tsx")),
						...(await import("../../../components/KeywordTable.tsx")),
						...(await import("../../../components/ApiTable.tsx")),
						...(await import("../../../components/LinkCard.tsx")),
						...(await import("../../../components/AutoplayDemo.tsx")),
						...(await import("../../../components/RuntimeBenchmarksGraph.tsx")),
						pre: ({ ref: _, ...props }) => (
							<CodeBlock {...props}>
								<Pre>{props.children}</Pre>
							</CodeBlock>
						)
					}}
				/>
			</DocsBody>
		</DocsPage>
	)
}

export const generateStaticParams = async () => [
	...source.generateParams(),
	{ slug: [] },
	{ slug: ["intro"] }
]

export const generateMetadata = async (props: {
	params: Promise<{ slug?: string[] }>
}) => {
	const params = await props.params
	const page = source.getPage(params.slug)
	if (!page) notFound()

	return {
		title: page.data.title,
		description: page.data.description
	}
}
