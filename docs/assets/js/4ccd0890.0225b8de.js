"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [738],
    {
        6383: (e, t, r) => {
            r.d(t, { Zo: () => u, kt: () => m })
            var a = r(1672)
            function n(e, t, r) {
                return (
                    t in e
                        ? Object.defineProperty(e, t, {
                              value: r,
                              enumerable: !0,
                              configurable: !0,
                              writable: !0
                          })
                        : (e[t] = r),
                    e
                )
            }
            function o(e, t) {
                var r = Object.keys(e)
                if (Object.getOwnPropertySymbols) {
                    var a = Object.getOwnPropertySymbols(e)
                    t &&
                        (a = a.filter(function (t) {
                            return Object.getOwnPropertyDescriptor(
                                e,
                                t
                            ).enumerable
                        })),
                        r.push.apply(r, a)
                }
                return r
            }
            function i(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var r = null != arguments[t] ? arguments[t] : {}
                    t % 2
                        ? o(Object(r), !0).forEach(function (t) {
                              n(e, t, r[t])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(r)
                          )
                        : o(Object(r)).forEach(function (t) {
                              Object.defineProperty(
                                  e,
                                  t,
                                  Object.getOwnPropertyDescriptor(r, t)
                              )
                          })
                }
                return e
            }
            function l(e, t) {
                if (null == e) return {}
                var r,
                    a,
                    n = (function (e, t) {
                        if (null == e) return {}
                        var r,
                            a,
                            n = {},
                            o = Object.keys(e)
                        for (a = 0; a < o.length; a++)
                            (r = o[a]), t.indexOf(r) >= 0 || (n[r] = e[r])
                        return n
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var o = Object.getOwnPropertySymbols(e)
                    for (a = 0; a < o.length; a++)
                        (r = o[a]),
                            t.indexOf(r) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    r
                                ) &&
                                    (n[r] = e[r]))
                }
                return n
            }
            var s = a.createContext({}),
                c = function (e) {
                    var t = a.useContext(s),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : i(i({}, t), e)),
                        r
                    )
                },
                u = function (e) {
                    var t = c(e.components)
                    return a.createElement(s.Provider, { value: t }, e.children)
                },
                p = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return a.createElement(a.Fragment, {}, t)
                    }
                },
                d = a.forwardRef(function (e, t) {
                    var r = e.components,
                        n = e.mdxType,
                        o = e.originalType,
                        s = e.parentName,
                        u = l(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        d = c(r),
                        m = n,
                        f = d["".concat(s, ".").concat(m)] || d[m] || p[m] || o
                    return r
                        ? a.createElement(
                              f,
                              i(i({ ref: t }, u), {}, { components: r })
                          )
                        : a.createElement(f, i({ ref: t }, u))
                })
            function m(e, t) {
                var r = arguments,
                    n = t && t.mdxType
                if ("string" == typeof e || n) {
                    var o = r.length,
                        i = new Array(o)
                    i[0] = d
                    var l = {}
                    for (var s in t) hasOwnProperty.call(t, s) && (l[s] = t[s])
                    ;(l.originalType = e),
                        (l.mdxType = "string" == typeof e ? e : n),
                        (i[1] = l)
                    for (var c = 2; c < o; c++) i[c] = r[c]
                    return a.createElement.apply(null, i)
                }
                return a.createElement.apply(null, r)
            }
            d.displayName = "MDXCreateElement"
        },
        9965: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    frontMatter: () => d,
                    contentTitle: () => m,
                    metadata: () => f,
                    toc: () => b,
                    default: () => y
                })
            var a = r(6383),
                n = Object.defineProperty,
                o = Object.defineProperties,
                i = Object.getOwnPropertyDescriptors,
                l = Object.getOwnPropertySymbols,
                s = Object.prototype.hasOwnProperty,
                c = Object.prototype.propertyIsEnumerable,
                u = (e, t, r) =>
                    t in e
                        ? n(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                p = (e, t) => {
                    for (var r in t || (t = {})) s.call(t, r) && u(e, r, t[r])
                    if (l) for (var r of l(t)) c.call(t, r) && u(e, r, t[r])
                    return e
                }
            const d = { sidebar_position: 2 },
                m = "Create a Document",
                f = {
                    unversionedId: "state/tutorial-basics/create-a-document",
                    id: "state/tutorial-basics/create-a-document",
                    title: "Create a Document",
                    description:
                        "Documents are groups of pages connected through:",
                    source: "@site/docs/state/tutorial-basics/create-a-document.md",
                    sourceDirName: "state/tutorial-basics",
                    slug: "/state/tutorial-basics/create-a-document",
                    permalink: "/docs/state/tutorial-basics/create-a-document",
                    editUrl:
                        "https://github.com/re-do/re-po/edit/main/pkgs/docs/docs/state/tutorial-basics/create-a-document.md",
                    tags: [],
                    version: "current",
                    sidebarPosition: 2,
                    frontMatter: { sidebar_position: 2 },
                    sidebar: "state",
                    previous: {
                        title: "Create a Page",
                        permalink: "/docs/state/tutorial-basics/create-a-page"
                    },
                    next: {
                        title: "Create a Blog Post",
                        permalink:
                            "/docs/state/tutorial-basics/create-a-blog-post"
                    }
                },
                b = [
                    {
                        value: "Create your first Doc",
                        id: "create-your-first-doc",
                        children: [],
                        level: 2
                    },
                    {
                        value: "Configure the Sidebar",
                        id: "configure-the-sidebar",
                        children: [],
                        level: 2
                    }
                ],
                g = { toc: b }
            function y(e) {
                var t,
                    r = e,
                    { components: n } = r,
                    u = ((e, t) => {
                        var r = {}
                        for (var a in e)
                            s.call(e, a) && t.indexOf(a) < 0 && (r[a] = e[a])
                        if (null != e && l)
                            for (var a of l(e))
                                t.indexOf(a) < 0 &&
                                    c.call(e, a) &&
                                    (r[a] = e[a])
                        return r
                    })(r, ["components"])
                return (0, a.kt)(
                    "wrapper",
                    ((t = p(p({}, g), u)),
                    o(t, i({ components: n, mdxType: "MDXLayout" }))),
                    (0, a.kt)(
                        "h1",
                        p({}, { id: "create-a-document" }),
                        "Create a Document"
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "Documents are ",
                        (0, a.kt)(
                            "strong",
                            { parentName: "p" },
                            "groups of pages"
                        ),
                        " connected through:"
                    ),
                    (0, a.kt)(
                        "ul",
                        null,
                        (0, a.kt)(
                            "li",
                            { parentName: "ul" },
                            "a ",
                            (0, a.kt)("strong", { parentName: "li" }, "sidebar")
                        ),
                        (0, a.kt)(
                            "li",
                            { parentName: "ul" },
                            (0, a.kt)(
                                "strong",
                                { parentName: "li" },
                                "previous/next navigation"
                            )
                        ),
                        (0, a.kt)(
                            "li",
                            { parentName: "ul" },
                            (0, a.kt)(
                                "strong",
                                { parentName: "li" },
                                "versioning"
                            )
                        )
                    ),
                    (0, a.kt)(
                        "h2",
                        p({}, { id: "create-your-first-doc" }),
                        "Create your first Doc"
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "Create a markdown file at ",
                        (0, a.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "docs/hello.md"
                        ),
                        ":"
                    ),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            p(
                                { parentName: "pre" },
                                {
                                    className: "language-md",
                                    metastring: 'title="docs/hello.md"',
                                    title: '"docs/hello.md"'
                                }
                            ),
                            "# Hello\n\nThis is my **first Docusaurus document**!\n"
                        )
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "A new document is now available at ",
                        (0, a.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "http://localhost:3000/docs/hello"
                        ),
                        "."
                    ),
                    (0, a.kt)(
                        "h2",
                        p({}, { id: "configure-the-sidebar" }),
                        "Configure the Sidebar"
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "Docusaurus automatically ",
                        (0, a.kt)(
                            "strong",
                            { parentName: "p" },
                            "creates a sidebar"
                        ),
                        " from the ",
                        (0, a.kt)("inlineCode", { parentName: "p" }, "docs"),
                        " folder."
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "Add metadata to customize the sidebar label and position:"
                    ),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            p(
                                { parentName: "pre" },
                                {
                                    className: "language-md",
                                    metastring: 'title="docs/hello.md" {1-4}',
                                    title: '"docs/hello.md"',
                                    "{1-4}": !0
                                }
                            ),
                            '---\nsidebar_label: "Hi!"\nsidebar_position: 3\n---\n\n# Hello\n\nThis is my **first Docusaurus document**!\n'
                        )
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "It is also possible to create your sidebar explicitly in ",
                        (0, a.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "sidebars.js"
                        ),
                        ":"
                    ),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            p(
                                { parentName: "pre" },
                                {
                                    className: "language-diff",
                                    metastring: 'title="sidebars.js"',
                                    title: '"sidebars.js"'
                                }
                            ),
                            "module.exports = {\n  tutorialSidebar: [\n    {\n      type: 'category',\n      label: 'Tutorial',\n-     items: [...],\n+     items: ['hello'],\n    },\n  ],\n};\n"
                        )
                    )
                )
            }
            y.isMDXComponent = !0
        }
    }
])
