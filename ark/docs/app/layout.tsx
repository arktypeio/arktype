import "fumadocs-twoslash/twoslash.css"
import { RootProvider } from "fumadocs-ui/provider"
import { Atkinson_Hyperlegible, Raleway } from "next/font/google"
import type { ReactNode } from "react"
import { ReleaseBanner } from "../components/ReleaseBanner.tsx"
import "./global.css"
import { defineMetadata } from "./metadata.ts"
import { CSPostHogProvider } from "./providers.tsx"

const raleway = Raleway({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-raleway"
})

const atkinson = Atkinson_Hyperlegible({
	weight: ["400", "700"],
	subsets: ["latin"],
	display: "swap",
	variable: "--font-atkinson"
})

export const metadata = defineMetadata({})

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="en"
			className={`dark ${raleway.variable} ${atkinson.variable}`}
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
