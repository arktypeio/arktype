import type { MetadataRoute } from "next"
import { getPageTree } from "../lib/content/docs.ts"
import { siteUrl } from "./metadata.ts"

export const dynamic = "force-static"

/** every page of its own: the homepage, the playground and the docs, redirects left out */
export default (): MetadataRoute.Sitemap =>
	["/", "/playground", ...getPageTree().pages.map(page => page.url)].map(
		url => ({ url: `${siteUrl}${url}` })
	)
