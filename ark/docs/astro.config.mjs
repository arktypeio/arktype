import react from "@astrojs/react"
import starlight from "@astrojs/starlight"
import { defineConfig } from "astro/config"

// https://astro.build/config
export default defineConfig({
	outDir: "out",
	integrations: [
		starlight({
			title: "ArkType",
			logo: {
				src: "./src/assets/logo.svg",
				replacesTitle: true
			},
			customCss: ["./src/styles.css"],
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
	],
	site: "https://arktype.io"
})
