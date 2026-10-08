import { ensureDir, readFile, readJson, writeFile } from "@ark/fs"
import { existsSync, readdirSync, rmSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { repoDirs } from "../../repo/shared.ts"
import type { ParsedJsDocPart } from "../../repo/jsdocGen.ts"
import { apiDocsByGroup } from "../components/apiData.ts"
import snippetContentsById from "../components/snippets/contentsById.ts"
import { keywordRowsByTable, keywordTableNames } from "./keywords.ts"

const siteUrl = "https://arktype.io"
const contentDir = join(repoDirs.docs, "content", "docs")
const publicDir = join(repoDirs.docs, "public")

/** each docs section and the public path its llms.txt is served from */
const sections = {
	"(arktype)": "",
	attest: join("docs", "attest")
}

/**
 * Writes each docs page as Markdown to public/docs/<slug>.md and
 * concatenates each section's pages in sidebar order into its llms.txt.
 *
 * MDX components are replaced with the Markdown they render and twoslash
 * directives are removed so the output reads like the rendered page.
 */
export const writeMarkdown = () => {
	rmSync(join(publicDir, "docs"), {
		recursive: true,
		force: true
	})

	for (const [section, outDir] of Object.entries(sections)) {
		const pages = pagesInSidebarOrder(join(contentDir, section)).map(path => {
			const markdown = mdxToMarkdown(readFile(path))
			const outPath = join(publicDir, `${pageUrl(path)}.md`)
			ensureDir(dirname(outPath))
			writeFile(outPath, markdown)
			return markdown
		})

		const { title, description } = readJson(
			join(contentDir, section, "meta.json")
		)

		writeFile(
			join(ensureDir(join(publicDir, outDir)), "llms.txt"),
			[`# ${title}`, `> ${description}`, ...pages].join("\n\n")
		)
	}
}

const pagesInSidebarOrder = (dir: string): string[] => {
	const entries = readdirSync(dir)
	const listed =
		existsSync(join(dir, "meta.json")) ?
			((readJson(join(dir, "meta.json")).pages as string[]) ?? [])
		:	[]

	const ordered = [
		"index",
		...listed,
		...entries.map(entry => entry.replace(/\.mdx$/, "")).sort()
	]

	const paths: string[] = []
	for (const name of new Set(ordered)) {
		const path = join(dir, name)
		if (existsSync(`${path}.mdx`)) paths.push(`${path}.mdx`)
		else if (existsSync(path) && statSync(path).isDirectory())
			paths.push(...pagesInSidebarOrder(path))
	}
	return paths
}

const pageUrl = (path: string) =>
	join(
		"/docs",
		path
			.slice(contentDir.length)
			.replace(/\/\([^)]+\)/g, "")
			.replace(/(\/index)?\.mdx$/, "")
	)

export const mdxToMarkdown = (mdx: string): string => {
	const [, frontmatter, body] = /^---\n([\S\s]*?)\n---\n([\S\s]*)$/.exec(
		mdx
	) ?? [undefined, "", mdx]

	const title = /^title: (.*)$/m.exec(frontmatter)?.[1]
	const description = /^description: (.*)$/m.exec(frontmatter)?.[1]

	const header = [
		title && `# ${title}`,
		description && `> ${description}`
	].filter(Boolean)

	return [...header, transformBody(body)].join("\n\n").trim() + "\n"
}

