"use client"

import { HomeLayout } from "fumadocs-ui/layouts/home"
import type { ReactNode } from "react"
import { FloatYourBoat } from "../../components/FloatYourBoat.tsx"
import { Playground } from "../../components/Playground.tsx"
import { baseOptions } from "../layout.config.tsx"

export type LayoutProps = {
	children: ReactNode
}

export default function PlaygroundPage() {
	return (
		<HomeLayout
			{...baseOptions}
			nav={{
				...baseOptions.nav,
				children: <FloatYourBoat kind="header" />
			}}
		>
			<div className="playground-container">
				<Playground
					visible={true}
					fullHeight={true}
					className="full-screen-playground"
				/>
			</div>
			<style jsx>{`
				.playground-container {
					height: calc(100vh - 150px);
					padding: 1rem;
				}
				@media (max-width: 768px) {
					.playground-page {
						padding: 0.5rem;
					}
					.playground-header h1 {
						font-size: 1.5rem;
					}
				}
			`}</style>
		</HomeLayout>
	)
}
