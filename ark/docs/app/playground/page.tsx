import { HomeLayout } from "fumadocs-ui/layouts/home"
import type { ReactNode } from "react"
import { FloatYourBoat } from "../../components/FloatYourBoat.tsx"
import { Playground } from "../../components/playground/Playground.tsx"
import { defaultPlaygroundCode } from "../../components/playground/utils.ts"
import { baseOptions } from "../layout.config.tsx"

export type LayoutProps = {
	children: ReactNode
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
				height: "100vh" // Make the layout take the full viewport height
			}}
			nav={{
				...baseOptions.nav,
				children: <FloatYourBoat kind="header" />
			}}
		>
			<div className="flex-1 flex flex-col items-center justify-center py-8">
				<div className="w-[80vw] h-[80vh]">
					<Playground initialValue={defaultPlaygroundCode} withResults={true} />
				</div>
			</div>
		</HomeLayout>
	)
}
