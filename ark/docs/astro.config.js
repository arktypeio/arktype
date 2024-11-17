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
									link: "/primitives/string#keywords"
								},
								{ label: "literals", link: "/primitives/string#literals" },
								{
									label: "patterns",
									link: "/primitives/string#patterns"
								},
								{
									label: "lengths",
									link: "/primitives/string#lengths"
								}
							]
						},
						{
							label: "number",
							collapsed: true,
							items: [
								{
									label: "keywords",
									link: "/primitives/number#keywords"
								},
								{ label: "literals", link: "/primitives/number#literals" },
								{
									label: "ranges",
									link: "/primitives/number#ranges"
								},
								{
									label: "divisors",
									link: "/primitives/number#divisors"
								}
							]
						},
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
				},
				{
					label: "Objects",
					items: [
						{
							label: "properties",
							collapsed: true,
							items: [
								{
									label: "required",
									link: "/properties#required"
								},
								{
									label: "optional",
									link: "/properties#optional"
								},
								{
									label: "defaultable",
									link: "/properties#defaultable"
								},
								{
									label: "index",
									link: "/properties#index"
								},
								{
									label: "undeclared",
									link: "/properties#undeclared"
								},
								{
									label: "merge",
									link: "/properties#merge"
								},
								{
									label: "keyof",
									link: "/properties#keyof"
								},
								{
									label: "get",
									link: "/properties#get"
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
											link: "/arrays#prefix"
										},
										{
											label: "optional",
											link: "/arrays#optional"
										},
										{
											label: "variadic",
											link: "/arrays#variadic"
										},
										{
											label: "postfix",
											link: "/arrays#postfix"
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
						},
						{
							label: "instanceof",
							collapsed: true,
							items: [
								{
									label: "expression",
									link: "/instanceof#expression"
								},
								{
									label: "keywords",
									link: "/instanceof#keywords"
								}
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
							label: "unit",
							link: "/expressions#unit"
						},
						{
							label: "enumerated",
							link: "/expressions#enumerated"
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
							link: "/expressions#this"
						}
					]
				},
				{
					label: "Types",
					items: [
						{
							label: "intro",
							link: "/types"
						},
						{
							label: "properties",
							link: "/types#properties"
						},
						{ label: "utilities", link: "/types#utilities" }
					]
				},
				{
					label: "Configuration",
					items: [
						{
							label: "intro",
							link: "/types"
						},
						{
							label: "errors",
							link: "/configuration#errors"
						},
						{
							label: "clone",
							link: "/configuration#clone"
						},
						{
							label: "onUndeclaredKey",
							link: "/configuration#onundeclaredkey"
						},
						{
							label: "jitless",
							link: "/configuration#jitless"
						}
					]
				},
				{
					label: "Scopes",
					badge: "advanced",
					items: [
						{
							label: "intro",
							link: "/scopes"
						},
						{
							label: "modules",
							link: "/scopes#modules"
						},
						{
							label: "visibility",
							link: "/scopes#visibility"
						},
						{
							label: "submodules",
							link: "/scopes#submodules"
						},
						{
							label: "thunks",
							link: "/scopes#thunks"
						}
					]
				},
				{
					label: "Generics",
					badge: "advanced",
					items: [
						{
							label: "intro",
							link: "/types"
						},
						{
							label: "keywords",
							link: "/generics#keywords"
						},
						{
							label: "syntax",
							link: "/generics#syntax"
						},
						{
							label: "hkt",
							link: "/generics#hkt",
							badge: "advanced++"
						}
					]
				},
				{
					label: "Integrations",
					items: [
						{
							label: "Standard Schema",
							link: "/integrations#standard-schema"
						},
						{
							label: "tRPC",
							link: "/integrations#trpc"
						},
						{
							label: "react-hook-form",
							link: "/integrations#react-hook-form"
						},
						{
							label: "hono",
							link: "/integrations#hono"
						}
					]
				},
				{
					label: "FAQ",
					link: "/faq"
				},
				{
					label: "About the project",
					link: "/about"
				}
			],
			components: {
				Head: "./src/components/Head.astro",
				Sidebar: "./src/components/Sidebar.astro"
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
