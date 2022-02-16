"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [9],
    {
        6383: (e, t, r) => {
            r.d(t, { Zo: () => p, kt: () => m })
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
            function s(e) {
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
            function i(e, t) {
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
            var l = n.createContext({}),
                c = function (e) {
                    var t = n.useContext(l),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : s(s({}, t), e)),
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
                        a = e.mdxType,
                        o = e.originalType,
                        l = e.parentName,
                        p = i(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        d = c(r),
                        m = a,
                        f = d["".concat(l, ".").concat(m)] || d[m] || u[m] || o
                    return r
                        ? n.createElement(
                              f,
                              s(s({ ref: t }, p), {}, { components: r })
                          )
                        : n.createElement(f, s({ ref: t }, p))
                })
            function m(e, t) {
                var r = arguments,
                    a = t && t.mdxType
                if ("string" == typeof e || a) {
                    var o = r.length,
                        s = new Array(o)
                    s[0] = d
                    var i = {}
                    for (var l in t) hasOwnProperty.call(t, l) && (i[l] = t[l])
                    ;(i.originalType = e),
                        (i.mdxType = "string" == typeof e ? e : a),
                        (s[1] = i)
                    for (var c = 2; c < o; c++) s[c] = r[c]
                    return n.createElement.apply(null, s)
                }
                return n.createElement.apply(null, r)
            }
            d.displayName = "MDXCreateElement"
        },
        7259: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    frontMatter: () => d,
                    contentTitle: () => m,
                    metadata: () => f,
                    toc: () => y,
                    default: () => b
                })
            var n = r(6383),
                a = Object.defineProperty,
                o = Object.defineProperties,
                s = Object.getOwnPropertyDescriptors,
                i = Object.getOwnPropertySymbols,
                l = Object.prototype.hasOwnProperty,
                c = Object.prototype.propertyIsEnumerable,
                p = (e, t, r) =>
                    t in e
                        ? a(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                u = (e, t) => {
                    for (var r in t || (t = {})) l.call(t, r) && p(e, r, t[r])
                    if (i) for (var r of i(t)) c.call(t, r) && p(e, r, t[r])
                    return e
                }
            const d = { sidebar_position: 1 },
                m = "State Intro",
                f = {
                    unversionedId: "state/intro",
                    id: "state/intro",
                    title: "State Intro",
                    description:
                        "Let's discover Docusaurus in less than 5 minutes.",
                    source: "@site/docs/state/intro.md",
                    sourceDirName: "state",
                    slug: "/state/intro",
                    permalink: "/docs/state/intro",
                    editUrl:
                        "https://github.com/re-do/re-po/edit/main/pkgs/docs/docs/state/intro.md",
                    tags: [],
                    version: "current",
                    sidebarPosition: 1,
                    frontMatter: { sidebar_position: 1 },
                    sidebar: "state",
                    next: {
                        title: "Create a Page",
                        permalink: "/docs/state/tutorial-basics/create-a-page"
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
                    { components: a } = r,
                    p = ((e, t) => {
                        var r = {}
                        for (var n in e)
                            l.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n])
                        if (null != e && i)
                            for (var n of i(e))
                                t.indexOf(n) < 0 &&
                                    c.call(e, n) &&
                                    (r[n] = e[n])
                        return r
                    })(r, ["components"])
                return (0, n.kt)(
                    "wrapper",
                    ((t = u(u({}, g), p)),
                    o(t, s({ components: a, mdxType: "MDXLayout" }))),
                    (0, n.kt)(
                        "h1",
                        u({}, { id: "state-intro" }),
                        "State Intro"
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
