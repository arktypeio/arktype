// @ts-check

import react from "@astrojs/react"
import starlight from "@astrojs/starlight"
import { astroExpressiveCode } from "@astrojs/starlight/expressive-code"
import arkdarkColors from "arkdark/color-theme.json"
import arktypeTextmate from "arkdark/tsWithArkType.tmLanguage.json"
import { defineConfig } from "astro/config"

// https://astro.build/config
export default defineConfig({
	site: "https://arktype.io",
	markdown: {
		shikiConfig: {
			// Choose from Shiki's built-in themes (or add your own)
			// https://shiki.style/themes
			theme: arkdarkColors,
			// Add custom languages
			// Note: Shiki has countless langs built-in, including .astro!
			// https://shiki.style/languages
			/** @ts-expect-error allow textmate lang from JSON */
			langs: [arktypeTextmate],
			// Enable word wrap to prevent horizontal scrolling
			wrap: true
			// Add custom transformers: https://shiki.style/guide/transformers
			// Find common transformers: https://shiki.style/packages/transformers
			// transformers: []
		}
	},
	// cannot configure out dir to out to match other packges since dist is hard
	// coded into: https://github.com/withastro/action/blob/main/action.yml
	integrations: [
		// astroExpressiveCode({
		// 	themes: [arkdarkColors]
		// }),
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
