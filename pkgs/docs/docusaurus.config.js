// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github")
const darkCodeTheme = require("prism-react-renderer/themes/dracula")

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: "Redo",
    tagline: "Lovely tools that help you get back to doing what you love",
    url: "https://your-docusaurus-test-site.com",
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
                        "https://github.com/facebook/docusaurus/edit/main/website/"
                },
                blog: {
                    showReadingTime: true,
                    // Please change this to your repo.
                    editUrl:
                        "https://github.com/facebook/docusaurus/edit/main/website/blog/"
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
                    alt: "Redo Logo",
                    src: "img/reLogo.svg"
                },
                items: [
                    {
                        type: "doc",
                        docId: "intro",
                        position: "left",
                        label: "Model"
                    },
                    { to: "/blog", label: "State", position: "left" },
                    { to: "/blog", label: "Test", position: "left" },
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
