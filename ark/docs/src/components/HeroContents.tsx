import React from "react"
import { FloatYourBoat } from "./FloatYourBoat.js"
import { PlatformCloud } from "./PlatformCloud.js"

export const HeroContents = () => (
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
				flexBasis: "row",
				justifyContent: "space-between"
			}}
		>
			<PlatformCloud main="ts" right="vscode" top="neovim" left="intellij" />
			<PlatformCloud main="js" right="chromium" top="node" left="bun" />
		</div>
		<FloatYourBoat />
	</div>
)
