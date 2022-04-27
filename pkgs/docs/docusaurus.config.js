// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

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
                id: "model",
                path: "docs/model",
                routeBasePath: "model",
                sidebarPath: require.resolve("./docs/model/sidebar.js")
            }
        ],
        [
            "@docusaurus/plugin-content-docs",
            {
                id: "state",
                path: "docs/state",
                routeBasePath: "state"
            }
        ],
        [
            "@docusaurus/plugin-content-docs",
            {
                id: "test",
                path: "docs/test",
                routeBasePath: "test"
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
                        label: "Model",
                        docId: "intro",
                        docsPluginId: "model"
                    },
                    {
                        type: "doc",
                        label: "State",
                        docId: "intro",
                        docsPluginId: "state"
                    },
                    {
                        type: "doc",
                        label: "Test",
                        docId: "intro",
                        docsPluginId: "test"
                    },
                    {
                        type: "docsVersionDropdown",
                        position: "right",
                        docsPluginId: "model",
                        className: "navbar-model-versions"
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
                                label: "Model",
                                to: "/model"
                            },
                            {
                                label: "State",
                                to: "/state"
                            },
                            {
                                label: "Test",
                                to: "/test"
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
