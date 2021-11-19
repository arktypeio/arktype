// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github")
const darkCodeTheme = require("prism-react-renderer/themes/dracula")

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: "redo",
    tagline: "Dinosaurs are cool",
    url: "https://redo.dev",
    baseUrl: "/",
    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "warn",
    favicon: "img/favicon.ico",
    organizationName: "re-do", // Usually your GitHub org/user name.
    projectName: "redo", // Usually your repo name.
    presets: [
        [
            "@docusaurus/preset-classic",
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                docs: {
                    sidebarPath: require.resolve("./sidebars.js"),
                    editUrl:
                        "https://github.com/re-do/redo/edit/pkgs/docs/docs/"
                },
                blog: {
                    showReadingTime: true,
                    editUrl:
                        "https://github.com/re-do/redo/edit/pkgs/docs/docs/"
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
                    alt: "redo logo",
                    src: "img/logo.svg"
                },
                items: [
                    {
                        type: "doc",
                        docId: "test/intro",
                        position: "left",
                        label: "Type"
                    },
                    {
                        type: "doc",
                        docId: "state/intro",
                        position: "left",
                        label: "State"
                    },
                    {
                        type: "doc",
                        docId: "test/intro",
                        position: "left",
                        label: "Test"
                    },
                    {
                        href: "https://github.com/re-do/redo",
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
                                to: "/docs/intro"
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
                                label: "Blog",
                                to: "/blog"
                            },
                            {
                                label: "GitHub",
                                href: "https://github.com/re-do/redo"
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
