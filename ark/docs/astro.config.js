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
					label: "Primitives",
					items: [
						{
							label: "string",
							collapsed: true,
							items: [
								{
									label: "keywords",
									link: "/definitions#string-keywords"
								},
								{ label: "literals", link: "/definitions#string-literals" },
								{
									label: "patterns",
									link: "/strings#patterns"
								},
								{
									label: "lengths",
									link: "/strings#lengths"
								}
							]
						},
						{
							label: "number",
							collapsed: true,
							items: [
								{
									label: "keywords",
									link: "/primitives#number-keywords"
								},
								{ label: "literals", link: "/primitives#number-literals" },
								{
									label: "ranges",
									link: "/numbers#ranges"
								},
								{
									label: "divisors",
									link: "/numbers#divisors"
								}
							]
						},
						{
							label: "more",
							collapsed: true,
							items: [
								{
									label: "bigint",
									link: "/primitives#bigint"
								},
								{
									label: "boolean",
									link: "/primitives#boolean"
								},
								{
									label: "symbol",
									link: "/primitives#symbol"
								},
								{
									label: "null",
									link: "/primitives#null"
								},
								{
									label: "undefined",
									link: "/primitives#undefined"
								}
							]
						}
					]
				},
				{
					label: "Objects",
					items: [
						{
							label: "properties",
							items: [
								{
									label: "required",
									link: "/objects#required-properties"
								},
								{
									label: "optional",
									link: "/objects#optional-properties"
								},
								{
									label: "defaultable",
									link: "/objects#defaultable-properties"
								},
								{
									label: "index",
									link: "/objects#index-signatures"
								},
								{
									label: "undeclared",
									link: "/expressions#onundeclaredkey"
								},
								{
									label: "more",
									collapsed: true,
									items: [
										{
											label: "merge",
											link: "/expressions#merge"
										},
										{
											label: "keyof",
											link: "/expressions#keyof"
										},
										{
											label: "get",
											link: "/expressions#get"
										}
									]
								}
							]
						},
						{
							label: "arrays",
							collapsed: true,
							items: [
								{ label: "lengths", link: "/arrays#lengths" },
								{
									label: "tuples",
									collapsed: true,
									items: [
										{
											label: "prefix",
											link: "/tuples#prefix"
										},
										{
											label: "optional",
											link: "/tuples#optional"
										},
										{
											label: "variadic",
											link: "/tuples#variadic"
										},
										{
											label: "postfix",
											link: "/tuples#postfix"
										}
									]
								}
							]
						},
						{
							label: "dates",
							collapsed: true,
							items: [
								{ label: "keywords", link: "/dates#keywords" },
								{ label: "literals", link: "/dates#literals" },
								{ label: "ranges", link: "/dates#ranges" }
							]
						}
					]
				},
				{
					label: "Expressions",
					items: [
						{
							label: "intersection",
							link: "/expressions#intersection"
						},
						{
							label: "union",
							link: "/expressions#union"
						},
						{
							label: "brand",
							link: "/expressions#brand"
						},
						{
							label: "narrow",
							link: "/expressions#narrow"
						},
						{
							label: "morph",
							link: "/expressions#morph"
						},
						{
							label: "more",
							collapsed: true,
							items: [
								{
									label: "equality",
									link: "/expressions#equality"
								},
								{
									label: "meta",
									link: "/expressions#meta"
								},
								{
									label: "cast",
									link: "/expressions#cast"
								},
								{
									label: "parenthetical",
									link: "/expressions#parenthetical"
								},
								{
									label: "this",
									link: "/keywords#this"
								}
							]
						}
					]
				},
				{
					label: "Advanced",
					items: [
						{
							label: "configuration",
							link: "/advanced#configuration"
						},
						{
							label: "scopes",
							link: "/advanced#scopes"
						},
						{
							label: "generics",
							link: "/advanced#generics"
						}
					]
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
		}
	}
})
