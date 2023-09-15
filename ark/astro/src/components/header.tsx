import React from "react"
import { Boat } from "./boat.js"
import { LogoCloud } from "./logoCloud.js"
import { useIsMobile } from "./utils.js"

export const Header = ({ title, tagline }: Record<string, string>) => {
	return (
		<header
			style={{
				height: "10rem",
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "center"
			}}
		>
			<LogoCloud main="ts" right="vscode" top="neovim" bottom="intellij" />
			<LogoCloud main="js" right="chromium" top="node" bottom="deno" />
			{/* <Boat /> */}
		</header>
	)
}
