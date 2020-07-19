module.exports = {
    title: "Redo",
    tagline: "The tagline of my site",
    url: "https://redo.qa",
    baseUrl: "/",
    favicon: "icon.png",
    organizationName: "re-do", // Usually your GitHub org/user name.
    projectName: "redo", // Usually your repo name.
    themeConfig: {
        navbar: {
            title: "Redo",
            logo: {
                alt: "Redo Logo",
                src: "icon.svg"
            },
            links: [
                {
                    to: "docs/",
                    activeBasePath: "docs",
                    label: "Docs",
                    position: "left"
                },
                { to: "blog", label: "Blog", position: "left" },
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
                            label: "Style Guide",
                            to: "docs/"
                        },
                        {
                            label: "Second Doc",
                            to: "docs/doc2/"
                        }
                    ]
                },
                {
                    title: "Community",
                    items: [
                        {
                            label: "Stack Overflow",
                            href:
                                "https://stackoverflow.com/questions/tagged/docusaurus"
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
                            to: "blog"
                        },
                        {
                            label: "GitHub",
                            href: "https://github.com/facebook/docusaurus"
                        }
                    ]
                }
            ],
            copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`
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
