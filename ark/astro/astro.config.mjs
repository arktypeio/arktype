import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: "My Docs",
			social: {
				discord: "https://arktype.io/discord",
				github: "https://github.com/arktypeio/arktype",
				twitch: "https://twitch.tv/arktypeio",
				twitter: "https://twitter.com/arktypeio"
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
		})
	]
})
