import { HomeLayout } from "fumadocs-ui/layouts/home"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { FloatYourBoat } from "../../components/FloatYourBoat.tsx"
import { Playground } from "../../components/playground/Playground.tsx"
import { baseOptions } from "../layout.config.tsx"

export type LayoutProps = {
	children: ReactNode
}

export const metadata: Metadata = {
	title:
		"ArkType Playground: TypeScript's 1:1 validator, optimized from editor to runtime",
	openGraph: {
		title: "ArkType Playground",
		images: "https://arktype.io/image/ogPlayground.png"
	}
}

export default function PlaygroundPage() {
	return (
		<HomeLayout
			{...baseOptions}
			style={{
				paddingLeft: "1rem",
				paddingRight: "1rem",
				display: "flex",
				flexDirection: "column",
				height: "100vh"
			}}
			nav={{
				...baseOptions.nav,
				children: <FloatYourBoat kind="header" />
			}}
		>
			<div className="flex-1 flex flex-col items-center justify-center py-8">
				<div className="w-[90vw] h-[80vh]">
					<Playground withResults={true} />
				</div>
			</div>
		</HomeLayout>
	)
}
