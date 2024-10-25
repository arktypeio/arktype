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
							label: "TypeScript",
							link: "/keywords#typescript"
						},
						{
							label: "Subtype",
							link: "/keywords#subtype"
						},
						{
							label: "this",
							link: "/keywords#this"
						}
					]
				},
				{
					label: "Literals",
					collapsed: true,
					items: [
						{ label: "String", link: "/literals#string" },
						{ label: "Number", link: "/literals#number" },
						{ label: "Bigint", link: "/literals#bigint" },
						{ label: "Date", link: "/literals#date" },
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
							label: "Array",
							link: "/expressions#array"
						},
						{
							label: "Divisibility",
							link: "/expressions#divisibility"
						},
						{
							label: "Equality",
							link: "/expressions#equality"
						},
						{
							label: "Parenthetical",
							link: "/expressions#parenthetical"
						},
						{
							label: "instanceof",
							link: "/expressions#instanceof"
						},
						{
							label: "Union",
							link: "/expressions#union"
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
