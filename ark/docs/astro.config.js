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
					collapsed: true,
					items: [
						{
							label: "Base",
							link: "/keywords#base"
						},
						{
							label: "Subtype",
							link: "/keywords#subtype"
						},
						{
							label: "Utility",
							link: "/keywords#utility"
						}
					]
				},
				{
					label: "Literals",
					collapsed: true,
					items: [
						{ label: "Strings", link: "/literals#strings" },
						{ label: "Numbers", link: "/literals#numbers" },
						{ label: "Dates", link: "/literals#dates" },
						{ label: "Regex", link: "/literals#regex" }
					]
				},
				{
					label: "Objects",
					items: [
						{
							label: "Required Properties",
							link: "/objects#required-properties"
						},
						{
							label: "Optional Properties",
							link: "/objects#optional-properties"
						},
						{
							label: "Defaultable Properties",
							link: "/objects#defaultable-properties"
						},
						{
							label: "Index Signatures",
							link: "/objects#index-signatures"
						}
					]
				},
				{
					label: "Tuples",
					collapsed: true,
					items: [
						{
							label: "Prefix Elements",
							link: "/tuples#prefix-elements"
						},
						{
							label: "Optional Elements",
							link: "/tuples#optional-elements"
						},
						{
							label: "Variadic Elements",
							link: "/tuples#variadic-elements"
						},
						{
							label: "Postfix Elements",
							link: "/tuples#postfix-elements"
						}
					]
				},
				{
					label: "Expressions",
					items: [
						{
							label: "Arrays",
							link: "/expressions#arrays"
						},
						{
							label: "Brands",
							link: "/expressions#brands"
						},
						{
							label: "Casts",
							link: "/expressions#casts"
						},
						{
							label: "Divisors",
							link: "/expressions#divisors"
						},
						{
							label: "Groups (parenthetical)",
							link: "/expressions#groups"
						},
						{
							label: "instanceof",
							link: "/expressions#instanceof"
						},
						{
							label: "Intersections",
							link: "/expressions#intersections"
						},
						{
							label: "keyof",
							link: "/expressions#keyof"
						},
						{
							label: "Merge",
							link: "/expressions#merge"
						},
						{
							label: "Meta",
							link: "/expressions#meta"
						},
						{
							label: "Morphs",
							link: "/expressions#morphs"
						},
						{
							label: "Narrows",
							link: "/expressions#narrows"
						},
						{
							label: "Property Access",
							link: "/expressions#property-access"
						},
						{
							label: "Ranges",
							link: "/expressions#range"
						},
						{
							label: "Unions",
							link: "/expressions#unions"
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
