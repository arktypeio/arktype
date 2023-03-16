"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [8202],
    {
        9613: (e, t, n) => {
            n.d(t, { Zo: () => s, kt: () => y })
            var r = n(9496)
            function o(e, t, n) {
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
            function a(e, t) {
                var n = Object.keys(e)
                if (Object.getOwnPropertySymbols) {
                    var r = Object.getOwnPropertySymbols(e)
                    t &&
                        (r = r.filter(function (t) {
                            return Object.getOwnPropertyDescriptor(
                                e,
                                t
                            ).enumerable
                        })),
                        n.push.apply(n, r)
                }
                return n
            }
            function c(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var n = null != arguments[t] ? arguments[t] : {}
                    t % 2
                        ? a(Object(n), !0).forEach(function (t) {
                              o(e, t, n[t])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(n)
                          )
                        : a(Object(n)).forEach(function (t) {
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
                    r,
                    o = (function (e, t) {
                        if (null == e) return {}
                        var n,
                            r,
                            o = {},
                            a = Object.keys(e)
                        for (r = 0; r < a.length; r++)
                            (n = a[r]), t.indexOf(n) >= 0 || (o[n] = e[n])
                        return o
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var a = Object.getOwnPropertySymbols(e)
                    for (r = 0; r < a.length; r++)
                        (n = a[r]),
                            t.indexOf(n) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    n
                                ) &&
                                    (o[n] = e[n]))
                }
                return o
            }
            var p = r.createContext({}),
                l = function (e) {
                    var t = r.useContext(p),
                        n = t
                    return (
                        e &&
                            (n =
                                "function" == typeof e ? e(t) : c(c({}, t), e)),
                        n
                    )
                },
                s = function (e) {
                    var t = l(e.components)
                    return r.createElement(p.Provider, { value: t }, e.children)
                },
                f = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return r.createElement(r.Fragment, {}, t)
                    }
                },
                u = r.forwardRef(function (e, t) {
                    var n = e.components,
                        o = e.mdxType,
                        a = e.originalType,
                        p = e.parentName,
                        s = i(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        u = l(n),
                        y = o,
                        m = u["".concat(p, ".").concat(y)] || u[y] || f[y] || a
                    return n
                        ? r.createElement(
                              m,
                              c(c({ ref: t }, s), {}, { components: n })
                          )
                        : r.createElement(m, c({ ref: t }, s))
                })
            function y(e, t) {
                var n = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var a = n.length,
                        c = new Array(a)
                    c[0] = u
                    var i = {}
                    for (var p in t) hasOwnProperty.call(t, p) && (i[p] = t[p])
                    ;(i.originalType = e),
                        (i.mdxType = "string" == typeof e ? e : o),
                        (c[1] = i)
                    for (var l = 2; l < a; l++) c[l] = n[l]
                    return r.createElement.apply(null, c)
                }
                return r.createElement.apply(null, n)
            }
            u.displayName = "MDXCreateElement"
        },
        5488: (e, t, n) => {
            n.r(t),
                n.d(t, {
                    assets: () => s,
                    contentTitle: () => p,
                    default: () => y,
                    frontMatter: () => i,
                    metadata: () => l,
                    toc: () => f
                })
            var r = n(4250),
                o = n(7075),
                a = (n(9496), n(9613)),
                c = ["components"],
                i = { hide_table_of_contents: !0 },
                p = "instanceOf",
                l = {
                    unversionedId: "api/instanceof",
                    id: "api/instanceof",
                    title: "instanceOf",
                    description: "text",
                    source: "@site/docs/api/instanceof.md",
                    sourceDirName: "api",
                    slug: "/api/instanceof",
                    permalink: "/docs/next/api/instanceof",
                    draft: !1,
                    tags: [],
                    version: "current",
                    frontMatter: { hide_table_of_contents: !0 }
                },
                s = {},
                f = [{ value: "text", id: "text", level: 2 }],
                u = { toc: f }
            function y(e) {
                var t = e.components,
                    n = (0, o.Z)(e, c)
                return (0, a.kt)(
                    "wrapper",
                    (0, r.Z)({}, u, n, { components: t, mdxType: "MDXLayout" }),
                    (0, a.kt)("h1", { id: "instanceof" }, "instanceOf"),
                    (0, a.kt)("h2", { id: "text" }, "text"),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            { parentName: "pre", className: "language-ts" },
                            'instanceOf: Ark["instanceOf"]\n'
                        )
                    )
                )
            }
            y.isMDXComponent = !0
        }
    }
])
