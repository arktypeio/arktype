import "app/global.css"
import "fumadocs-twoslash/twoslash.css"
import { RootProvider } from "fumadocs-ui/provider"
import type { Metadata } from "next"
import { Raleway } from "next/font/google"
import type { ReactNode } from "react"
import { ReleaseBanner } from "../components/ReleaseBanner.tsx"
import { CSPostHogProvider } from "./providers.tsx"

const raleway = Raleway({
	subsets: ["latin"]
})

export const metadata: Metadata = {
	title:
		"ArkType: TypeScript's 1:1 validator, optimized from editor to runtime",
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
		title: "ArkType",
		description: "TypeScript's 1:1 validator, optimized from editor to runtime",
		url: "https://arktype.io/",
		siteName: "ArkType",
		images: [
			{
				url: "https://arktype.io/image/og.png",
				width: 1200,
				height: 600,
				alt: "ArkType Logo"
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
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="en"
			className={`dark ${raleway.className}`}
			suppressHydrationWarning
		>
			<body className="flex flex-col min-h-screen">
				<RootProvider
					search={{
						options: {
							type: "static"
						}
					}}
					theme={{
						enabled: false,
						enableSystem: false
					}}
				>
					<CSPostHogProvider>
						<ReleaseBanner />
						{children}
					</CSPostHogProvider>
				</RootProvider>
			</body>
		</html>
	)
}
