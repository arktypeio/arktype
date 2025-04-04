"use client"

import { HomeLayout } from "fumadocs-ui/layouts/home"
import type { ReactNode } from "react"
import { FloatYourBoat } from "../../components/FloatYourBoat.tsx"
import { Playground } from "../../components/playground/Playground.tsx"
import {
	decodePlaygroundCode,
	defaultPlaygroundCode
} from "../../components/playground/utils.ts"
import { baseOptions } from "../layout.config.tsx"

export type LayoutProps = {
	children: ReactNode
}

export default function PlaygroundPage() {
	let initialValue = defaultPlaygroundCode

	if (globalThis.window?.location.search) {
		// decode initial contents from URL
		const params = new URLSearchParams(window.location.search)
		const encodedCode = params.get("code")
		if (encodedCode) initialValue = decodePlaygroundCode(encodedCode)
	}

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
					<Playground initialValue={initialValue} withResults={true} />
				</div>
			</div>
		</HomeLayout>
	)
}
