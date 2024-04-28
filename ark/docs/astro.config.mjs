import react from "@astrojs/react"
import starlight from "@astrojs/starlight"
import { defineConfig } from "astro/config"

// https://astro.build/config
export default defineConfig({
	site: "https://arktype.io",
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
					label: "Intro",
					items: [{ label: "Why ArkType?", link: "/intro/why/" }]
				},
				{
					label: "Reference",
					items: [
						{ label: "Your first type", link: "/reference/your-first-type/" },
						{ label: "Scopes", link: "/reference/scopes/" },
						{ label: "Cheat sheet", link: "/reference/cheat-sheet/" }
					]
				}
			]
		}),
		react()
	]
})
