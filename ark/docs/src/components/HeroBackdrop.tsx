import React from "react"
import { FloatYourBoat } from "./FloatYourBoat.tsx"
import { PlatformCloud } from "./PlatformCloud.tsx"

// workaround for compatibility issue between MDX and Astro
declare module "react" {
	// T must be present to match type params of base type
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface HTMLAttributes<T> {
		class?: string
	}
}

// workaround for compatibility issue between MDX and Astro,
// allows specifying this directive as a prop
export type HeroBackdropProps = {
	"client:only": "react"
}

export type HeroBackdropComponent = (
	props: HeroBackdropProps
) => React.JSX.Element

export const HeroBackdrop: HeroBackdropComponent = () => (
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
