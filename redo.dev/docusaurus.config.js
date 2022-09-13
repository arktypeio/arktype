// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: "Redo",
    tagline: "Type-first web development without limits",
    url: "https://redo.dev",
    baseUrl: "/",
    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "warn",
    favicon: "img/favicon.ico",
    organizationName: "re-do", // Usually your GitHub org/user name.
    projectName: "re-po", // Usually your repo name.
    webpack: {
        jsLoader: (isServer) => ({
            loader: require.resolve("esbuild-loader"),
            options: {
                loader: "tsx",
                target: isServer ? "node12" : "es2017"
            }
        })
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
                id: "type",
                path: "docs/type",
                routeBasePath: "/type",
                sidebarPath: require.resolve("./docs/type/sidebar.js")
            }
        ],
        [
            "@docusaurus/plugin-content-docs",
            {
                id: "assert",
                path: "docs/assert",
                routeBasePath: "assert"
            }
        ],
        [
            "@docusaurus/plugin-google-gtag",
            {
                trackingID: "G-CR9TJ6QVM9",
                anonymizeIP: true
            }
        ]
    ],
    themeConfig:
        /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
        ({
            navbar: {
                logo: {
                    alt: "Logo",
                    src: "img/prefix.svg",
                    srcDark: "img/prefixDark.svg"
                },
                items: [
                    {
                        type: "doc",
                        label: "Type",
                        docId: "intro",
                        docsPluginId: "type"
                    },
                    {
                        type: "doc",
                        label: "Assert",
                        docId: "intro",
                        docsPluginId: "assert"
                    },
                    {
                        type: "docsVersionDropdown",
                        position: "right",
                        docsPluginId: "type",
                        className: "navbar-type-versions"
                    },
                    {
                        href: "https://github.com/re-do/re-po",
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
                                label: "Type",
                                to: "/type"
                            },
                            {
                                label: "Assert",
                                to: "/assert"
                            }
                        ]
                    },
                    {
                        title: "Community",
                        items: [
                            {
                                label: "GitHub",
                                href: "https://github.com/re-do/re-po"
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
                copyright: `Copyright © ${new Date().getFullYear()} Redo, Inc. Built with Docusaurus.`
            }
        })
}

module.exports = config
