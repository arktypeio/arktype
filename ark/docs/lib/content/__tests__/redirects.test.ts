/* eslint-disable @typescript-eslint/no-restricted-imports -- the docs aren't a
   package with entrypoints, so tests import their modules directly */
import { attest, contextualize } from "@ark/attest"
import { readFileSync } from "node:fs"
import { getPageTree } from "../docs.ts"
import { parseMdx } from "../frontmatter.ts"
import type { Page, PageTree } from "../pageTree.ts"
import {
	checkRedirects,
	hashRedirects,
	hashRedirectTarget,
	redirects,
	redirectTarget
} from "../redirects.ts"
import { searchSectionsOf } from "../search.ts"

const treeWith = (...urls: string[]): PageTree => ({
	sections: [],
	pages: [],
	pageByUrl: new Map(urls.map(url => [url, { url } as Page])),
	errors: [],
	warnings: []
})

const targets = [
	...new Set(
		[...Object.values(redirects), ...Object.values(hashRedirects)].map(url =>
			url.replace(/#.*$/, "")
		)
	)
]

contextualize(() => {
	it("ignores hashes and trailing slashes", () => {
		attest(redirectTarget("/docs/introspection#select")).equals(
			"/docs/internals/nodes"
		)
		attest(redirectTarget("/docs/")).equals("/docs/intro/setup")
		attest(redirectTarget("/docs/faq")).equals(undefined)
	})

	it("follows a moved section by path and hash", () => {
		attest(
			hashRedirectTarget("/docs/traversal-api/", "#TraversalError")
		).equals("/docs/errors#traversalerror")
		attest(hashRedirectTarget("/docs/traversal-api", "#members")).equals(
			undefined
		)
		attest(hashRedirectTarget("/docs/traversal-api", "")).equals(undefined)
	})

	it("flags missing targets and shadowed sources", () => {
		const problems = checkRedirects(
			treeWith(
				"/docs/comparisons",
				"/docs/configuration",
				...targets.filter(url => url !== "/docs/intro/setup")
			),
			url =>
				new Set([
					...(url === "/docs/configuration" ? ["serialization"] : []),
					...Object.values(hashRedirects)
						.filter(to => to.startsWith(`${url}#`))
						.map(to => to.slice(url.length + 1))
						.filter(id => id !== "traversalerror")
				])
		)
		attest(problems).snap([
			"redirect /docs -> /docs/intro/setup points at a page that doesn't exist",
			"redirect /docs/intro -> /docs/intro/setup points at a page that doesn't exist",
			"redirect /docs/comparisons -> /docs/faq shadows the page at /docs/comparisons",
			"redirect /docs/configuration#serialization -> /docs/errors#arkerrors shadows the heading at /docs/configuration#serialization",
			"redirect /docs/traversal-api#traversalerror -> /docs/errors#traversalerror points at a heading that doesn't exist"
		])
	})

	it("every redirect in the docs resolves", () => {
		const tree = getPageTree()
		const idsOf = (url: string) => {
			const { body } = parseMdx(
				readFileSync(tree.pageByUrl.get(url)!.path, "utf8")
			)
			return new Set(searchSectionsOf(body).map(section => section.id))
		}
		attest(checkRedirects(tree, idsOf)).equals([])
	})
})
