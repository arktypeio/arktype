// @ts-check

import react from "@astrojs/react"
import starlight from "@astrojs/starlight"
import { transformerTwoslash } from "@shikijs/twoslash"
import arkdarkColors from "arkdark/color-theme.json"
import arktypeTextmate from "arkdark/tsWithArkType.tmLanguage.json"
import { defineConfig } from "astro/config"

// https://astro.build/config
export default defineConfig({
	site: "https://arktype.io",
	redirects: {
		"/discord": "https://discord.gg/xEzdc3fJQC"
	},
	// cannot configure out dir to out to match other packges since dist is hard
	// coded into: https://github.com/withastro/action/blob/main/action.yml
	integrations: [
		starlight({
			title: "ArkType",
			logo: {
				src: "./src/assets/logo.svg",
				replacesTitle: true
			},
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
			],
			customCss: ["./src/styles.css", "@shikijs/twoslash/style-rich.css"],
			expressiveCode: false
			// expressiveCode: {
			// 	themes: [arkdarkColors],
			// 	shiki: {
			// 		/** @ts-expect-error allow textmate lang from JSON */
			// 		langs: [arktypeTextmate]
			// 	},
			// 	styleOverrides: {
			// 		codeFontSize: "1rem",
			// 		codeBackground: "#00000027",
			// 		borderRadius: "1rem",
			// 		borderColor: "#ba7e4127",
			// 		borderWidth: "1px"
			// 	}
			// }
		}),
		react()
	],
	markdown: {
		shikiConfig: {
			theme: arkdarkColors,
			// @ts-expect-error
			langs: [arktypeTextmate],
			transformers: [transformerTwoslash()]
		}
	}
})
