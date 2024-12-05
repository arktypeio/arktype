import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui"
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock"
import defaultMdxComponents from "fumadocs-ui/mdx"
import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle
} from "fumadocs-ui/page"
import { notFound } from "next/navigation"
import { source } from "../../../lib/source.js"

export default async (props: { params: Promise<{ slug?: string[] }> }) => {
	const params = await props.params
	const page = source.getPage(params.slug)
	if (!page) notFound()

	const MDX = page.data.body

	return (
		<DocsPage toc={page.data.toc} full={page.data.full ?? false}>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription>{page.data.description}</DocsDescription>
			<DocsBody>
				<MDX
					components={{
						...defaultMdxComponents,
						Popup,
						PopupContent,
						PopupTrigger,

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

export const generateStaticParams = async () => source.generateParams()

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
