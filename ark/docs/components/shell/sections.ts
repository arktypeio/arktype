import type {
	NavItem,
	Page,
	PageTree,
	Section
} from "../../lib/content/pageTree.ts"

/** what each section is for, in the drawer's section switcher */
const blurbs: Record<string, string> = {
	"(arktype)": "the validator",
	precompile: "validators at build time",
	regex: "regex with types",
	attest: "type-level testing",
	"json-schema": "both directions",
	sets: "set algebra, any format",
	internals: "nodes and schemas"
}

export type DocsSection = {
	id: string
	title: string
	url: string
	blurb: string
}

/** the sections in the switcher; the blog is a top nav link instead */
export const docsSectionsOf = (tree: PageTree): DocsSection[] =>
	tree.sections
		.filter(section => section.id !== "blog")
		.map(section => ({
			id: section.id,
			title: section.title,
			url: section.url,
			blurb: blurbs[section.id] ?? section.description
		}))

/** whether a page is a navigation item or inside one */
export const containsPage = (item: NavItem, page: Page): boolean =>
	(item.kind === "page" && item.page === page) ||
	(item.kind === "folder" &&
		(item.index === page ||
			item.items.some(child => containsPage(child, page))))

/** the title of the sidebar group (a `---Label---` separator) a page is in */
export const groupTitleOf = (
	section: Section,
	page: Page
): string | undefined => {
	let group: string | undefined
	for (const item of section.items) {
		if (item.kind === "separator") group = item.title
		else if (containsPage(item, page)) return group
	}
}
