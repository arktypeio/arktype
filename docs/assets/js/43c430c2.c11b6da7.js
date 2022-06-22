"use strict"
;(self.webpackChunkredo_dev = self.webpackChunkredo_dev || []).push([
    [747],
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
            function l(e, t) {
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
            var c = n.createContext({}),
                s = function (e) {
                    var t = n.useContext(c),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : i(i({}, t), e)),
                        r
                    )
                },
                p = function (e) {
                    var t = s(e.components)
                    return n.createElement(c.Provider, { value: t }, e.children)
                },
                d = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return n.createElement(n.Fragment, {}, t)
                    }
                },
                u = n.forwardRef(function (e, t) {
                    var r = e.components,
                        o = e.mdxType,
                        a = e.originalType,
                        c = e.parentName,
                        p = l(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        u = s(r),
                        f = o,
                        m = u["".concat(c, ".").concat(f)] || u[f] || d[f] || a
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
                    i[0] = u
                    var l = {}
                    for (var c in t) hasOwnProperty.call(t, c) && (l[c] = t[c])
                    ;(l.originalType = e),
                        (l.mdxType = "string" == typeof e ? e : o),
                        (i[1] = l)
                    for (var s = 2; s < a; s++) i[s] = r[s]
                    return n.createElement.apply(null, i)
                }
                return n.createElement.apply(null, r)
            }
            u.displayName = "MDXCreateElement"
        },
        6340: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => y,
                    contentTitle: () => f,
                    default: () => O,
                    frontMatter: () => u,
                    metadata: () => m,
                    toc: () => b
                })
            var n = r(7965),
                o = Object.defineProperty,
                a = Object.defineProperties,
                i = Object.getOwnPropertyDescriptors,
                l = Object.getOwnPropertySymbols,
                c = Object.prototype.hasOwnProperty,
                s = Object.prototype.propertyIsEnumerable,
                p = (e, t, r) =>
                    t in e
                        ? o(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                d = (e, t) => {
                    for (var r in t || (t = {})) c.call(t, r) && p(e, r, t[r])
                    if (l) for (var r of l(t)) s.call(t, r) && p(e, r, t[r])
                    return e
                }
            const u = { hide_table_of_contents: !0 },
                f = "Declarations",
                m = {
                    unversionedId: "declarations",
                    id: "declarations",
                    title: "Declarations",
                    description:
                        "Like keeping your files small and tidy? Perhaps you'd prefer to split your definitions up.",
                    source: "@site/docs/model/declarations.mdx",
                    sourceDirName: ".",
                    slug: "/declarations",
                    permalink: "/model/next/declarations",
                    draft: !1,
                    tags: [],
                    version: "current",
                    frontMatter: { hide_table_of_contents: !0 },
                    sidebar: "sidebar",
                    previous: {
                        title: "Spaces",
                        permalink: "/model/next/spaces"
                    },
                    next: {
                        title: "Constraints",
                        permalink: "/model/next/constraints"
                    }
                },
                y = {},
                b = [],
                v = { toc: b }
            function O(e) {
                var t,
                    r = e,
                    { components: o } = r,
                    p = ((e, t) => {
                        var r = {}
                        for (var n in e)
                            c.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n])
                        if (null != e && l)
                            for (var n of l(e))
                                t.indexOf(n) < 0 &&
                                    s.call(e, n) &&
                                    (r[n] = e[n])
                        return r
                    })(r, ["components"])
                return (0, n.kt)(
                    "wrapper",
                    ((t = d(d({}, v), p)),
                    a(t, i({ components: o, mdxType: "MDXLayout" }))),
                    (0, n.kt)(
                        "h1",
                        d({}, { id: "declarations" }),
                        "Declarations"
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "Like keeping your files small and tidy? Perhaps you'd prefer to split your definitions up."
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "Try a ",
                        (0, n.kt)("strong", { parentName: "p" }, "declaration"),
                        "."
                    ),
                    (0, n.kt)(
                        "div",
                        {
                            style: {
                                width: "100%",
                                height: "730px",
                                border: 0,
                                marginLeft: -8,
                                marginRight: -8,
                                padding: 16,
                                overflow: "hidden",
                                borderRadius: 8
                            }
                        },
                        (0, n.kt)("iframe", {
                            id: "demo",
                            src: "https://stackblitz.com/edit/re-model-declaration?file=models%2Findex.ts&hideDevTools=1&hideExplorer=1&hideNavigation=1&theme=dark",
                            style: {
                                height: "100%",
                                width: "100%",
                                borderRadius: 8
                            },
                            title: "@re-/model",
                            sandbox:
                                "allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                        })
                    )
                )
            }
            O.isMDXComponent = !0
        }
    }
])
