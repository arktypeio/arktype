import React from "react"
import { FloatYourBoat } from "./FloatYourBoat.js"
import { PlatformCloud } from "./PlatformCloud.js"

export const HeroAnimation = () => (
	<>
		<div
			style={{
				position: "relative",
				bottom: 200,
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
	</>
)
