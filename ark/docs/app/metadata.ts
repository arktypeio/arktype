import type { Metadata } from "next"
import { basePath } from "../lib/basePath.ts"
import { claims, draftOf } from "../lib/claims.ts"

/** where the site is served, with its base path, e.g. https://arktype.io/3 */
export const siteUrl = `https://arktype.io${basePath}`

/** the homepage's headline, which claims.ts checks against the benchmarks */
export const tagline = draftOf(claims.headline).replace(/\.$/, "")

/** the tagline as a description carries it, as package.json's and the README's do: the headline, then what switching costs */
export const siteDescription = `${tagline}. One prompt away.`

export type MetadataOptions = {
	/** the page's own title; the root layout's template adds " · ArkType" */
	title?: string
	description?: string
	ogImage?: string
	/** what the card shows, for readers who can't see it */
	ogImageAlt?: string
	/** the page's path, for og:url and the canonical link, e.g. "/playground" */
	url?: string
	/** the title a shared link's card shows, if not `title` */
	sharedTitle?: string
}

export const defineMetadata = ({
	title,
	description = siteDescription,
	ogImage = "og.png",
	ogImageAlt,
	url,
	sharedTitle = title ?? "ArkType"
}: MetadataOptions): Metadata => ({
	...(title && { title }),
	description,
	...(url && { alternates: { canonical: url } }),
	// a prerelease's docs at arktype.io/3 stay out of search results, which
	// should keep sending readers to the stable docs
	...(basePath && { robots: { index: false, follow: false } }),
	openGraph: {
		title: sharedTitle,
		description,
		url: `${siteUrl}${url ?? ""}`,
		siteName: "ArkType",
		images: [
			{
				url: `${siteUrl}/image/${ogImage}`,
				...(ogImageAlt && { alt: ogImageAlt }),
				width: 1200,
				height: 600
			}
		],
		type: "website"
	},
	twitter: {
		card: "summary_large_image",
		title: sharedTitle
	}
})
