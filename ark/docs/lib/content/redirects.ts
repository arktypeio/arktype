import type { PageTree } from "./pageTree.ts"

/** urls that no longer have a page of their own, and where they went */
export const redirects: Readonly<Record<string, string>> = {
	"/docs": "/docs/intro/setup",
	"/docs/intro": "/docs/intro/setup",
	"/docs/comparisons": "/docs/faq",
	"/docs/dynamic-vs-precompiled": "/docs/precompile/dynamic-vs-precompiled",
	"/docs/internal": "/docs/internals/nodes",
	"/docs/introspection": "/docs/internals/nodes"
}

/**
 * Sections that moved to another page while the page they were on stayed.
 * A server never sees a hash, so these are followed in the browser.
 */
export const hashRedirects: Readonly<Record<string, string>> = {
	"/docs/attest/integration#ts-versions": "/docs/attest#typescript-versions",
	"/docs/configuration#arkerrors": "/docs/errors#arkerrors",
	"/docs/configuration#clone": "/docs/upgrading#the-clone-option-is-removed",
	"/docs/configuration#serialization": "/docs/errors#arkerrors",
	"/docs/generics#chained": "/docs/generics#keywords",
	"/docs/generics#constrained-parameters": "/docs/generics#constraints",
	"/docs/generics#invocation": "/docs/generics#keywords",
	"/docs/generics#invoked": "/docs/generics#keywords",
	"/docs/integrations#as-definitions":
		"/docs/standard-schema#other-validators-in-a-definition",
	"/docs/integrations#json-schema": "/docs/json-schema/to-json-schema",
	"/docs/integrations#json-schema-to-type":
		"/docs/json-schema/from-json-schema",
	"/docs/integrations#standard-schema": "/docs/standard-schema",
	"/docs/integrations#type-to-json-schema": "/docs/json-schema/to-json-schema",
	"/docs/intro/setup#extension-optional": "/docs/editor#vs-code",
	"/docs/intro/setup#extension-optional-1": "/docs/editor#jetbrains-ides",
	"/docs/intro/setup#jetbrains-ides": "/docs/editor#jetbrains-ides",
	"/docs/intro/setup#other-editors": "/docs/editor#other-editors",
	"/docs/intro/setup#settings": "/docs/editor#vs-code",
	"/docs/intro/setup#vscode": "/docs/editor#vs-code",
	"/docs/match#narrowing-input-with-in-property-matching-with-at":
		"/docs/match#input-with-in",
	"/docs/primitives#keywords": "/docs/primitives#string-keywords",
	"/docs/traversal-api#assert": "/docs/validation#assert",
	"/docs/traversal-api#allows": "/docs/validation#allows",
	"/docs/traversal-api#invoking-a-type-directly":
		"/docs/validation#calling-a-type",
	"/docs/traversal-api#arkerrors": "/docs/errors#arkerrors",
	"/docs/traversal-api#traversalerror": "/docs/errors#traversalerror"
}

const withoutTrailingSlash = (path: string) => path.replace(/(.)\/$/, "$1")

/** where a url redirects, ignoring any hash or trailing slash */
export const redirectTarget = (url: string): string | undefined =>
	redirects[withoutTrailingSlash(url.replace(/#.*$/, ""))]

/** where a path and hash, like location's, redirect */
export const hashRedirectTarget = (
	pathname: string,
	hash: string
): string | undefined =>
	hash ?
		hashRedirects[`${withoutTrailingSlash(pathname)}${hash.toLowerCase()}`]
	:	undefined

const splitHash = (url: string) => {
	const i = url.indexOf("#")
	return i === -1 ?
			{ path: url, id: "" }
		:	{ path: url.slice(0, i), id: url.slice(i + 1) }
}

/**
 * Redirects that would be broken: a target with no page, or a source that
 * still has one (which the redirect would hide). For hash redirects, pass
 * `idsOf` to also check the heading ids on either end.
 */
export const checkRedirects = (
	tree: PageTree,
	idsOf?: (url: string) => ReadonlySet<string>
): string[] => [
	...Object.entries(redirects).flatMap(([from, to]) => [
		...(tree.pageByUrl.has(to.replace(/#.*$/, "")) ?
			[]
		:	[`redirect ${from} -> ${to} points at a page that doesn't exist`]),
		...(tree.pageByUrl.has(from) ?
			[`redirect ${from} -> ${to} shadows the page at ${from}`]
		:	[])
	]),
	...Object.entries(hashRedirects).flatMap(([from, to]) => {
		const source = splitHash(from)
		const target = splitHash(to)
		if (!tree.pageByUrl.has(target.path))
			return [`redirect ${from} -> ${to} points at a page that doesn't exist`]
		if (!idsOf) return []
		return [
			...(!target.id || idsOf(target.path).has(target.id) ?
				[]
			:	[`redirect ${from} -> ${to} points at a heading that doesn't exist`]),
			...(tree.pageByUrl.has(source.path) && idsOf(source.path).has(source.id) ?
				[`redirect ${from} -> ${to} shadows the heading at ${from}`]
			:	[])
		]
	})
]
