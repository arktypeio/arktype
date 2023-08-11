// @ts-check

/** @type {import('prism-react-renderer').PrismTheme} */
const arkDarkPrismTheme = {
	plain: {
		color: "#FFFFF0",
		backgroundColor: "#1b1b1b"
	},
	styles: [
		{
			types: ["comment"],
			style: {
				color: "rgb(104, 107, 120)"
			}
		},
		{
			types: ["string", "number", "boolean"],
			style: {
				color: "rgb(245, 207, 143)"
			}
		},
		{
			types: ["builtin"],
			style: {
				color: "rgb(255, 255, 240)"
			}
		},
		{
			types: [
				"punctuation",
				"tag",
				"operator",
				"keyword",
				"selector",
				"doctype",
				"namespace"
			],
			style: {
				color: "rgb(235, 159, 46)"
			}
		},
		{
			types: [
				"char",
				"constant",
				"variable",
				"class-name",
				"function",
				"attr-name"
			],
			style: {
				color: "rgb(128, 207, 248)"
			}
		}
	]
}

/** @type {import('@docusaurus/types').Config} */
const config = {
	title: "ArkType",
	// @lineFrom:package.json:description |> embed(tagline:,,)
	tagline: "TypeScript's 1:1 validator, optimized from editor to runtime",
	url: "https://arktype.io",
	baseUrl: "/",
	onBrokenLinks: "throw",
	onBrokenMarkdownLinks: "warn",
	favicon: "img/logo.svg",
	i18n: {
		defaultLocale: "en",
		locales: ["en"]
	},
	themes: [
		[
			"@docusaurus/theme-classic",
			{
				customCss: require.resolve("./custom.css")
			}
		]
	],
	plugins: [
		[
			"@docusaurus/plugin-content-pages",
			{
				path: "./pages"
			}
		],
		[
			"@docusaurus/plugin-content-docs",
			{
				path: "./markdown",
				sidebarPath: require.resolve("./markdown/sidebar.js")
			}
		],
		[
			"@docusaurus/plugin-google-gtag",
			{
				trackingID: "G-FE16ZX1CZQ",
				anonymizeIP: true
			}
		]
	],
	themeConfig:
		/** @type {import('@docusaurus/preset-classic').ThemeConfig} */
		({
			image: "img/preview2To1.png",
			colorMode: {
				defaultMode: "dark"
			},
			prism: {
				theme: arkDarkPrismTheme
			},
			navbar: {
				logo: {
					alt: "Arktype Logo",
					src: "img/logo.svg"
				},
				items: [
					{
						type: "doc",
						docId: "intro",
						position: "left",
						label: "Docs"
					},
					{
						type: "docsVersionDropdown",
						position: "right",
						className: "navbar-versions"
					},
					{
						href: "https://github.com/arktypeio/arktype",
						position: "right",
						className: "navbar-github"
					}
				]
			},
			footer: {
				style: "dark",
				links: [
					{
						title: "Docs",
						items: [
							{
								label: "Docs",
								to: "/docs/"
							}
						]
					},
					{
						title: "Community",
						items: [
							{
								label: "GitHub",
								href: "https://github.com/arktypeio/arktype"
							},
							{
								label: "Discord",
								href: "https://arktype.io/discord"
							},
							{
								label: "Twitter",
								href: "https://twitter.com/arktypeio"
							},
							{
								label: "Twitch",
								href: "https://twitch.tv/arktypeio"
							}
						]
					}
				]
			}
		})
}

module.exports = config
