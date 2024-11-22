// @ts-check

import react from "@astrojs/react"
import starlight from "@astrojs/starlight"
import { defineConfig } from "astro/config"
import { shikiConfig } from "./src/components/shiki.config.js"

// https://astro.build/config
export default defineConfig({
	site: "https://arktype.io",
	redirects: {
		"/discord": "https://discord.gg/xEzdc3fJQC",
		"/primitives/string": "/string",
		"/primitives/number": "/number"
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
									link: "/primitives#string/keywords"
								},
								{ label: "literals", link: "/primitives#string/literals" },
								{
									label: "patterns",
									link: "/primitives#string/patterns"
								},
								{
									label: "lengths",
									link: "/primitives#string/lengths"
								}
							]
						},
						{
							label: "number",
							collapsed: true,
							items: [
								{
									label: "keywords",
									link: "/primitives#number/keywords"
								},
								{ label: "literals", link: "/primitives#number/literals" },
								{
									label: "ranges",
									link: "/primitives#number/ranges"
								},
								{
									label: "divisors",
									link: "/primitives#number/divisors"
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
									link: "/objects#properties/required"
								},
								{
									label: "optional",
									link: "/objects#properties/optional"
								},
								{
									label: "defaultable",
									link: "/objects#properties/defaultable"
								},
								{
									label: "index",
									link: "/objects#properties/index"
								},
								{
									label: "undeclared",
									link: "/objects#properties/undeclared"
								},
								{
									label: "merge",
									link: "/objects#properties/merge"
								},
								{
									label: "keyof",
									link: "/objects#properties/keyof"
								},
								{
									label: "get",
									link: "/objects#properties/get"
								}
							]
						},
						{
							label: "arrays",
							collapsed: true,
							items: [{ label: "lengths", link: "/objects#arrays/lengths" }]
						},
						{
							label: "tuples",
							collapsed: true,
							items: [
								{
									label: "prefix",
									link: "/objects#tuples/prefix"
								},
								{
									label: "optional",
									link: "/objects#tuples/optional"
								},
								{
									label: "variadic",
									link: "/objects#tuples/variadic"
								},
								{
									label: "postfix",
									link: "/objects#tuples/postfix"
								}
							]
						},
						{
							label: "dates",
							collapsed: true,
							items: [
								{ label: "keywords", link: "/objects#dates/keywords" },
								{ label: "literals", link: "/objects#dates/literals" },
								{ label: "ranges", link: "/objects#dates/ranges" }
							]
						},
						{
							label: "instanceof",
							link: "/objects#instanceof"
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
					translations: {},
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
