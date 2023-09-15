import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"
import react from "@astrojs/react"

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: "ArkType",
			social: {
				twitch: "https://twitch.tv/arktypeio",
				twitter: "https://twitter.com/arktypeio",
				discord: "https://arktype.io/discord",
				github: "https://github.com/arktypeio/arktype"
			},
			sidebar: [
				{
					label: "Guides",
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: "Example Guide", link: "/guides/example/" }
					]
				},
				{
					label: "Reference",
					autogenerate: { directory: "reference" }
				}
			]
		}),
		react()
	]
})
