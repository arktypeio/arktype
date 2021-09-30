const lightCodeTheme = require("prism-react-renderer/themes/github")
const darkCodeTheme = require("prism-react-renderer/themes/dracula")

/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
    title: "Redo Documentation",
    tagline: "Web testing rewritten",
    url: "https://redo.qa/",
    baseUrl: "/",
    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "warn",
    favicon: "img/favicon.ico",
    organizationName: "Redo", // Usually your GitHub org/user name.
    projectName: "redo-documentation", // Usually your repo name.
    themeConfig: {
        navbar: {
            title: "Redo Docs",
            logo: {
                alt: "Redo Logo",
                src: "img/logo.svg"
            },
            items: [
                {
                    type: "doc",
                    docId: "intro",
                    position: "right",
                    label: "Redo.qa",
                    href: "https://redo.qa/"
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
                    title: "Links",
                    items: [
                        {
                            label: "Redo website",
                            to: "https://redo.qa"
                        },
                        {
                            label: "Blog",
                            to: "https://redo.qa/blog"
                        },
                        {
                            label: "GitHub",
                            href: "https://github.com/re-do/redo"
                        }
                    ]
                }
            ],
            copyright: `Copyright © ${new Date().getFullYear()} Redo.`
        },
        prism: {
            theme: lightCodeTheme,
            darkTheme: darkCodeTheme
        }
    },
    presets: [
        [
            "@docusaurus/preset-classic",
            {
                docs: {
                    routeBasePath: "/",
                    sidebarPath: require.resolve("./sidebars.js"),
                    editUrl: "https://github.com/re-do/redo"
                },
                blog: {
                    showReadingTime: true,
                    editUrl: "https://github.com/re-do/redo"
                },
                theme: {
                    customCss: require.resolve("./src/css/custom.css")
                }
            }
        ]
    ]
}
