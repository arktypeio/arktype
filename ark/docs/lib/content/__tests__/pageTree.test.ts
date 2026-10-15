/* eslint-disable @typescript-eslint/no-restricted-imports -- the docs aren't a
   package with entrypoints, so tests import their modules directly */
import { attest, contextualize } from "@ark/attest"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import {
	buildPageTree,
	neighborsOf,
	type NavItem,
	type PageTree
} from "../pageTree.ts"

const page = (title: string, description = `About ${title}.`) =>
	`---\ntitle: ${title}\ndescription: ${description}\n---\n\nBody.\n`

const fixtureTree = (files: Record<string, unknown>): PageTree => {
	const dir = mkdtempSync(join(tmpdir(), "ark-docs-tree-"))
	try {
		for (const [path, contents] of Object.entries(files)) {
			mkdirSync(dirname(join(dir, path)), { recursive: true })
			writeFileSync(
				join(dir, path),
				typeof contents === "string" ? contents : JSON.stringify(contents)
			)
		}
		return buildPageTree(dir)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
}

const outline = (items: NavItem[], indent = ""): string[] =>
	items.flatMap(item =>
		item.kind === "separator" ? [`${indent}--- ${item.title}`]
		: item.kind === "link" ? [`${indent}link ${item.title} ${item.url}`]
		: item.kind === "page" ? [`${indent}page ${item.page.url}`]
		: [
				`${indent}folder ${item.title} ${item.index?.url ?? "(no index)"}`,
				...outline(item.items, `${indent}  `)
			]
	)

const docs = {
	"meta.json": { pages: ["(main)", "extra"] },
	"(main)/meta.json": {
		root: true,
		title: "Main",
		description: "The main section",
		pages: [
			"---Start---",
			"intro/setup",
			"guide",
			"---Reference---",
			"api",
			"[Elsewhere](/docs/api#elsewhere)"
		]
	},
	"(main)/intro/setup.mdx": page("Setup"),
	"(main)/guide/meta.json": {
		title: "Guide",
		icon: "Advanced",
		pages: ["details", "[anchor](/docs/guide#anchor)"]
	},
	"(main)/guide/index.mdx": page("Guide"),
	"(main)/guide/details.mdx": page("Details"),
	"(main)/api.mdx": page("API"),
	"(main)/hidden.mdx": page("Hidden"),
	"extra/meta.json": {
		root: true,
		title: "Extra",
		pages: ["index", "more"]
	},
	"extra/index.mdx": page("Extra"),
	"extra/more.mdx": page("More")
}

contextualize(() => {
	it("orders sections and items by meta.json", () => {
		const tree = fixtureTree(docs)
		attest(tree.sections.map(section => [section.id, section.url])).snap([
			["(main)", "/docs/intro/setup"],
			["extra", "/docs/extra"]
		])
		attest(outline(tree.sections[0].items)).snap([
			"--- Start",
			"page /docs/intro/setup",
			"folder Guide /docs/guide",
			"  page /docs/guide/details",
			"  link anchor /docs/guide#anchor",
			"--- Reference",
			"page /docs/api",
			"link Elsewhere /docs/api#elsewhere"
		])
		attest(tree.errors).equals([])
		attest(tree.warnings).equals([])
	})

	it("navigation order skips links and separators", () => {
		const tree = fixtureTree(docs)
		attest(tree.sections[0].pages.map(page => page.url)).snap([
			"/docs/intro/setup",
			"/docs/guide",
			"/docs/guide/details",
			"/docs/api"
		])
		const details = tree.pageByUrl.get("/docs/guide/details")!
		const { previous, next } = neighborsOf(tree, details)
		attest([previous?.url, next?.url]).snap(["/docs/guide", "/docs/api"])
	})

	it("neighbors stop at a section's ends", () => {
		const tree = fixtureTree(docs)
		const setup = tree.pageByUrl.get("/docs/intro/setup")!
		const api = tree.pageByUrl.get("/docs/api")!
		attest(neighborsOf(tree, setup).previous).equals(undefined)
		attest(neighborsOf(tree, api).next).equals(undefined)
	})

	it("unlisted pages are built but not navigable", () => {
		const tree = fixtureTree(docs)
		const hidden = tree.pageByUrl.get("/docs/hidden")!
		attest(hidden.listed).equals(false)
		attest(tree.pages.at(-1)).equals(hidden)
		attest(
			tree.sections.some(section => section.pages.includes(hidden))
		).equals(false)
		attest(neighborsOf(tree, hidden)).equals({})
	})

	it("folder icon comes from its meta.json", () => {
		const tree = fixtureTree(docs)
		const folder = tree.sections[0].items.find(item => item.kind === "folder")
		attest(folder?.kind === "folder" && folder.icon).equals("Advanced")
	})

	it("missing entries are warnings", () => {
		const tree = fixtureTree({
			...docs,
			"extra/meta.json": {
				root: true,
				title: "Extra",
				pages: ["index", "gone"]
			}
		})
		attest(tree.warnings).snap([
			'extra/meta.json lists "gone", which doesn\'t exist'
		])
		attest(tree.errors).equals([])
	})

	it("invalid frontmatter is an error", () => {
		const tree = fixtureTree({
			...docs,
			"(main)/api.mdx": "---\ntitle: API\n---\n",
			"(main)/hidden.mdx":
				"---\ntitle: Hidden\ndescription: x\nicon: Old\n---\n"
		})
		attest(tree.errors).snap([
			"(main)/api.mdx: description must be a string (was missing)",
			'(main)/hidden.mdx: icon must be "Advanced" or "New" (was "Old")'
		])
	})

	it("pages with the same url are an error", () => {
		const tree = fixtureTree({
			...docs,
			"extra/more/index.mdx": page("More again")
		})
		attest(tree.errors).snap([
			"extra/more/index.mdx and extra/more.mdx both have the url /docs/extra/more"
		])
	})
})