const transformBody = (body: string) => {
	const lines = dedentCallouts(body.split("\n"))
	const output: string[] = []
	let quoteDepth = 0

	const push = (...pushed: string[]) =>
		output.push(
			...pushed.map(line => (quoteDepth ? `> ${line}`.trimEnd() : line))
		)

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		const trimmed = line.trim()

		if (trimmed.startsWith("```")) {
			const end = lines.findIndex(
				(candidate, j) => j > i && candidate.trim() === "```"
			)
			const lang = /^```(\w*)/.exec(trimmed)![1]
			push(trimmed, ...stripTwoslash(lines.slice(i + 1, end), lang), "```")
			i = end
			continue
		}

		if (!trimmed.startsWith("<")) {
			push(rewriteLinks(line))
			continue
		}

		// accumulate tags whose attributes span multiple lines
		let tag = trimmed
		while (!tag.endsWith(">") && i < lines.length - 1)
			tag += ` ${lines[++i].trim()}`

		const name = /^<\/?(\w+)/.exec(tag)?.[1]
		const attrs = parseAttributes(tag)

		switch (name) {
			case "SyntaxTab":
				if (!tag.startsWith("</"))
					push(`**${/^<SyntaxTab (\w+)/.exec(tag)![1]}**`)
				break
			case "Callout":
				if (tag.startsWith("</")) quoteDepth--
				else {
					quoteDepth++
					push(
						`**${attrs.title ?? (attrs.type === "warn" ? "Warning" : "Note")}**`,
						""
					)
				}
				break
			case "LinkCard":
				push(
					`- [${attrs.title}](${siteUrl}${attrs.href}): ${attrs.description}`
				)
				break
			case "InstallationTabs":
				push(
					"```bash",
					`npm install${"dev" in attrs ? " -D" : ""} ${attrs.pkg ?? "arktype"}`,
					"```"
				)
				break
			case "CodeBlock":
				push(
					"```ts",
					...stripTwoslash(
						snippetContentsById[
							attrs.fromFile as keyof typeof snippetContentsById
						].split("\n"),
						"ts"
					),
					"```"
				)
				break
			case "ApiTable":
				push(apiMarkdown(attrs.group as keyof typeof apiDocsByGroup))
				break
			case "StringKeywordTable":
				push(keywordTableMarkdown("string"))
				break
			case "NumberKeywordTable":
				push(keywordTableMarkdown("number"))
				break
			case "GenericKeywordTable":
				push(keywordTableMarkdown("generic"))
				break
			case "AllKeywordTables":
				push(
					keywordTableNames
						.map(name => `## ${name}\n\n${keywordTableMarkdown(name)}`)
						.join("\n\n")
				)
				break
			// purely visual or navigational, nothing to carry over
			case "SyntaxTabs":
			case "AnchorAliases":
			case "MainAutoplayDemo":
			case "RuntimeBenchmarksGraph":
				break
			default:
				push(line)
		}
	}

	return output
		.join("\n")
		.replace(/^(#+ .*) \[#[\w-]+]$/gm, "$1")
		.replace(/^(?:>\n){2,}/gm, ">\n")
		.replace(/^>\n(?!>)/gm, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim()
}

/** MDX ignores indentation inside components, but Markdown would read it as code */
const dedentCallouts = (lines: string[]) => {
	let depth = 0
	return lines.map(line => {
		if (line.startsWith("</Callout")) depth--
		const dedented = depth ? line.replace(/^( {4}|\t)/, "") : line
		if (line.startsWith("<Callout")) depth++
		return dedented
	})
}

const parseAttributes = (tag: string): Record<string, string> =>
	Object.fromEntries(
		[...tag.matchAll(/(\w+)(?:="([^"]*)")?/g)]
			.slice(1)
			.map(([, key, value]) => [key, value ?? "true"])
	)

const rewriteLinks = (line: string) =>
	line.replace(/]\(\/(?!\/)/g, `](${siteUrl}/`).replaceAll("&apos;", "'")

const twoslashLangs = new Set(["ts", "js"])

/** removes hidden lines and compiler directives that only twoslash reads */
const stripTwoslash = (lines: string[], lang: string): string[] => {
	if (!twoslashLangs.has(lang)) return lines

	const cutIndex = lines.findIndex(line => line.trim() === "// ---cut---")
	const visible: string[] = []
	let inCut = false

	for (const line of lines.slice(cutIndex + 1)) {
		const trimmed = line.trim()
		if (trimmed === "// ---cut-after---") break
		if (trimmed === "// ---cut-start---") inCut = true
		else if (trimmed === "// ---cut-end---") inCut = false
		else if (inCut || /^\/\/ @(?!ts-)\w+(:.*)?$/.test(trimmed)) continue
		else if (/^\/\/\s*\^[?|]/.test(trimmed)) {
			const annotation = trimmed.replace(/^\/\/\s*\^[?|]\s*/, "")
			if (annotation) visible.push(`${/^\s*/.exec(line)![0]}// ${annotation}`)
		} else visible.push(line.replace(/\s*\/\/ \[!code [^\]]+]/, ""))
	}

	while (visible[0]?.trim() === "") visible.shift()
	while (visible.at(-1)?.trim() === "") visible.pop()

	return visible
}

const keywordTableMarkdown = (name: (typeof keywordTableNames)[number]) =>
	[
		"| Alias | Description |",
		"| --- | --- |",
		...keywordRowsByTable[name].map(
			({ alias, description }) =>
				`| \`${alias}\` | ${description.replaceAll("|", "\\|")} |`
		)
	].join("\n")

const apiMarkdown = (group: keyof typeof apiDocsByGroup) =>
	apiDocsByGroup[group]
		.map(({ name, summary, notes, experimental, example }) =>
			[
				`### ${name}`,
				jsDocMarkdown(summary),
				...notes.map(jsDocMarkdown),
				experimental && jsDocMarkdown(experimental),
				example && `\`\`\`ts\n${example}\n\`\`\``
			]
				.filter(Boolean)
				.join("\n\n")
		)
		.join("\n\n")

const jsDocMarkdown = (parts: readonly ParsedJsDocPart[]) =>
	parts
		.map(part =>
			part.kind === "link" ? `[${part.value}](${part.url})`
			: part.kind === "reference" ? `\`${part.value}\``
			: part.value.replace(/^-/, "•")
		)
		.join(" ")
