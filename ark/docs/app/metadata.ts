import type { Metadata } from "next"

export const siteUrl = "https://arktype.io"

export const tagline =
	"TypeScript's 1:1 validator, optimized from editor to runtime"

export type MetadataOptions = {
	/** the page's own title; the root layout's template adds " · ArkType" */
	title?: string
	description?: string
	ogImage?: string
	/** the page's path, for og:url, e.g. "/playground" */
	url?: string
}

export const defineMetadata = ({
	title,
	description = tagline,
	ogImage = "og.png",
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
