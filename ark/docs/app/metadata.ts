import type { Metadata } from "next"

export type MetadataOptions = {
	title?: string
	ogImage?: string
}

export const defineMetadata = ({
	title = "ArkType",
	ogImage = "og.png"
}: MetadataOptions): Metadata => ({
	title: `${title}: TypeScript's 1:1 validator, optimized from editor to runtime`,
	description: "TypeScript's 1:1 validator, optimized from editor to runtime",
	keywords: [
		"ArkType",
		"TypeScript",
		"JavaScript",
		"runtime validation",
		"schema",
		"type-safe",
		"validator",
		"syntax"
	],
	openGraph: {
		title,
		description: "TypeScript's 1:1 validator, optimized from editor to runtime",
		url: "https://arktype.io/",
		siteName: "ArkType",
		images: [
			{
				url: `https://arktype.io/image/${ogImage}`,
				width: 1200,
				height: 600
			}
		],
		type: "website"
	},
	twitter: {
		card: "summary_large_image"
	},
	icons: {
		icon: "/image/favicon.svg"
	}
})
