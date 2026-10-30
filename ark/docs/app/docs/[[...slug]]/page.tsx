import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { readFileSync } from "node:fs"
import { relative, sep } from "node:path"
import { mdxComponents } from "../../../components/mdx/components.tsx"
import { DocsShell } from "../../../components/shell/DocsShell.tsx"
import { HashRedirect } from "../../../components/shell/HashRedirect.tsx"
import { PageFooter } from "../../../components/shell/PageFooter.tsx"
import { PageHeader } from "../../../components/shell/PageHeader.tsx"
import { Redirect } from "../../../components/shell/Redirect.tsx"
import { groupTitleOf } from "../../../components/shell/sections.ts"
import { Sidebar } from "../../../components/shell/Sidebar.tsx"
import { MobileToc, Toc } from "../../../components/shell/Toc.tsx"
import { TopNav } from "../../../components/shell/TopNav.tsx"
import { compileMdx } from "../../../lib/content/compile.ts"
import { getPageTree } from "../../../lib/content/docs.ts"
import { parseMdx } from "../../../lib/content/frontmatter.ts"
import {
	neighborsOf,
	sectionOf,
	type Page,
	type PageTree
} from "../../../lib/content/pageTree.ts"
import { repoArkDir } from "../../../lib/content/paths.ts"
import { redirects, redirectTarget } from "../../../lib/content/redirects.ts"
import { defineMetadata } from "../../metadata.ts"
import { lastUpdatedOf } from "./lastUpdated.ts"

type Props = { params: Promise<{ slug?: string[] }> }

const urlOf = (slug: string[] = []) => ["/docs", ...slug].join("/")

export const dynamicParams = false

export const generateStaticParams = () => [
	...getPageTree().pages.map(page => ({ slug: page.slug })),
	...Object.keys(redirects).map(url => ({ slug: url.split("/").slice(2) }))
]

/** sections that are products of their own get their name in the title */
const productTitles: Record<string, string> = {
	attest: "Attest",
	regex: "ArkRegex",
	sets: "ArkSets"
}

/** sections of ArkType's docs whose name tells their pages apart, e.g. "Overview" */
const namedSections = new Set(["precompile", "json-schema", "internals"])

const titleOf = (tree: PageTree, page: Page) => {
	const { title } = page.frontmatter
	const product = productTitles[page.section]
	if (product) return `${title} · ${product}`
	const section = sectionOf(tree, page)!.title
	return namedSections.has(page.section) && !title.includes(section) ?
			`${title} · ${section} · ArkType`
		:	undefined
}

export const generateMetadata = async ({
	params
}: Props): Promise<Metadata> => {
	const url = urlOf((await params).slug)
	if (redirectTarget(url))
		return { title: "Redirecting", robots: { index: false } }
	const tree = getPageTree()
	const page = tree.pageByUrl.get(url)
	if (!page) notFound()
	const { title, description, ogImage } = page.frontmatter
	const absolute = titleOf(tree, page)
	const metadata = defineMetadata({
		title,
		description,
		ogImage: ogImage ?? "ogDocs.png",
		...(ogImage && { ogImageAlt: title }),
		url,
		// a shared link's card reads the whole title
		sharedTitle: absolute ?? `${title} · ArkType`
	})
	return {
		...metadata,
		...(absolute && { title: { absolute } })
	}
}

export default async function DocsPage({ params }: Props) {
	const url = urlOf((await params).slug)
	const target = redirectTarget(url)
	if (target) return <Redirect to={target} />

	const tree = getPageTree()
	const page = tree.pageByUrl.get(url)
	if (!page) notFound()
	const section = sectionOf(tree, page)!

	const { body } = parseMdx(readFileSync(page.path, "utf8"))
	const { Content, toc } = await compileMdx(body)
	const entries = page.frontmatter.toc === false ? [] : toc
	const markdownUrl = `${page.url}.md`
	const editUrl = `https://github.com/arktypeio/arktype/edit/main/${relative(`${repoArkDir}/..`, page.path).split(sep).join("/")}`
	// a post's last commit would read as when it was written
	const isPost = section.id === "blog" && page.url !== section.url

	return (
		<>
			<div hidden data-nosnippet>
				Reading this as an agent? This page is Markdown at {markdownUrl}. Index
				of every page: https://arktype.io/llms.txt
			</div>
			<TopNav
				section={section.id}
				url={page.url}
				active={section.id === "blog" ? "blog" : "docs"}
				drawer
			/>
			<DocsShell
				sidebar={<Sidebar tree={tree} section={section} page={page} />}
				toc={
					<Toc entries={entries} markdownUrl={markdownUrl} editUrl={editUrl} />
				}
				mobileToc={entries.length > 0 && <MobileToc entries={entries} />}
			>
				<PageHeader
					title={page.frontmatter.title}
					description={page.frontmatter.description}
					section={section}
					group={groupTitleOf(section, page)}
					markdownUrl={markdownUrl}
				/>
				<div className="prose">
					<Content components={mdxComponents} />
				</div>
				<PageFooter
					{...(page.listed ? neighborsOf(tree, page) : {})}
					editUrl={editUrl}
					markdownUrl={markdownUrl}
					updated={isPost ? undefined : lastUpdatedOf(page.path)}
					published={isPost ? page.frontmatter.date : undefined}
				/>
			</DocsShell>
			<HashRedirect />
		</>
	)
}
