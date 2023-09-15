import React from "react"
import { FloatYourBoat } from "./FloatYourBoat.js"
import { PlatformCloud } from "./PlatformCloud.js"

export const HeroContents = () => (
	<div
		style={{
			position: "absolute",
			top: "2rem",
			left: 0,
			height: "100%",
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
			<PlatformCloud main="ts" right="vscode" top="neovim" bottom="intellij" />
			<PlatformCloud main="js" right="chromium" top="node" bottom="deno" />
		</div>
		<FloatYourBoat />
	</div>
)
