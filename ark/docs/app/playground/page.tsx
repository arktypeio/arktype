"use client"

import { HomeLayout } from "fumadocs-ui/layouts/home"
import type { ReactNode } from "react"
import { FloatYourBoat } from "../../components/FloatYourBoat.tsx"
import { Playground } from "../../components/playground/Playground.tsx"
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
				paddingRight: "1rem"
			}}
			nav={{
				...baseOptions.nav,
				children: <FloatYourBoat kind="header" />
			}}
		>
			<Playground />
		</HomeLayout>
	)
}
