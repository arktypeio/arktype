// @ts-check

import react from "@astrojs/react"
import starlight from "@astrojs/starlight"
import { defineConfig } from "astro/config"
import { shikiConfig } from "./src/components/shiki.config.js"

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
			description:
				"TypeScript's 1:1 validator, optimized from editor to runtime",
			logo: {
				src: "./src/assets/logo.svg",
				replacesTitle: true
			},
			head: [
				// this ensures each page is rendered in dark mode since we
				// don't support light yet
				{
					tag: "script",
					content: `localStorage.setItem("starlight-theme", "dark")`
				}
			],
			social: {
				twitch: "https://twitch.tv/arktypeio",
				twitter: "https://twitter.com/arktypeio",
				discord: "https://arktype.io/discord",
				github: "https://github.com/arktypeio/arktype"
			},
			sidebar: [
				{
					label: "Intro",
					autogenerate: {
						directory: "intro"
					}
				},

				{
					label: "Keywords",
					items: [
						{
							label: "Core",
							link: "/definitions#core"
						},
						{
							label: "Subtypes",
							link: "/definitions#subtypes"
						},
						{
							label: "Utilities",
							link: "/definitions#utilities"
						}
					]
				},
				{
					label: "Literals",
					items: [
						{ label: "Strings", link: "/definitions#strings" },
						{ label: "Numbers", link: "/definitions#numbers" },
						{ label: "Dates", link: "/definitions#dates" },
						{ label: "Regex", link: "/definitions#regex" }
					]
				},
				{
					label: "Objects",
					items: [
						{
							label: "Required Properties",
							link: "/definitions#required-properties"
						},
						{
							label: "Optional Properties",
							link: "/definitions#optional-properties"
						},
						{
							label: "Defaultable Properties",
							link: "/definitions#defaultable-properties"
						},
						{
							label: "Index Signatures",
							link: "/definitions#index-signatures"
						}
					]
				},
				{
					label: "Tuples",
					collapsed: true,
					items: [
						{
							label: "Prefix Elements",
							link: "/definitions#prefix-elements"
						},
						{
							label: "Optional Elements",
							link: "/definitions#optional-elements"
						},
						{
							label: "Variadic Elements",
							link: "/definitions#variadic-elements"
						},
						{
							label: "Postfix Elements",
							link: "/definitions#postfix-elements"
						}
					]
				},

				{
					label: "Expressions",
					items: [
						{
							label: "Arrays",
							link: "/definitions#arrays"
						},
						{
							label: "Unions",
							link: "/definitions#unions"
						},
						{
							label: "Morphs",
							link: "/definitions#morphs"
						},
						{
							label: "Narrows",
							link: "/definitions#narrows"
						},
						{
							label: "Intersections",
							link: "/definitions#intersections"
						},
						{
							label: "Brands",
							link: "/definitions#brands"
						},
						{
							label: "Casts",
							link: "/definitions#casts"
						},
						{
							label: "Divisors",
							link: "/definitions#divisors"
						},
						{
							label: "Ranges",
							link: "/definitions#range"
						},
						{
							label: "Groups (parenthetical)",
							link: "/definitions#groups"
						},
						{
							label: "instanceof",
							link: "/definitions#instanceof"
						},
						{
							label: "keyof",
							link: "/definitions#keyof"
						},
						{
							label: "Property Access",
							link: "/definitions#property-access"
						},
						{
							label: "Merge",
							link: "/definitions#merge"
						}
					]
				},
				{
					label: "Reference",
					autogenerate: {
						directory: "reference"
					}
				}
			],
			components: {
				Head: "./src/components/Head.astro"
			},
			customCss: ["@shikijs/twoslash/style-rich.css", "./src/styles.css"],
			expressiveCode: false,
			tableOfContents: {
				maxHeadingLevel: 4
			}
		}),
		react()
	],
	markdown: {
		shikiConfig
	},
	vite: {
		resolve: {
			conditions: ["ark-ts"]
		},
		publicDir: "public"
	}
})
