import "app/global.css"
import "fumadocs-twoslash/twoslash.css"
import { RootProvider } from "fumadocs-ui/provider"
import { Raleway } from "next/font/google"
import type { ReactNode } from "react"
import { ReleaseBanner } from "../components/ReleaseBanner.tsx"
import { defineMetadata } from "./metadata.ts"
import { CSPostHogProvider } from "./providers.tsx"

const raleway = Raleway({
	subsets: ["latin"]
})

export const metadata = defineMetadata({})

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
