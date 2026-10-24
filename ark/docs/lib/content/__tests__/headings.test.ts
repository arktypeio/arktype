/* eslint-disable @typescript-eslint/no-restricted-imports -- the docs aren't a
   package with entrypoints, so tests import their modules directly */
import { attest, contextualize } from "@ark/attest"
import type { Root } from "mdast"
import remarkMdx from "remark-mdx"
import remarkParse from "remark-parse"
import { unified } from "unified"
import { apiDocsByGroup } from "../../../components/apiData.ts"
import { apiMemberId, expandComponents } from "../expand.ts"
import { collectHeadings } from "../headings.ts"

const parse = (markdown: string) =>
	unified().use(remarkParse).use(remarkMdx).parse(markdown) as Root

const headingsOf = (markdown: string) => collectHeadings(parse(markdown))

contextualize(() => {
	it("slugs headings and suffixes duplicates", () => {
		const { toc } = headingsOf("## Foo\n\n## Foo\n\n### Bar `baz`!")
		attest(toc).snap([
			{ depth: 2, title: "Foo", id: "foo" },
			{ depth: 2, title: "Foo", id: "foo-1" },
			{ depth: 3, title: "Bar baz!", id: "bar-baz" }
		])
	})

	it("custom ids are used verbatim and removed from the text", () => {
		const { toc } = headingsOf("## Some Title [#Custom_id]")
		attest(toc).snap([{ depth: 2, title: "Some Title", id: "Custom_id" }])
	})

	it("a generated slug never takes a custom id, even an earlier one", () => {
		const { toc } = headingsOf("## Install\n\n### Later [#install]")
		attest(toc.map(entry => entry.id)).snap(["install-1", "install"])
	})

	it("toc holds depths 2 and 3", () => {
		const { toc } = headingsOf("# One\n\n## Two\n\n### Three\n\n#### Four")
		attest(toc.map(entry => entry.depth)).equals([2, 3])
	})

	it("search sections split at headings and skip code", () => {
		const { sections } = headingsOf(
			"Intro `inline`.\n\n## First\n\nText *here*.\n\n```ts\nconst skipped = 1\n```\n\n## Empty"
		)
		attest(sections).snap([
			{ heading: "", id: "", text: "Intro inline." },
			{ heading: "First", id: "first", text: "Text here." },
			{ heading: "Empty", id: "empty", text: "" }
		])
	})

	it("search headings below depth 2 name their parent", () => {
		const { sections } = headingsOf(
			"## Union\n\n### n-ary\n\n#### Deep\n\n## Pipe\n\n### n-ary\n\n#### Skipped"
		)
		attest(sections.map(section => section.heading)).snap([
			"Union",
			"Union · n-ary",
			"n-ary · Deep",
			"Pipe",
			"Pipe · n-ary",
			"n-ary · Skipped"
		])
	})

	it("ApiTable members are headings below the current one", () => {
		const tree = parse('## Members\n\n<ApiTable group="Traversal" />')
		expandComponents(tree)
		const { toc } = collectHeadings(tree)
		const members = apiDocsByGroup.Traversal
		attest(toc.length).equals(members.length + 1)
		attest(toc.slice(1).every(entry => entry.depth === 3)).equals(true)
		attest(toc.slice(1).map(entry => entry.id)).equals(
			members.map(member => apiMemberId(member.name))
		)
	})
})
