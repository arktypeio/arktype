"use strict"
;(self.webpackChunkredo_dev = self.webpackChunkredo_dev || []).push([
    [633],
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
                p = function (e) {
                    var t = c(e.components)
                    return n.createElement(s.Provider, { value: t }, e.children)
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
                        s = e.parentName,
                        p = l(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        u = c(r),
                        f = o,
                        m = u["".concat(s, ".").concat(f)] || u[f] || d[f] || a
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
                    for (var s in t) hasOwnProperty.call(t, s) && (l[s] = t[s])
                    ;(l.originalType = e),
                        (l.mdxType = "string" == typeof e ? e : o),
                        (i[1] = l)
                    for (var c = 2; c < a; c++) i[c] = r[c]
                    return n.createElement.apply(null, i)
                }
                return n.createElement.apply(null, r)
            }
            u.displayName = "MDXCreateElement"
        },
        1987: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => b,
                    contentTitle: () => f,
                    default: () => O,
                    frontMatter: () => u,
                    metadata: () => m,
                    toc: () => y
                })
            var n = r(7965),
                o = Object.defineProperty,
                a = Object.defineProperties,
                i = Object.getOwnPropertyDescriptors,
                l = Object.getOwnPropertySymbols,
                s = Object.prototype.hasOwnProperty,
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
                d = (e, t) => {
                    for (var r in t || (t = {})) s.call(t, r) && p(e, r, t[r])
                    if (l) for (var r of l(t)) c.call(t, r) && p(e, r, t[r])
                    return e
                }
            const u = { sidebar_position: 4, hide_table_of_contents: !0 },
                f = "Constraints",
                m = {
                    unversionedId: "constraints",
                    id: "constraints",
                    title: "Constraints",
                    description:
                        "TypeScript can do a lot, but sometimes things you care about at runtime shouldn't affect your type.",
                    source: "@site/docs/model/constraints.mdx",
                    sourceDirName: ".",
                    slug: "/constraints",
                    permalink: "/model/next/constraints",
                    draft: !1,
                    tags: [],
                    version: "current",
                    sidebarPosition: 4,
                    frontMatter: {
                        sidebar_position: 4,
                        hide_table_of_contents: !0
                    },
                    sidebar: "sidebar",
                    previous: {
                        title: "Declarations",
                        permalink: "/model/next/declarations"
                    },
                    next: { title: "model", permalink: "/model/next/api/model" }
                },
                b = {},
                y = [],
                v = { toc: y }
            function O(e) {
                var t,
                    r = e,
                    { components: o } = r,
                    p = ((e, t) => {
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
                    ((t = d(d({}, v), p)),
                    a(t, i({ components: o, mdxType: "MDXLayout" }))),
                    (0, n.kt)(
                        "h1",
                        d({}, { id: "constraints" }),
                        "Constraints"
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "TypeScript can do a lot, but sometimes things you care about at runtime shouldn't affect your type."
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        (0, n.kt)("strong", { parentName: "p" }, "Constraints"),
                        " have you covered."
                    ),
                    (0, n.kt)(
                        "div",
                        {
                            style: {
                                width: "100%",
                                height: "790px",
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
                            src: "https://stackblitz.com/edit/re-model-constraints?embed=1&file=constraints.ts&hideDevTools=1&hideExplorer=1&hideNavigation=1&theme=dark",
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
