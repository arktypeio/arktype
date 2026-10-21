import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { getPageTree } from "./content/docs.ts"
import { parseMdx } from "./content/frontmatter.ts"
import { mdxToMarkdown, siteUrl } from "./content/markdown.ts"
import type { NavItem, Page, Section } from "./content/pageTree.ts"
import { publicDir } from "./content/paths.ts"
import { redirects } from "./content/redirects.ts"

/** sections with their own full file, and where it's served */
const fullFiles: Record<string, string> = {
	"(arktype)": "llms-full.txt",
	regex: "docs/regex/llms.txt",
	attest: "docs/attest/llms.txt",
	"json-schema": "docs/json-schema/llms.txt",
	sets: "docs/sets/llms.txt",
	internals: "docs/internals/llms.txt"
}

const write = (path: string, contents: string) => {
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, contents)
}

/**
 * Writes the docs for agents:
 *
 * - every page as Markdown at its url plus `.md`, and a stub pointing to the
 *   new page at each redirected url plus `.md`
 * - /llms.txt, an index of the pages in the navigation (https://llmstxt.org)
 * - /llms-full.txt, every ArkType page in one file, and a file like it for
 *   each other section except the blog
 */
export const writeMarkdown = (): void => {
	const tree = getPageTree()
	rmSync(join(publicDir, "docs"), { recursive: true, force: true })

	const markdownByUrl = new Map<string, string>()
	for (const page of tree.pages) {
		const { frontmatter, body } = parseMdx(readFileSync(page.path, "utf8"))
		let markdown: string
		try {
			markdown = mdxToMarkdown(frontmatter, body)
		} catch (e) {
			throw new Error(`Failed to write ${page.url}.md`, { cause: e })
		}
		markdownByUrl.set(page.url, markdown)
		write(join(publicDir, `${page.url}.md`), markdown)
	}

	for (const [from, to] of Object.entries(redirects)) {
		// /docs.md would land outside the directory cleared above
		if (!from.startsWith("/docs/")) continue
		const target = tree.pageByUrl.get(to.replace(/#.*$/, ""))!
		write(
			join(publicDir, `${from}.md`),
			`# Moved\n\n> This page is now [${target.frontmatter.title}](${siteUrl}${target.url}.md).\n`
		)
	}

	const sections = tree.sections.filter(section => section.id in fullFiles)
	for (const section of sections) {
		write(
			join(publicDir, fullFiles[section.id]),
			[
				`# ${section.title}`,
				`> ${section.description}`,
				...section.pages.map(page => markdownByUrl.get(page.url)!.trim())
			].join("\n\n") + "\n"
		)
	}

	write(join(publicDir, "llms.txt"), llmsIndex(sections))
}

const pageLink = (page: Page) =>
	`- [${page.frontmatter.title}](${siteUrl}${page.url}.md): ${page.frontmatter.description}`

/** a section's pages under its sidebar groups, or under its title if it has none */
const sectionLists = (section: Section): string[] => {
	const groups: { title: string; pages: Page[] }[] = []
	const visit = (items: NavItem[]) => {
		for (const item of items) {
			if (item.kind === "separator") {
				groups.push({ title: `${section.title}: ${item.title}`, pages: [] })
				continue
			}
			if (!groups.length) groups.push({ title: section.title, pages: [] })
			if (item.kind === "page") groups.at(-1)!.pages.push(item.page)
			else if (item.kind === "folder") {
				if (item.index) groups.at(-1)!.pages.push(item.index)
				visit(item.items)
			}
		}
	}
	visit(section.items)
	return groups
		.filter(group => group.pages.length)
		.map(group =>
			[`## ${group.title}`, group.pages.map(pageLink).join("\n")].join("\n\n")
		)
}

const llmsIndex = (sections: Section[]) => {
	const [arktype, ...others] = sections
	return (
		[
			"# ArkType",
			"> TypeScript's 1:1 validator, optimized from editor to runtime",
			"ArkType parses definitions written in TypeScript's own syntax, validates data against them at runtime and infers their types. ArkRegex, Attest, @ark/json-schema and ArkSets are its companion packages.",
			`Each link below is a docs page as Markdown. [llms-full.txt](${siteUrl}/llms-full.txt) has every ArkType page in one file.`,
			...sections.flatMap(sectionLists),
			[
				"## Optional",
				[arktype, ...others]
					.map(
						section =>
							`- [${section.title}, every page](${siteUrl}/${fullFiles[section.id]}): ${section.description}`
					)
					.join("\n")
			].join("\n\n")
		].join("\n\n") + "\n"
	)
}
