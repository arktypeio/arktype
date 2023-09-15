import { Card, CardGrid, TabItem, Tabs } from "@astrojs/starlight/components"
import { motion, useAnimation, useScroll } from "framer-motion"
import React from "react"

export const FloatingInstallationBlock = () => {
	const { scrollY } = useScroll()
	const controls = useAnimation()
	const initial = {
		position: "absolute",
		top: 60,
		width: 350
	} as const satisfies Parameters<(typeof controls)["start"]>[0]
	scrollY.on("change", (value) => {
		controls.start(
			value ? { position: "fixed", top: "50%", width: 250 } : initial
		)
	})
	return (
		<motion.div style={{ right: 0 }} initial={initial} animate={controls}>
			<InstallationBlock />
		</motion.div>
	)
}

export const MobileInstallationBlock = () => (
	<div style={{ width: "100%" }}>
		<InstallationBlock />
	</div>
)

const InstallationBlock = () => (
	<Card
		style={{
			margin: ".5rem",
			padding: ".7rem 1rem 0rem",
			backgroundColor: "#ffffff00",
			backdropFilter: "blur(1px)",
			borderRadius: "2rem",
			zIndex: 1,
			fontFamily: `"Cascadia Code", sans-serif`
		}}
		elevation={8}
	>
		<Tabs className="installationTabs">
			<TabItem value="npm" attributes={{ className: "npmTab" }}>
				npm install arktype
			</TabItem>
			<TabItem value="pnpm" attributes={{ className: "pnpmTab" }}>
				pnpm add arktype
			</TabItem>
			<TabItem value="yarn" attributes={{ className: "yarnTab" }}>
				yarn add arktype
			</TabItem>
		</Tabs>
	</Card>
)
