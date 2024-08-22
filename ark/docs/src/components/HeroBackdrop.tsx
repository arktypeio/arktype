import React from "react"
import { FloatYourBoat } from "./FloatYourBoat.js"
import { PlatformCloud } from "./PlatformCloud.js"

// workaround for compatibility issue between MDX and Astro,
// allows specifying this directive as a prop
export type HeroBackdropProps = {
	"client:only": "react"
}

declare module "react" {
	interface HTMLAttributes<T> {
		class?: string
	}
}

export const HeroBackdrop = (props: HeroBackdropProps) => (
	<div
		style={{
			position: "absolute",
			top: "3rem",
			left: 0,
			width: "100vw"
		}}
	>
		<div
			style={{
				display: " flex",
				flexDirection: "row",
				justifyContent: "space-between"
			}}
		>
			<PlatformCloud main="ts" right="vscode" top="neovim" left="intellij" />
			<PlatformCloud main="js" right="chromium" top="node" left="bun" />
		</div>
		<FloatYourBoat />
	</div>
)
