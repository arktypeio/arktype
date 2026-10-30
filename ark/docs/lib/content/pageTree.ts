import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { parseMdx, type Frontmatter, type PageIcon } from "./frontmatter.ts"

export type Page = {
	/** e.g. /docs/intro/setup */
	url: string
	/** url segments after /docs, e.g. ["intro", "setup"] */
	slug: string[]
	/** absolute path of the .mdx file */
	path: string
	/** id of the section the page belongs to, e.g. "(arktype)" or "attest" */
	section: string
	frontmatter: Frontmatter
	/** whether some meta.json lists the page, i.e. it is in the navigation */
	listed: boolean
}

export type NavItem = NavPage | NavLink | NavSeparator | NavFolder

export type NavPage = { kind: "page"; page: Page }

/** a `[text](url)` entry, usually an anchor into a page */
export type NavLink = { kind: "link"; title: string; url: string }

/** a `---Label---` entry starting a group */
export type NavSeparator = { kind: "separator"; title: string }

export type NavFolder = {
	kind: "folder"
	title: string
	icon?: PageIcon
	defaultOpen: boolean
	/** the folder's own page (its index.mdx), if any */
	index?: Page | undefined
	items: NavItem[]
}

export type Section = {
	/** the section's directory name, e.g. "(arktype)" */
	id: string
	title: string
	description: string
	/** url of the section's first page */
	url: string
	items: NavItem[]
	/** listed pages in navigation order */
	pages: Page[]
}

export type PageTree = {
	sections: Section[]
	/** every page, listed ones first in navigation order */
	pages: Page[]
	pageByUrl: ReadonlyMap<string, Page>
	/** problems that should fail a production build */
	errors: string[]
	/** problems that are expected while content is in progress */
	warnings: string[]
}

type MetaJson = {
	title?: string
	description?: string
	root?: boolean
	defaultOpen?: boolean
	icon?: PageIcon
	pages?: string[]
}

const separatorPattern = /^---(.*)---$/
const linkPattern = /^(?:external:)?\[(.+)]\((.+)\)$/

const pageUrl = (contentDir: string, path: string): string => {
	const segments = relative(contentDir, path)
		.replace(/\.mdx$/, "")
		.split(sep)
		.filter(segment => !/^\(.+\)$/.test(segment))
	if (segments.at(-1) === "index") segments.pop()
	return ["/docs", ...segments].join("/")
}

/** a file's path under the content directory, with "/" on every platform */
const contentPath = (contentDir: string, path: string) =>
	relative(contentDir, path).split(sep).join("/")

const readMeta = (dir: string): MetaJson | undefined => {
	const path = join(dir, "meta.json")
	return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined
}

const isDir = (path: string) => existsSync(path) && statSync(path).isDirectory()

const mdxFilesIn = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
		entry.isDirectory() ? mdxFilesIn(join(entry.parentPath, entry.name))
		: entry.name.endsWith(".mdx") ? [join(entry.parentPath, entry.name)]
		: []
	)

