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
			{useIsMobile() ? null : (
				<LogoCloud names={["typescript", "vscode", "intellij", "vim"]} />
			)}
			{useIsMobile() ? null : (
				<LogoCloud names={["javascript", "chromium", "node", "deno"]} />
			)}
			<Boat />
		</header>
	)
}
