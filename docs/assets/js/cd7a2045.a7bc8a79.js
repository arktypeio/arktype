"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [459],
    {
        6383: (e, t, r) => {
            r.d(t, { Zo: () => u, kt: () => m })
            var n = r(1672)
            function a(e, t, r) {
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
                    var n = Object.getOwnPropertySymbols(e)
                    t &&
                        (n = n.filter(function (t) {
                            return Object.getOwnPropertyDescriptor(
                                e,
                                t
                            ).enumerable
                        })),
                        r.push.apply(r, n)
                }
                return r
            }
            function i(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var r = null != arguments[t] ? arguments[t] : {}
                    t % 2
                        ? o(Object(r), !0).forEach(function (t) {
                              a(e, t, r[t])
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
                    n,
                    a = (function (e, t) {
                        if (null == e) return {}
                        var r,
                            n,
                            a = {},
                            o = Object.keys(e)
                        for (n = 0; n < o.length; n++)
                            (r = o[n]), t.indexOf(r) >= 0 || (a[r] = e[r])
                        return a
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var o = Object.getOwnPropertySymbols(e)
                    for (n = 0; n < o.length; n++)
                        (r = o[n]),
                            t.indexOf(r) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    r
                                ) &&
                                    (a[r] = e[r]))
                }
                return a
            }
            var s = n.createContext({}),
                c = function (e) {
                    var t = n.useContext(s),
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
                    return n.createElement(s.Provider, { value: t }, e.children)
                },
                p = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return n.createElement(n.Fragment, {}, t)
                    }
                },
                d = n.forwardRef(function (e, t) {
                    var r = e.components,
                        a = e.mdxType,
                        o = e.originalType,
                        s = e.parentName,
                        u = l(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        d = c(r),
                        m = a,
                        f = d["".concat(s, ".").concat(m)] || d[m] || p[m] || o
                    return r
                        ? n.createElement(
                              f,
                              i(i({ ref: t }, u), {}, { components: r })
                          )
                        : n.createElement(f, i({ ref: t }, u))
                })
            function m(e, t) {
                var r = arguments,
                    a = t && t.mdxType
                if ("string" == typeof e || a) {
                    var o = r.length,
                        i = new Array(o)
                    i[0] = d
                    var l = {}
                    for (var s in t) hasOwnProperty.call(t, s) && (l[s] = t[s])
                    ;(l.originalType = e),
                        (l.mdxType = "string" == typeof e ? e : a),
                        (i[1] = l)
                    for (var c = 2; c < o; c++) i[c] = r[c]
                    return n.createElement.apply(null, i)
                }
                return n.createElement.apply(null, r)
            }
            d.displayName = "MDXCreateElement"
        },
        7514: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    frontMatter: () => d,
                    contentTitle: () => m,
                    metadata: () => f,
                    toc: () => b,
                    default: () => y
                })
            var n = r(6383),
                a = Object.defineProperty,
                o = Object.defineProperties,
                i = Object.getOwnPropertyDescriptors,
                l = Object.getOwnPropertySymbols,
                s = Object.prototype.hasOwnProperty,
                c = Object.prototype.propertyIsEnumerable,
                u = (e, t, r) =>
                    t in e
                        ? a(e, t, {
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
                    unversionedId: "test/tutorial-basics/create-a-document",
                    id: "test/tutorial-basics/create-a-document",
                    title: "Create a Document",
                    description:
                        "Documents are groups of pages connected through:",
                    source: "@site/docs/test/tutorial-basics/create-a-document.md",
                    sourceDirName: "test/tutorial-basics",
                    slug: "/test/tutorial-basics/create-a-document",
                    permalink: "/docs/test/tutorial-basics/create-a-document",
                    editUrl:
                        "https://github.com/re-do/re-po/edit/main/pkgs/docs/docs/test/tutorial-basics/create-a-document.md",
                    tags: [],
                    version: "current",
                    sidebarPosition: 2,
                    frontMatter: { sidebar_position: 2 },
                    sidebar: "test",
                    previous: {
                        title: "Create a Page",
                        permalink: "/docs/test/tutorial-basics/create-a-page"
                    },
                    next: {
                        title: "Create a Blog Post",
                        permalink:
                            "/docs/test/tutorial-basics/create-a-blog-post"
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
                    { components: a } = r,
                    u = ((e, t) => {
                        var r = {}
                        for (var n in e)
                            s.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n])
                        if (null != e && l)
                            for (var n of l(e))
                                t.indexOf(n) < 0 &&
                                    c.call(e, n) &&
                                    (r[n] = e[n])
                        return r
                    })(r, ["components"])
                return (0, n.kt)(
                    "wrapper",
                    ((t = p(p({}, g), u)),
                    o(t, i({ components: a, mdxType: "MDXLayout" }))),
                    (0, n.kt)(
                        "h1",
                        p({}, { id: "create-a-document" }),
                        "Create a Document"
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "Documents are ",
                        (0, n.kt)(
                            "strong",
                            { parentName: "p" },
                            "groups of pages"
                        ),
                        " connected through:"
                    ),
                    (0, n.kt)(
                        "ul",
                        null,
                        (0, n.kt)(
                            "li",
                            { parentName: "ul" },
                            "a ",
                            (0, n.kt)("strong", { parentName: "li" }, "sidebar")
                        ),
                        (0, n.kt)(
                            "li",
                            { parentName: "ul" },
                            (0, n.kt)(
                                "strong",
                                { parentName: "li" },
                                "previous/next navigation"
                            )
                        ),
                        (0, n.kt)(
                            "li",
                            { parentName: "ul" },
                            (0, n.kt)(
                                "strong",
                                { parentName: "li" },
                                "versioning"
                            )
                        )
                    ),
                    (0, n.kt)(
                        "h2",
                        p({}, { id: "create-your-first-doc" }),
                        "Create your first Doc"
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "Create a markdown file at ",
                        (0, n.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "docs/hello.md"
                        ),
                        ":"
                    ),
                    (0, n.kt)(
                        "pre",
                        null,
                        (0, n.kt)(
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
                    (0, n.kt)(
                        "p",
                        null,
                        "A new document is now available at ",
                        (0, n.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "http://localhost:3000/docs/hello"
                        ),
                        "."
                    ),
                    (0, n.kt)(
                        "h2",
                        p({}, { id: "configure-the-sidebar" }),
                        "Configure the Sidebar"
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "Docusaurus automatically ",
                        (0, n.kt)(
                            "strong",
                            { parentName: "p" },
                            "creates a sidebar"
                        ),
                        " from the ",
                        (0, n.kt)("inlineCode", { parentName: "p" }, "docs"),
                        " folder."
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "Add metadata to customize the sidebar label and position:"
                    ),
                    (0, n.kt)(
                        "pre",
                        null,
                        (0, n.kt)(
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
                    (0, n.kt)(
                        "p",
                        null,
                        "It is also possible to create your sidebar explicitly in ",
                        (0, n.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "sidebars.js"
                        ),
                        ":"
                    ),
                    (0, n.kt)(
                        "pre",
                        null,
                        (0, n.kt)(
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
