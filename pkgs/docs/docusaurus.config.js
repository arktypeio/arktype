// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github")
const darkCodeTheme = require("prism-react-renderer/themes/dracula")

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: "Redo",
    tagline: "Lovely tools to help you get back to doing what you love",
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
    presets: [
        [
            "classic",
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                docs: {
                    sidebarPath: require.resolve("./sidebars.js"),
                    // Please change this to your repo.
                    editUrl:
                        "https://github.com/re-do/re-po/edit/main/pkgs/docs"
                },
                theme: {
                    customCss: require.resolve("./src/css/custom.css")
                }
            })
        ]
    ],
    themeConfig:
        /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
        ({
            navbar: {
                logo: {
                    alt: "Re Logo",
                    src: "img/reLogo.svg"
                },
                items: [
                    {
                        type: "doc",
                        label: "Model",
                        docId: "model/intro"
                    },
                    {
                        type: "doc",
                        label: "State",
                        docId: "state/intro"
                    },
                    {
                        type: "doc",
                        label: "Test",
                        docId: "test/intro"
                    },
                    {
                        href: "https://github.com/re-do/re-po",
                        label: "GitHub",
                        position: "right"
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
                                to: "/docs/model/intro"
                            }
                        ]
                    },
                    {
                        title: "Community",
                        items: [
                            {
                                label: "Stack Overflow",
                                href: "https://stackoverflow.com/questions/tagged/docusaurus"
                            },
                            {
                                label: "Discord",
                                href: "https://discordapp.com/invite/docusaurus"
                            },
                            {
                                label: "Twitter",
                                href: "https://twitter.com/docusaurus"
                            }
                        ]
                    },
                    {
                        title: "More",
                        items: [
                            {
                                label: "GitHub",
                                href: "https://github.com/re-do/re-po"
                            }
                        ]
                    }
                ],
                copyright: `Copyright © ${new Date().getFullYear()} Redo, Inc. Built with Docusaurus.`
            },
            prism: {
                theme: lightCodeTheme,
                darkTheme: darkCodeTheme
            }
        })
}

module.exports = config
