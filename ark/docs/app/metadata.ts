import type { Metadata } from "next"
import { claims, draftOf } from "../lib/claims.ts"

export const siteUrl = "https://arktype.io"

/** the homepage's headline, which claims.ts checks against the benchmarks */
export const tagline = draftOf(claims.headline).replace(/\.$/, "")

export type MetadataOptions = {
	/** the page's own title; the root layout's template adds " · ArkType" */
	title?: string
	description?: string
	ogImage?: string
	/** what the card shows, for readers who can't see it */
	ogImageAlt?: string
	/** the page's path, for og:url, e.g. "/playground" */
	url?: string
}

export const defineMetadata = ({
	title,
	description = tagline,
	ogImage = "og.png",
	ogImageAlt,
	url = ""
}: MetadataOptions): Metadata => ({
	...(title && { title }),
	description,
	openGraph: {
		title: title ?? "ArkType",
		description,
		url: `${siteUrl}${url}`,
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
		card: "summary_large_image"
	}
})
