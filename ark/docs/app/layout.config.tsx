import {
	SiBluesky,
	SiDiscord,
	SiTwitch,
	SiX
} from "@icons-pack/react-simple-icons"
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"
import { ArkTypeLogo } from "../components/icons/arktype-logo.tsx"

export const baseOptions: BaseLayoutProps = {
	nav: {
		title: <ArkTypeLogo />
	},
	themeSwitch: {
		enabled: false
	},
	githubUrl: "https://github.com/arktypeio/arktype",
	links: [
		{
			text: "Twitch",
			type: "icon",
			icon: <SiTwitch />,
			url: "https://twitch.tv/arktypeio"
		},
		{
			text: "Bluesky",
			type: "icon",
			icon: <SiBluesky />,
			url: "https://bsky.app/profile/arktype.io"
		},
		{
			text: "X",
			type: "icon",
			icon: <SiX />,
			url: "https://x.com/arktypeio"
		},
		{
			text: "Discord",
			type: "icon",
			icon: <SiDiscord />,
			url: "https://arktype.io/discord"
		}
	]
}
