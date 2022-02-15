"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [591],
    {
        6383: (e, t, r) => {
            r.d(t, { Zo: () => p, kt: () => m })
            var n = r(1672)
            function o(e, t, r) {
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
            function a(e, t) {
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
                        ? a(Object(r), !0).forEach(function (t) {
                              o(e, t, r[t])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(r)
                          )
                        : a(Object(r)).forEach(function (t) {
                              Object.defineProperty(
                                  e,
                                  t,
                                  Object.getOwnPropertyDescriptor(r, t)
                              )
                          })
                }
                return e
            }
            function s(e, t) {
                if (null == e) return {}
                var r,
                    n,
                    o = (function (e, t) {
                        if (null == e) return {}
                        var r,
                            n,
                            o = {},
                            a = Object.keys(e)
                        for (n = 0; n < a.length; n++)
                            (r = a[n]), t.indexOf(r) >= 0 || (o[r] = e[r])
                        return o
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var a = Object.getOwnPropertySymbols(e)
                    for (n = 0; n < a.length; n++)
                        (r = a[n]),
                            t.indexOf(r) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    r
                                ) &&
                                    (o[r] = e[r]))
                }
                return o
            }
            var l = n.createContext({}),
                c = function (e) {
                    var t = n.useContext(l),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : i(i({}, t), e)),
                        r
                    )
                },
                p = function (e) {
                    var t = c(e.components)
                    return n.createElement(l.Provider, { value: t }, e.children)
                },
                u = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return n.createElement(n.Fragment, {}, t)
                    }
                },
                d = n.forwardRef(function (e, t) {
                    var r = e.components,
                        o = e.mdxType,
                        a = e.originalType,
                        l = e.parentName,
                        p = s(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        d = c(r),
                        m = o,
                        f = d["".concat(l, ".").concat(m)] || d[m] || u[m] || a
                    return r
                        ? n.createElement(
                              f,
                              i(i({ ref: t }, p), {}, { components: r })
                          )
                        : n.createElement(f, i({ ref: t }, p))
                })
            function m(e, t) {
                var r = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var a = r.length,
                        i = new Array(a)
                    i[0] = d
                    var s = {}
                    for (var l in t) hasOwnProperty.call(t, l) && (s[l] = t[l])
                    ;(s.originalType = e),
                        (s.mdxType = "string" == typeof e ? e : o),
                        (i[1] = s)
                    for (var c = 2; c < a; c++) i[c] = r[c]
                    return n.createElement.apply(null, i)
                }
                return n.createElement.apply(null, r)
            }
            d.displayName = "MDXCreateElement"
        },
        8: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    frontMatter: () => d,
                    contentTitle: () => m,
                    metadata: () => f,
                    toc: () => y,
                    default: () => b
                })
            var n = r(6383),
                o = Object.defineProperty,
                a = Object.defineProperties,
                i = Object.getOwnPropertyDescriptors,
                s = Object.getOwnPropertySymbols,
                l = Object.prototype.hasOwnProperty,
                c = Object.prototype.propertyIsEnumerable,
                p = (e, t, r) =>
                    t in e
                        ? o(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                u = (e, t) => {
                    for (var r in t || (t = {})) l.call(t, r) && p(e, r, t[r])
                    if (s) for (var r of s(t)) c.call(t, r) && p(e, r, t[r])
                    return e
                }
            const d = { sidebar_position: 1 },
                m = "Model Intro",
                f = {
                    unversionedId: "model/intro",
                    id: "model/intro",
                    title: "Model Intro",
                    description:
                        "Let's discover Docusaurus in less than 5 minutes.",
                    source: "@site/docs/model/intro.md",
                    sourceDirName: "model",
                    slug: "/model/intro",
                    permalink: "/docs/model/intro",
                    editUrl:
                        "https://github.com/re-do/re-po/edit/main/pkgs/docs/docs/model/intro.md",
                    tags: [],
                    version: "current",
                    sidebarPosition: 1,
                    frontMatter: { sidebar_position: 1 },
                    sidebar: "model",
                    next: {
                        title: "Create a Page",
                        permalink: "/docs/model/tutorial-basics/create-a-page"
                    }
                },
                y = [
                    {
                        value: "Getting Started",
                        id: "getting-started",
                        children: [],
                        level: 2
                    },
                    {
                        value: "Generate a new site",
                        id: "generate-a-new-site",
                        children: [],
                        level: 2
                    },
                    {
                        value: "Start your site",
                        id: "start-your-site",
                        children: [],
                        level: 2
                    }
                ],
                g = { toc: y }
            function b(e) {
                var t,
                    r = e,
                    { components: o } = r,
                    p = ((e, t) => {
                        var r = {}
                        for (var n in e)
                            l.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n])
                        if (null != e && s)
                            for (var n of s(e))
                                t.indexOf(n) < 0 &&
                                    c.call(e, n) &&
                                    (r[n] = e[n])
                        return r
                    })(r, ["components"])
                return (0, n.kt)(
                    "wrapper",
                    ((t = u(u({}, g), p)),
                    a(t, i({ components: o, mdxType: "MDXLayout" }))),
                    (0, n.kt)(
                        "h1",
                        u({}, { id: "model-intro" }),
                        "Model Intro"
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "Let's discover ",
                        (0, n.kt)(
                            "strong",
                            { parentName: "p" },
                            "Docusaurus in less than 5 minutes"
                        ),
                        "."
                    ),
                    (0, n.kt)(
                        "h2",
                        u({}, { id: "getting-started" }),
                        "Getting Started"
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "Get started by ",
                        (0, n.kt)(
                            "strong",
                            { parentName: "p" },
                            "creating a new site"
                        ),
                        "."
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "Or ",
                        (0, n.kt)(
                            "strong",
                            { parentName: "p" },
                            "try Docusaurus immediately"
                        ),
                        " with ",
                        (0, n.kt)(
                            "strong",
                            { parentName: "p" },
                            (0, n.kt)(
                                "a",
                                u(
                                    { parentName: "strong" },
                                    { href: "https://docusaurus.new" }
                                ),
                                "docusaurus.new"
                            )
                        ),
                        "."
                    ),
                    (0, n.kt)(
                        "h2",
                        u({}, { id: "generate-a-new-site" }),
                        "Generate a new site"
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "Generate a new Docusaurus site using the ",
                        (0, n.kt)(
                            "strong",
                            { parentName: "p" },
                            "classic template"
                        ),
                        ":"
                    ),
                    (0, n.kt)(
                        "pre",
                        null,
                        (0, n.kt)(
                            "code",
                            u(
                                { parentName: "pre" },
                                { className: "language-shell" }
                            ),
                            "npm init docusaurus@latest my-website classic\n"
                        )
                    ),
                    (0, n.kt)(
                        "h2",
                        u({}, { id: "start-your-site" }),
                        "Start your site"
                    ),
                    (0, n.kt)("p", null, "Run the development server:"),
                    (0, n.kt)(
                        "pre",
                        null,
                        (0, n.kt)(
                            "code",
                            u(
                                { parentName: "pre" },
                                { className: "language-shell" }
                            ),
                            "cd my-website\n\nnpx docusaurus start\n"
                        )
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "Your site starts at ",
                        (0, n.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "http://localhost:3000"
                        ),
                        "."
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "Open ",
                        (0, n.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "docs/intro.md"
                        ),
                        " and edit some lines: the site ",
                        (0, n.kt)(
                            "strong",
                            { parentName: "p" },
                            "reloads automatically"
                        ),
                        " and displays your changes."
                    )
                )
            }
            b.isMDXComponent = !0
        }
    }
])
