"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [183],
    {
        6383: (e, t, a) => {
            a.d(t, { Zo: () => s, kt: () => m })
            var r = a(1672)
            function n(e, t, a) {
                return (
                    t in e
                        ? Object.defineProperty(e, t, {
                              value: a,
                              enumerable: !0,
                              configurable: !0,
                              writable: !0
                          })
                        : (e[t] = a),
                    e
                )
            }
            function o(e, t) {
                var a = Object.keys(e)
                if (Object.getOwnPropertySymbols) {
                    var r = Object.getOwnPropertySymbols(e)
                    t &&
                        (r = r.filter(function (t) {
                            return Object.getOwnPropertyDescriptor(
                                e,
                                t
                            ).enumerable
                        })),
                        a.push.apply(a, r)
                }
                return a
            }
            function i(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var a = null != arguments[t] ? arguments[t] : {}
                    t % 2
                        ? o(Object(a), !0).forEach(function (t) {
                              n(e, t, a[t])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(a)
                          )
                        : o(Object(a)).forEach(function (t) {
                              Object.defineProperty(
                                  e,
                                  t,
                                  Object.getOwnPropertyDescriptor(a, t)
                              )
                          })
                }
                return e
            }
            function l(e, t) {
                if (null == e) return {}
                var a,
                    r,
                    n = (function (e, t) {
                        if (null == e) return {}
                        var a,
                            r,
                            n = {},
                            o = Object.keys(e)
                        for (r = 0; r < o.length; r++)
                            (a = o[r]), t.indexOf(a) >= 0 || (n[a] = e[a])
                        return n
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var o = Object.getOwnPropertySymbols(e)
                    for (r = 0; r < o.length; r++)
                        (a = o[r]),
                            t.indexOf(a) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    a
                                ) &&
                                    (n[a] = e[a]))
                }
                return n
            }
            var p = r.createContext({}),
                c = function (e) {
                    var t = r.useContext(p),
                        a = t
                    return (
                        e &&
                            (a =
                                "function" == typeof e ? e(t) : i(i({}, t), e)),
                        a
                    )
                },
                s = function (e) {
                    var t = c(e.components)
                    return r.createElement(p.Provider, { value: t }, e.children)
                },
                u = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return r.createElement(r.Fragment, {}, t)
                    }
                },
                d = r.forwardRef(function (e, t) {
                    var a = e.components,
                        n = e.mdxType,
                        o = e.originalType,
                        p = e.parentName,
                        s = l(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        d = c(a),
                        m = n,
                        g = d["".concat(p, ".").concat(m)] || d[m] || u[m] || o
                    return a
                        ? r.createElement(
                              g,
                              i(i({ ref: t }, s), {}, { components: a })
                          )
                        : r.createElement(g, i({ ref: t }, s))
                })
            function m(e, t) {
                var a = arguments,
                    n = t && t.mdxType
                if ("string" == typeof e || n) {
                    var o = a.length,
                        i = new Array(o)
                    i[0] = d
                    var l = {}
                    for (var p in t) hasOwnProperty.call(t, p) && (l[p] = t[p])
                    ;(l.originalType = e),
                        (l.mdxType = "string" == typeof e ? e : n),
                        (i[1] = l)
                    for (var c = 2; c < o; c++) i[c] = a[c]
                    return r.createElement.apply(null, i)
                }
                return r.createElement.apply(null, a)
            }
            d.displayName = "MDXCreateElement"
        },
        5528: (e, t, a) => {
            a.r(t),
                a.d(t, {
                    frontMatter: () => d,
                    contentTitle: () => m,
                    metadata: () => g,
                    toc: () => f,
                    default: () => b
                })
            var r = a(6383),
                n = Object.defineProperty,
                o = Object.defineProperties,
                i = Object.getOwnPropertyDescriptors,
                l = Object.getOwnPropertySymbols,
                p = Object.prototype.hasOwnProperty,
                c = Object.prototype.propertyIsEnumerable,
                s = (e, t, a) =>
                    t in e
                        ? n(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: a
                          })
                        : (e[t] = a),
                u = (e, t) => {
                    for (var a in t || (t = {})) p.call(t, a) && s(e, a, t[a])
                    if (l) for (var a of l(t)) c.call(t, a) && s(e, a, t[a])
                    return e
                }
            const d = { sidebar_position: 1 },
                m = "Create a Page",
                g = {
                    unversionedId: "state/tutorial-basics/create-a-page",
                    id: "state/tutorial-basics/create-a-page",
                    title: "Create a Page",
                    description:
                        "Add Markdown or React files to src/pages to create a standalone page:",
                    source: "@site/docs/state/tutorial-basics/create-a-page.md",
                    sourceDirName: "state/tutorial-basics",
                    slug: "/state/tutorial-basics/create-a-page",
                    permalink: "/docs/state/tutorial-basics/create-a-page",
                    editUrl:
                        "https://github.com/re-do/re-po/edit/main/pkgs/docs/docs/state/tutorial-basics/create-a-page.md",
                    tags: [],
                    version: "current",
                    sidebarPosition: 1,
                    frontMatter: { sidebar_position: 1 },
                    sidebar: "state",
                    previous: {
                        title: "State Intro",
                        permalink: "/docs/state/intro"
                    },
                    next: {
                        title: "Create a Document",
                        permalink:
                            "/docs/state/tutorial-basics/create-a-document"
                    }
                },
                f = [
                    {
                        value: "Create your first React Page",
                        id: "create-your-first-react-page",
                        children: [],
                        level: 2
                    },
                    {
                        value: "Create your first Markdown Page",
                        id: "create-your-first-markdown-page",
                        children: [],
                        level: 2
                    }
                ],
                y = { toc: f }
            function b(e) {
                var t,
                    a = e,
                    { components: n } = a,
                    s = ((e, t) => {
                        var a = {}
                        for (var r in e)
                            p.call(e, r) && t.indexOf(r) < 0 && (a[r] = e[r])
                        if (null != e && l)
                            for (var r of l(e))
                                t.indexOf(r) < 0 &&
                                    c.call(e, r) &&
                                    (a[r] = e[r])
                        return a
                    })(a, ["components"])
                return (0, r.kt)(
                    "wrapper",
                    ((t = u(u({}, y), s)),
                    o(t, i({ components: n, mdxType: "MDXLayout" }))),
                    (0, r.kt)(
                        "h1",
                        u({}, { id: "create-a-page" }),
                        "Create a Page"
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "Add ",
                        (0, r.kt)(
                            "strong",
                            { parentName: "p" },
                            "Markdown or React"
                        ),
                        " files to ",
                        (0, r.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "src/pages"
                        ),
                        " to create a ",
                        (0, r.kt)(
                            "strong",
                            { parentName: "p" },
                            "standalone page"
                        ),
                        ":"
                    ),
                    (0, r.kt)(
                        "ul",
                        null,
                        (0, r.kt)(
                            "li",
                            { parentName: "ul" },
                            (0, r.kt)(
                                "inlineCode",
                                { parentName: "li" },
                                "src/pages/index.js"
                            ),
                            " -> ",
                            (0, r.kt)(
                                "inlineCode",
                                { parentName: "li" },
                                "localhost:3000/"
                            )
                        ),
                        (0, r.kt)(
                            "li",
                            { parentName: "ul" },
                            (0, r.kt)(
                                "inlineCode",
                                { parentName: "li" },
                                "src/pages/foo.md"
                            ),
                            " -> ",
                            (0, r.kt)(
                                "inlineCode",
                                { parentName: "li" },
                                "localhost:3000/foo"
                            )
                        ),
                        (0, r.kt)(
                            "li",
                            { parentName: "ul" },
                            (0, r.kt)(
                                "inlineCode",
                                { parentName: "li" },
                                "src/pages/foo/bar.js"
                            ),
                            " -> ",
                            (0, r.kt)(
                                "inlineCode",
                                { parentName: "li" },
                                "localhost:3000/foo/bar"
                            )
                        )
                    ),
                    (0, r.kt)(
                        "h2",
                        u({}, { id: "create-your-first-react-page" }),
                        "Create your first React Page"
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "Create a file at ",
                        (0, r.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "src/pages/my-react-page.js"
                        ),
                        ":"
                    ),
                    (0, r.kt)(
                        "pre",
                        null,
                        (0, r.kt)(
                            "code",
                            u(
                                { parentName: "pre" },
                                {
                                    className: "language-jsx",
                                    metastring:
                                        'title="src/pages/my-react-page.js"',
                                    title: '"src/pages/my-react-page.js"'
                                }
                            ),
                            'import React from "react"\nimport Layout from "@theme/Layout"\n\nexport default function MyReactPage() {\n    return (\n        <Layout>\n            <h1>My React page</h1>\n            <p>This is a React page</p>\n        </Layout>\n    )\n}\n'
                        )
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "A new page is now available at ",
                        (0, r.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "http://localhost:3000/my-react-page"
                        ),
                        "."
                    ),
                    (0, r.kt)(
                        "h2",
                        u({}, { id: "create-your-first-markdown-page" }),
                        "Create your first Markdown Page"
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "Create a file at ",
                        (0, r.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "src/pages/my-markdown-page.md"
                        ),
                        ":"
                    ),
                    (0, r.kt)(
                        "pre",
                        null,
                        (0, r.kt)(
                            "code",
                            u(
                                { parentName: "pre" },
                                {
                                    className: "language-mdx",
                                    metastring:
                                        'title="src/pages/my-markdown-page.md"',
                                    title: '"src/pages/my-markdown-page.md"'
                                }
                            ),
                            "# My Markdown page\n\nThis is a Markdown page\n"
                        )
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "A new page is now available at ",
                        (0, r.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "http://localhost:3000/my-markdown-page"
                        ),
                        "."
                    )
                )
            }
            b.isMDXComponent = !0
        }
    }
])
