// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: "Arktype",
    tagline: "One type from editor to runtime",
    url: "https://arktype.io",
    baseUrl: "/",
    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "warn",
    favicon: "img/logo.svg",
    // Even if you don't use internalization, you can use this field to set useful
    // metadata like html lang. For example, if your site is Chinese, you may want
    // to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: "en",
        locales: ["en"]
    },
    themes: [
        [
            "@docusaurus/theme-classic",
            { customCss: require.resolve("./src/css/custom.css") }
        ]
    ],
    plugins: [
        ["@docusaurus/plugin-content-pages", {}],
        [
            "@docusaurus/plugin-content-docs",
            {
                sidebarPath: require.resolve("./docs/sidebar.js")
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
            navbar: {
                title: "Arktype",
                logo: {
                    alt: "My Site Logo",
                    src: "img/logo.svg"
                },
                items: [
                    {
                        type: "doc",
                        docId: "intro",
                        position: "left",
                        label: "Tutorial"
                    },
                    {
                        type: "docsVersionDropdown",
                        position: "right",
                        className: "navbar-versions"
                    },
                    {
                        href: "https://github.com/arktypeio/arktype/tree/main/@arktype/type",
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
                                label: "Tutorial",
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
                                href: "https://discord.gg/WSNF3Kc4xh"
                            },
                            {
                                label: "Twitch",
                                href: "https://twitch.tv/RedoCode"
                            }
                        ]
                    }
                ],
                copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`
            }
        })
}

module.exports = config
