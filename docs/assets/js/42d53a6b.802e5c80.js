"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [49],
    {
        6383: (e, t, n) => {
            n.d(t, { Zo: () => u, kt: () => m })
            var a = n(1672)
            function r(e, t, n) {
                return (
                    t in e
                        ? Object.defineProperty(e, t, {
                              value: n,
                              enumerable: !0,
                              configurable: !0,
                              writable: !0
                          })
                        : (e[t] = n),
                    e
                )
            }
            function o(e, t) {
                var n = Object.keys(e)
                if (Object.getOwnPropertySymbols) {
                    var a = Object.getOwnPropertySymbols(e)
                    t &&
                        (a = a.filter(function (t) {
                            return Object.getOwnPropertyDescriptor(
                                e,
                                t
                            ).enumerable
                        })),
                        n.push.apply(n, a)
                }
                return n
            }
            function s(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var n = null != arguments[t] ? arguments[t] : {}
                    t % 2
                        ? o(Object(n), !0).forEach(function (t) {
                              r(e, t, n[t])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(n)
                          )
                        : o(Object(n)).forEach(function (t) {
                              Object.defineProperty(
                                  e,
                                  t,
                                  Object.getOwnPropertyDescriptor(n, t)
                              )
                          })
                }
                return e
            }
            function i(e, t) {
                if (null == e) return {}
                var n,
                    a,
                    r = (function (e, t) {
                        if (null == e) return {}
                        var n,
                            a,
                            r = {},
                            o = Object.keys(e)
                        for (a = 0; a < o.length; a++)
                            (n = o[a]), t.indexOf(n) >= 0 || (r[n] = e[n])
                        return r
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var o = Object.getOwnPropertySymbols(e)
                    for (a = 0; a < o.length; a++)
                        (n = o[a]),
                            t.indexOf(n) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    n
                                ) &&
                                    (r[n] = e[n]))
                }
                return r
            }
            var l = a.createContext({}),
                c = function (e) {
                    var t = a.useContext(l),
                        n = t
                    return (
                        e &&
                            (n =
                                "function" == typeof e ? e(t) : s(s({}, t), e)),
                        n
                    )
                },
                u = function (e) {
                    var t = c(e.components)
                    return a.createElement(l.Provider, { value: t }, e.children)
                },
                d = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return a.createElement(a.Fragment, {}, t)
                    }
                },
                p = a.forwardRef(function (e, t) {
                    var n = e.components,
                        r = e.mdxType,
                        o = e.originalType,
                        l = e.parentName,
                        u = i(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        p = c(n),
                        m = r,
                        k = p["".concat(l, ".").concat(m)] || p[m] || d[m] || o
                    return n
                        ? a.createElement(
                              k,
                              s(s({ ref: t }, u), {}, { components: n })
                          )
                        : a.createElement(k, s({ ref: t }, u))
                })
            function m(e, t) {
                var n = arguments,
                    r = t && t.mdxType
                if ("string" == typeof e || r) {
                    var o = n.length,
                        s = new Array(o)
                    s[0] = p
                    var i = {}
                    for (var l in t) hasOwnProperty.call(t, l) && (i[l] = t[l])
                    ;(i.originalType = e),
                        (i.mdxType = "string" == typeof e ? e : r),
                        (s[1] = i)
                    for (var c = 2; c < o; c++) s[c] = n[c]
                    return a.createElement.apply(null, s)
                }
                return a.createElement.apply(null, n)
            }
            p.displayName = "MDXCreateElement"
        },
        4068: (e, t, n) => {
            n.r(t),
                n.d(t, {
                    frontMatter: () => p,
                    contentTitle: () => m,
                    metadata: () => k,
                    toc: () => g,
                    Highlight: () => h,
                    default: () => b
                })
            var a = n(6383),
                r = Object.defineProperty,
                o = Object.defineProperties,
                s = Object.getOwnPropertyDescriptors,
                i = Object.getOwnPropertySymbols,
                l = Object.prototype.hasOwnProperty,
                c = Object.prototype.propertyIsEnumerable,
                u = (e, t, n) =>
                    t in e
                        ? r(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: n
                          })
                        : (e[t] = n),
                d = (e, t) => {
                    for (var n in t || (t = {})) l.call(t, n) && u(e, n, t[n])
                    if (i) for (var n of i(t)) c.call(t, n) && u(e, n, t[n])
                    return e
                }
            const p = { sidebar_position: 4 },
                m = "Markdown Features",
                k = {
                    unversionedId: "state/tutorial-basics/markdown-features",
                    id: "state/tutorial-basics/markdown-features",
                    title: "Markdown Features",
                    description:
                        "Docusaurus supports Markdown and a few additional features.",
                    source: "@site/docs/state/tutorial-basics/markdown-features.mdx",
                    sourceDirName: "state/tutorial-basics",
                    slug: "/state/tutorial-basics/markdown-features",
                    permalink: "/docs/state/tutorial-basics/markdown-features",
                    editUrl:
                        "https://github.com/re-do/re-po/edit/main/pkgs/docs/docs/state/tutorial-basics/markdown-features.mdx",
                    tags: [],
                    version: "current",
                    sidebarPosition: 4,
                    frontMatter: { sidebar_position: 4 },
                    sidebar: "state",
                    previous: {
                        title: "Create a Blog Post",
                        permalink:
                            "/docs/state/tutorial-basics/create-a-blog-post"
                    },
                    next: {
                        title: "Deploy your site",
                        permalink:
                            "/docs/state/tutorial-basics/deploy-your-site"
                    }
                },
                g = [
                    {
                        value: "Front Matter",
                        id: "front-matter",
                        children: [],
                        level: 2
                    },
                    { value: "Links", id: "links", children: [], level: 2 },
                    { value: "Images", id: "images", children: [], level: 2 },
                    {
                        value: "Code Blocks",
                        id: "code-blocks",
                        children: [],
                        level: 2
                    },
                    {
                        value: "Admonitions",
                        id: "admonitions",
                        children: [],
                        level: 2
                    },
                    {
                        value: "MDX and React Components",
                        id: "mdx-and-react-components",
                        children: [],
                        level: 2
                    }
                ],
                h = ({ children: e, color: t }) =>
                    (0, a.kt)(
                        "span",
                        {
                            style: {
                                backgroundColor: t,
                                borderRadius: "20px",
                                color: "#fff",
                                padding: "10px",
                                cursor: "pointer"
                            },
                            onClick: () => {
                                alert(
                                    `You clicked the color ${t} with label ${e}`
                                )
                            }
                        },
                        e
                    ),
                A = { toc: g, Highlight: h }
            function b(e) {
                var t,
                    r = e,
                    { components: u } = r,
                    p = ((e, t) => {
                        var n = {}
                        for (var a in e)
                            l.call(e, a) && t.indexOf(a) < 0 && (n[a] = e[a])
                        if (null != e && i)
                            for (var a of i(e))
                                t.indexOf(a) < 0 &&
                                    c.call(e, a) &&
                                    (n[a] = e[a])
                        return n
                    })(r, ["components"])
                return (0, a.kt)(
                    "wrapper",
                    ((t = d(d({}, A), p)),
                    o(t, s({ components: u, mdxType: "MDXLayout" }))),
                    (0, a.kt)(
                        "h1",
                        d({}, { id: "markdown-features" }),
                        "Markdown Features"
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "Docusaurus supports ",
                        (0, a.kt)(
                            "strong",
                            { parentName: "p" },
                            (0, a.kt)(
                                "a",
                                d(
                                    { parentName: "strong" },
                                    {
                                        href: "https://daringfireball.net/projects/markdown/syntax"
                                    }
                                ),
                                "Markdown"
                            )
                        ),
                        " and a few ",
                        (0, a.kt)(
                            "strong",
                            { parentName: "p" },
                            "additional features"
                        ),
                        "."
                    ),
                    (0, a.kt)(
                        "h2",
                        d({}, { id: "front-matter" }),
                        "Front Matter"
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "Markdown documents have metadata at the top called ",
                        (0, a.kt)(
                            "a",
                            d(
                                { parentName: "p" },
                                {
                                    href: "https://jekyllrb.com/docs/front-matter/"
                                }
                            ),
                            "Front Matter"
                        ),
                        ":"
                    ),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            d(
                                { parentName: "pre" },
                                {
                                    className: "language-text",
                                    metastring: 'title="my-doc.md"',
                                    title: '"my-doc.md"'
                                }
                            ),
                            "// highlight-start\n---\nid: my-doc-id\ntitle: My document title\ndescription: My document description\nslug: /my-custom-url\n---\n// highlight-end\n\n## Markdown heading\n\nMarkdown text with [links](./hello.md)\n"
                        )
                    ),
                    (0, a.kt)("h2", d({}, { id: "links" }), "Links"),
                    (0, a.kt)(
                        "p",
                        null,
                        "Regular Markdown links are supported, using url paths or relative file paths."
                    ),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            d(
                                { parentName: "pre" },
                                { className: "language-md" }
                            ),
                            "Let's see how to [Create a page](/create-a-page).\n"
                        )
                    ),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            d(
                                { parentName: "pre" },
                                { className: "language-md" }
                            ),
                            "Let's see how to [Create a page](./create-a-page.md).\n"
                        )
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        (0, a.kt)("strong", { parentName: "p" }, "Result:"),
                        " Let's see how to ",
                        (0, a.kt)(
                            "a",
                            d(
                                { parentName: "p" },
                                {
                                    href: "/docs/state/tutorial-basics/create-a-page"
                                }
                            ),
                            "Create a page"
                        ),
                        "."
                    ),
                    (0, a.kt)("h2", d({}, { id: "images" }), "Images"),
                    (0, a.kt)(
                        "p",
                        null,
                        "Regular Markdown images are supported."
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "Add an image at ",
                        (0, a.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "static/img/docusaurus.png"
                        ),
                        " and display it in Markdown:"
                    ),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            d(
                                { parentName: "pre" },
                                { className: "language-md" }
                            ),
                            "![Docusaurus logo](/img/docusaurus.png)\n"
                        )
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        (0, a.kt)("img", {
                            alt: "Docusaurus logo",
                            src: n(4711).Z,
                            width: "200",
                            height: "200"
                        })
                    ),
                    (0, a.kt)(
                        "h2",
                        d({}, { id: "code-blocks" }),
                        "Code Blocks"
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "Markdown code blocks are supported with Syntax highlighting."
                    ),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            d({ parentName: "pre" }, {}),
                            '```jsx title="src/components/HelloDocusaurus.js"\nfunction HelloDocusaurus() {\n    return (\n        <h1>Hello, Docusaurus!</h1>\n    )\n}\n```\n'
                        )
                    ),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            d(
                                { parentName: "pre" },
                                {
                                    className: "language-jsx",
                                    metastring:
                                        'title="src/components/HelloDocusaurus.js"',
                                    title: '"src/components/HelloDocusaurus.js"'
                                }
                            ),
                            "function HelloDocusaurus() {\n    return <h1>Hello, Docusaurus!</h1>\n}\n"
                        )
                    ),
                    (0, a.kt)(
                        "h2",
                        d({}, { id: "admonitions" }),
                        "Admonitions"
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "Docusaurus has a special syntax to create admonitions and callouts:"
                    ),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            d({ parentName: "pre" }, {}),
                            ":::tip My tip\n\nUse this awesome feature option\n\n:::\n\n:::danger Take care\n\nThis action is dangerous\n\n:::\n"
                        )
                    ),
                    (0, a.kt)(
                        "div",
                        d(
                            {},
                            {
                                className:
                                    "admonition admonition-tip alert alert--success"
                            }
                        ),
                        (0, a.kt)(
                            "div",
                            d(
                                { parentName: "div" },
                                { className: "admonition-heading" }
                            ),
                            (0, a.kt)(
                                "h5",
                                { parentName: "div" },
                                (0, a.kt)(
                                    "span",
                                    d(
                                        { parentName: "h5" },
                                        { className: "admonition-icon" }
                                    ),
                                    (0, a.kt)(
                                        "svg",
                                        d(
                                            { parentName: "span" },
                                            {
                                                xmlns: "http://www.w3.org/2000/svg",
                                                width: "12",
                                                height: "16",
                                                viewBox: "0 0 12 16"
                                            }
                                        ),
                                        (0, a.kt)(
                                            "path",
                                            d(
                                                { parentName: "svg" },
                                                {
                                                    fillRule: "evenodd",
                                                    d: "M6.5 0C3.48 0 1 2.19 1 5c0 .92.55 2.25 1 3 1.34 2.25 1.78 2.78 2 4v1h5v-1c.22-1.22.66-1.75 2-4 .45-.75 1-2.08 1-3 0-2.81-2.48-5-5.5-5zm3.64 7.48c-.25.44-.47.8-.67 1.11-.86 1.41-1.25 2.06-1.45 3.23-.02.05-.02.11-.02.17H5c0-.06 0-.13-.02-.17-.2-1.17-.59-1.83-1.45-3.23-.2-.31-.42-.67-.67-1.11C2.44 6.78 2 5.65 2 5c0-2.2 2.02-4 4.5-4 1.22 0 2.36.42 3.22 1.19C10.55 2.94 11 3.94 11 5c0 .66-.44 1.78-.86 2.48zM4 14h5c-.23 1.14-1.3 2-2.5 2s-2.27-.86-2.5-2z"
                                                }
                                            )
                                        )
                                    )
                                ),
                                "My tip"
                            )
                        ),
                        (0, a.kt)(
                            "div",
                            d(
                                { parentName: "div" },
                                { className: "admonition-content" }
                            ),
                            (0, a.kt)(
                                "p",
                                { parentName: "div" },
                                "Use this awesome feature option"
                            )
                        )
                    ),
                    (0, a.kt)(
                        "div",
                        d(
                            {},
                            {
                                className:
                                    "admonition admonition-danger alert alert--danger"
                            }
                        ),
                        (0, a.kt)(
                            "div",
                            d(
                                { parentName: "div" },
                                { className: "admonition-heading" }
                            ),
                            (0, a.kt)(
                                "h5",
                                { parentName: "div" },
                                (0, a.kt)(
                                    "span",
                                    d(
                                        { parentName: "h5" },
                                        { className: "admonition-icon" }
                                    ),
                                    (0, a.kt)(
                                        "svg",
                                        d(
                                            { parentName: "span" },
                                            {
                                                xmlns: "http://www.w3.org/2000/svg",
                                                width: "12",
                                                height: "16",
                                                viewBox: "0 0 12 16"
                                            }
                                        ),
                                        (0, a.kt)(
                                            "path",
                                            d(
                                                { parentName: "svg" },
                                                {
                                                    fillRule: "evenodd",
                                                    d: "M5.05.31c.81 2.17.41 3.38-.52 4.31C3.55 5.67 1.98 6.45.9 7.98c-1.45 2.05-1.7 6.53 3.53 7.7-2.2-1.16-2.67-4.52-.3-6.61-.61 2.03.53 3.33 1.94 2.86 1.39-.47 2.3.53 2.27 1.67-.02.78-.31 1.44-1.13 1.81 3.42-.59 4.78-3.42 4.78-5.56 0-2.84-2.53-3.22-1.25-5.61-1.52.13-2.03 1.13-1.89 2.75.09 1.08-1.02 1.8-1.86 1.33-.67-.41-.66-1.19-.06-1.78C8.18 5.31 8.68 2.45 5.05.32L5.03.3l.02.01z"
                                                }
                                            )
                                        )
                                    )
                                ),
                                "Take care"
                            )
                        ),
                        (0, a.kt)(
                            "div",
                            d(
                                { parentName: "div" },
                                { className: "admonition-content" }
                            ),
                            (0, a.kt)(
                                "p",
                                { parentName: "div" },
                                "This action is dangerous"
                            )
                        )
                    ),
                    (0, a.kt)(
                        "h2",
                        d({}, { id: "mdx-and-react-components" }),
                        "MDX and React Components"
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        (0, a.kt)(
                            "a",
                            d(
                                { parentName: "p" },
                                { href: "https://mdxjs.com/" }
                            ),
                            "MDX"
                        ),
                        " can make your documentation more ",
                        (0, a.kt)("strong", { parentName: "p" }, "interactive"),
                        " and allows using any ",
                        (0, a.kt)(
                            "strong",
                            { parentName: "p" },
                            "React components inside Markdown"
                        ),
                        ":"
                    ),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            d(
                                { parentName: "pre" },
                                { className: "language-jsx" }
                            ),
                            "export const Highlight = ({children, color}) => (\n  <span\n    style={{\n      backgroundColor: color,\n      borderRadius: '20px',\n      color: '#fff',\n      padding: '10px',\n      cursor: 'pointer',\n    }}\n    onClick={() => {\n      alert(`You clicked the color ${color} with label ${children}`)\n    }}>\n    {children}\n  </span>\n);\n\nThis is <Highlight color=\"#25c2a0\">Docusaurus green</Highlight> !\n\nThis is <Highlight color=\"#1877F2\">Facebook blue</Highlight> !\n"
                        )
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "This is ",
                        (0, a.kt)(
                            h,
                            { color: "#25c2a0", mdxType: "Highlight" },
                            "Docusaurus green"
                        ),
                        " !"
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "This is ",
                        (0, a.kt)(
                            h,
                            { color: "#1877F2", mdxType: "Highlight" },
                            "Facebook blue"
                        ),
                        " !"
                    )
                )
            }
            b.isMDXComponent = !0
        },
        4711: (e, t, n) => {
            n.d(t, { Z: () => a })
            const a =
                "data:image/png;base64,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"
        }
    }
])
