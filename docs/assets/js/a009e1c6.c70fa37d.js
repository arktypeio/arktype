"use strict"
;(self.webpackChunkredo_dev = self.webpackChunkredo_dev || []).push([
    [365],
    {
        7965: (e, t, r) => {
            r.d(t, { Zo: () => p, kt: () => f })
            var n = r(3889)
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
            function i(e, t) {
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
            function a(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var r = null != arguments[t] ? arguments[t] : {}
                    t % 2
                        ? i(Object(r), !0).forEach(function (t) {
                              o(e, t, r[t])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(r)
                          )
                        : i(Object(r)).forEach(function (t) {
                              Object.defineProperty(
                                  e,
                                  t,
                                  Object.getOwnPropertyDescriptor(r, t)
                              )
                          })
                }
                return e
            }
            function c(e, t) {
                if (null == e) return {}
                var r,
                    n,
                    o = (function (e, t) {
                        if (null == e) return {}
                        var r,
                            n,
                            o = {},
                            i = Object.keys(e)
                        for (n = 0; n < i.length; n++)
                            (r = i[n]), t.indexOf(r) >= 0 || (o[r] = e[r])
                        return o
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var i = Object.getOwnPropertySymbols(e)
                    for (n = 0; n < i.length; n++)
                        (r = i[n]),
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
                u = function (e) {
                    var t = n.useContext(l),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : a(a({}, t), e)),
                        r
                    )
                },
                p = function (e) {
                    var t = u(e.components)
                    return n.createElement(l.Provider, { value: t }, e.children)
                },
                s = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return n.createElement(n.Fragment, {}, t)
                    }
                },
                d = n.forwardRef(function (e, t) {
                    var r = e.components,
                        o = e.mdxType,
                        i = e.originalType,
                        l = e.parentName,
                        p = c(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        d = u(r),
                        f = o,
                        y = d["".concat(l, ".").concat(f)] || d[f] || s[f] || i
                    return r
                        ? n.createElement(
                              y,
                              a(a({ ref: t }, p), {}, { components: r })
                          )
                        : n.createElement(y, a({ ref: t }, p))
                })
            function f(e, t) {
                var r = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var i = r.length,
                        a = new Array(i)
                    a[0] = d
                    var c = {}
                    for (var l in t) hasOwnProperty.call(t, l) && (c[l] = t[l])
                    ;(c.originalType = e),
                        (c.mdxType = "string" == typeof e ? e : o),
                        (a[1] = c)
                    for (var u = 2; u < i; u++) a[u] = r[u]
                    return n.createElement.apply(null, a)
                }
                return n.createElement.apply(null, r)
            }
            d.displayName = "MDXCreateElement"
        },
        5268: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => m,
                    contentTitle: () => f,
                    default: () => g,
                    frontMatter: () => d,
                    metadata: () => y,
                    toc: () => b
                })
            var n = r(7965),
                o = Object.defineProperty,
                i = Object.defineProperties,
                a = Object.getOwnPropertyDescriptors,
                c = Object.getOwnPropertySymbols,
                l = Object.prototype.hasOwnProperty,
                u = Object.prototype.propertyIsEnumerable,
                p = (e, t, r) =>
                    t in e
                        ? o(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                s = (e, t) => {
                    for (var r in t || (t = {})) l.call(t, r) && p(e, r, t[r])
                    if (c) for (var r of c(t)) u.call(t, r) && p(e, r, t[r])
                    return e
                }
            const d = { id: "intro", title: "Intro", sidebar_position: 1 },
                f = "Test",
                y = {
                    unversionedId: "intro",
                    id: "intro",
                    title: "Intro",
                    description: "Under Construction",
                    source: "@site/docs/test/index.mdx",
                    sourceDirName: ".",
                    slug: "/",
                    permalink: "/test/",
                    draft: !1,
                    tags: [],
                    version: "current",
                    sidebarPosition: 1,
                    frontMatter: {
                        id: "intro",
                        title: "Intro",
                        sidebar_position: 1
                    },
                    sidebar: "defaultSidebar"
                },
                m = {},
                b = [
                    {
                        value: "Under Construction",
                        id: "under-construction",
                        level: 2
                    }
                ],
                v = { toc: b }
            function g(e) {
                var t,
                    r = e,
                    { components: o } = r,
                    p = ((e, t) => {
                        var r = {}
                        for (var n in e)
                            l.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n])
                        if (null != e && c)
                            for (var n of c(e))
                                t.indexOf(n) < 0 &&
                                    u.call(e, n) &&
                                    (r[n] = e[n])
                        return r
                    })(r, ["components"])
                return (0, n.kt)(
                    "wrapper",
                    ((t = s(s({}, v), p)),
                    i(t, a({ components: o, mdxType: "MDXLayout" }))),
                    (0, n.kt)("h1", s({}, { id: "test" }), "Test"),
                    (0, n.kt)(
                        "h2",
                        s({}, { id: "under-construction" }),
                        "Under Construction"
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "Do you love writing automated UI test?"
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "Neither do we. They're boring, flaky and repetitive."
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "That's why we're building a tool that generates simple, maintainable JSON to represent your app's UI and tests it for you."
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "If you want to learn more, the project is tracked ",
                        (0, n.kt)(
                            "a",
                            s(
                                { parentName: "p" },
                                {
                                    href: "https://github.com/re-do/re-po/projects/1"
                                }
                            ),
                            "here"
                        ),
                        "."
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "If you're interested in contributing, check out our guide ",
                        (0, n.kt)(
                            "a",
                            s(
                                { parentName: "p" },
                                {
                                    href: "https://github.com/re-do/re-po/blob/main/CONTRIBUTING.md"
                                }
                            ),
                            "here"
                        ),
                        " or, if you really want to make my day, reach out to ",
                        (0, n.kt)(
                            "a",
                            s(
                                { parentName: "p" },
                                { href: "mailto:david@redo.dev" }
                            ),
                            "david@redo.dev"
                        ),
                        ". I'd love to talk about your ideas or suggest issues that might be a good fit! \ud83d\ude3b"
                    ),
                    (0, n.kt)(
                        "div",
                        null,
                        (0, n.kt)("img", {
                            style: { height: 300 },
                            src: "/img/construction.svg",
                            alt: "Under Construction"
                        })
                    )
                )
            }
            g.isMDXComponent = !0
        }
    }
])
