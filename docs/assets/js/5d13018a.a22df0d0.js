"use strict"
;(self.webpackChunkredo_dev = self.webpackChunkredo_dev || []).push([
    [452],
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
            function c(e, t) {
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
                u = function (e) {
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
                        a = e.originalType,
                        l = e.parentName,
                        p = c(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        d = u(r),
                        f = o,
                        m = d["".concat(l, ".").concat(f)] || d[f] || s[f] || a
                    return r
                        ? n.createElement(
                              m,
                              i(i({ ref: t }, p), {}, { components: r })
                          )
                        : n.createElement(m, i({ ref: t }, p))
                })
            function f(e, t) {
                var r = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var a = r.length,
                        i = new Array(a)
                    i[0] = d
                    var c = {}
                    for (var l in t) hasOwnProperty.call(t, l) && (c[l] = t[l])
                    ;(c.originalType = e),
                        (c.mdxType = "string" == typeof e ? e : o),
                        (i[1] = c)
                    for (var u = 2; u < a; u++) i[u] = r[u]
                    return n.createElement.apply(null, i)
                }
                return n.createElement.apply(null, r)
            }
            d.displayName = "MDXCreateElement"
        },
        3532: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => b,
                    contentTitle: () => f,
                    default: () => h,
                    frontMatter: () => d,
                    metadata: () => m,
                    toc: () => y
                })
            var n = r(7965),
                o = Object.defineProperty,
                a = Object.defineProperties,
                i = Object.getOwnPropertyDescriptors,
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
                f = "State",
                m = {
                    unversionedId: "intro",
                    id: "intro",
                    title: "Intro",
                    description: "Under Construction",
                    source: "@site/docs/state/index.mdx",
                    sourceDirName: ".",
                    slug: "/",
                    permalink: "/state/",
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
                b = {},
                y = [
                    {
                        value: "Under Construction",
                        id: "under-construction",
                        level: 2
                    }
                ],
                v = { toc: y }
            function h(e) {
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
                    a(t, i({ components: o, mdxType: "MDXLayout" }))),
                    (0, n.kt)("h1", s({}, { id: "state" }), "State"),
                    (0, n.kt)(
                        "h2",
                        s({}, { id: "under-construction" }),
                        "Under Construction"
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "We're working hard on a new tool that uses ",
                        (0, n.kt)(
                            "a",
                            s({ parentName: "p" }, { href: "/model/intro" }),
                            "models"
                        ),
                        " to make states that can manage themselves."
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "Think Redux but with less boilerplate, more flexibility, and implicit validation."
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
            h.isMDXComponent = !0
        }
    }
])