export const buildPageTree = (contentDir: string): PageTree => {
	const errors: string[] = []
	const warnings: string[] = []
	const pagesByPath = new Map<string, Page>()
	const listed: Page[] = []

	const loadPage = (path: string, section: string): Page => {
		const existing = pagesByPath.get(path)
		if (existing) return existing
		const parsed = parseMdx(readFileSync(path, "utf8"))
		if (parsed.problem)
			errors.push(`${contentPath(contentDir, path)}: ${parsed.problem}`)
		const url = pageUrl(contentDir, path)
		const page: Page = {
			url,
			slug: url.split("/").slice(2),
			path,
			section,
			frontmatter: parsed.frontmatter,
			listed: false
		}
		pagesByPath.set(path, page)
		return page
	}

	const listPage = (page: Page) => {
		if (page.listed) {
			warnings.push(`${page.url} is listed more than once`)
			return
		}
		page.listed = true
		listed.push(page)
	}

	const resolveEntries = (
		dir: string,
		entries: string[],
		section: string
	): NavItem[] =>
		entries.flatMap((entry): NavItem[] => {
			const separator = separatorPattern.exec(entry)
			if (separator) return [{ kind: "separator", title: separator[1].trim() }]

			const link = linkPattern.exec(entry)
			if (link) return [{ kind: "link", title: link[1], url: link[2] }]

			const path = join(dir, entry)
			if (existsSync(`${path}.mdx`)) {
				const page = loadPage(`${path}.mdx`, section)
				listPage(page)
				return [{ kind: "page", page }]
			}
			if (isDir(path)) return [resolveFolder(path, section)]

			warnings.push(
				`${contentPath(contentDir, join(dir, "meta.json"))} lists "${entry}", which doesn't exist`
			)
			return []
		})

	const defaultEntries = (dir: string) =>
		readdirSync(dir, { withFileTypes: true })
			.filter(entry => entry.isDirectory() || entry.name.endsWith(".mdx"))
			.map(entry => entry.name.replace(/\.mdx$/, ""))
			.sort((l, r) =>
				l === "index" ? -1
				: r === "index" ? 1
				: l.localeCompare(r)
			)

	const resolveFolder = (dir: string, section: string): NavFolder => {
		const meta = readMeta(dir) ?? {}
		const entries = meta.pages ?? defaultEntries(dir)
		const indexPath = join(dir, "index.mdx")
		let index: Page | undefined
		if (!entries.includes("index") && existsSync(indexPath)) {
			index = loadPage(indexPath, section)
			listPage(index)
		}
		const folder: NavFolder = {
			kind: "folder",
			title: meta.title ?? index?.frontmatter.title ?? dir.split(sep).at(-1)!,
			defaultOpen: meta.defaultOpen ?? false,
			index,
			items: resolveEntries(
				dir,
				entries.filter(entry => entry !== "index" || !index),
				section
			)
		}
		const icon = meta.icon ?? index?.frontmatter.icon
		if (icon) folder.icon = icon
		return folder
	}

	const rootMeta = readMeta(contentDir) ?? {}
	const sectionIds = [
		...new Set([
			...(rootMeta.pages ?? []),
			...readdirSync(contentDir).filter(
				name =>
					isDir(join(contentDir, name)) &&
					readMeta(join(contentDir, name))?.root
			)
		])
	]

	const sections: Section[] = []
	for (const id of sectionIds) {
		const dir = join(contentDir, id)
		const meta = readMeta(dir)
		if (!meta?.root) {
			warnings.push(
				`content/docs/meta.json lists "${id}", which isn't a section with a meta.json that sets "root": true`
			)
			continue
		}
		const start = listed.length
		const items = resolveEntries(dir, meta.pages ?? defaultEntries(dir), id)
		const pages = listed.slice(start)
		if (!pages.length) {
			warnings.push(`section ${id} has no pages`)
			continue
		}
		sections.push({
			id,
			title: meta.title ?? id,
			description: meta.description ?? "",
			url: pages[0].url,
			items,
			pages
		})
	}

	for (const path of mdxFilesIn(contentDir).sort()) {
		const section = relative(contentDir, path).split(sep)[0]
		loadPage(path, section.endsWith(".mdx") ? "" : section)
	}

	const pages = [
		...listed,
		...[...pagesByPath.values()].filter(page => !page.listed)
	]
	const pageByUrl = new Map<string, Page>()
	for (const page of pages) {
		const duplicate = pageByUrl.get(page.url)
		if (duplicate) {
			errors.push(
				`${contentPath(contentDir, page.path)} and ${contentPath(contentDir, duplicate.path)} both have the url ${page.url}`
			)
		} else pageByUrl.set(page.url, page)
	}

	return { sections, pages, pageByUrl, errors, warnings }
}

export type Neighbors = { previous?: Page; next?: Page }

/** the pages before and after a listed page in its section's navigation order */
export const neighborsOf = (tree: PageTree, page: Page): Neighbors => {
	const pages = sectionOf(tree, page)?.pages
	const i = pages?.indexOf(page) ?? -1
	if (!pages || i === -1) return {}
	return { previous: pages[i - 1], next: pages[i + 1] }
}

export const sectionOf = (tree: PageTree, page: Page): Section | undefined =>
	tree.sections.find(section => section.id === page.section)
