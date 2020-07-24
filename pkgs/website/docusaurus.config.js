module.exports = {
    title: "Redo",
    tagline: "Web testing rewritten",
    url: "https://redo.qa",
    baseUrl: "/",
    favicon: "icon.png",
    organizationName: "re-do",
    projectName: "redo",
    themeConfig: {
        navbar: {
            title: "Redo",
            logo: {
                alt: "Redo Logo",
                src: "icon.svg"
            },
            items: [
                // {
                //     to: "docs/",
                //     activeBasePath: "docs",
                //     label: "Docs",
                //     position: "left"
                // },
                {
                    href: "https://github.com/re-do/redo",
                    label: "GitHub",
                    position: "left"
                },
                { to: "blog", label: "Blog", position: "left" }
            ]
        },
        footer: {
            style: "dark",
            links: [
                {
                    title: "Docs",
                    items: [
                        {
                            label: "Getting Started",
                            to: "docs/"
                        }
                    ]
                },
                {
                    title: "Community",
                    items: [
                        {
                            label: "Github",
                            href: "https://github.com/re-do"
                        },
                        {
                            label: "Twitter",
                            href: "https://twitter.com/redoqa"
                        }
                    ]
                }
            ],
            copyright: `Copyright ©${new Date().getFullYear()} Redo, Inc. Built with Docusaurus.`
        }
    },
    presets: [
        [
            "@docusaurus/preset-classic",
            {
                docs: {
                    // It is recommended to set document id as docs home page (`docs/` path).
                    homePageId: "doc1",
                    sidebarPath: require.resolve("./sidebars.js"),
                    // Please change this to your repo.
                    editUrl:
                        "https://github.com/facebook/docusaurus/edit/master/website/"
                }
            }
        ]
    ]
}
