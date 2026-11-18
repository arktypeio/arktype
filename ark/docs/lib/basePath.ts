/**
 * The path the site is served under: "" at arktype.io, or "/3" while 3.0 is
 * a prerelease, whose docs publish.yml serves at arktype.io/3 beside the
 * stable ones. Set with NEXT_PUBLIC_BASE_PATH at build time, which Next
 * inlines into client code.
 *
 * Next prefixes it to every next/link href and router navigation, but not to
 * anything else that's root-relative: a plain <a>, a fetch, a Worker, a meta
 * refresh, a metadata icon or a CSS url(). Those go through withBase, and a
 * location.pathname goes through withoutBase before it's compared to a page's
 * url.
 */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

/** a root-relative path as it's served, e.g. /3/llms.txt for /llms.txt */
export const withBase = (path: string): string =>
	path.startsWith("/") ? `${basePath}${path}` : path

/** a served pathname, like location.pathname, as the page url it serves */
export const withoutBase = (pathname: string): string =>
	basePath && pathname.startsWith(basePath) ?
		pathname.slice(basePath.length) || "/"
	:	pathname
