"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [6746],
    {
        9613: (e, t, n) => {
            n.d(t, { Zo: () => l, kt: () => y })
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
            function i(e) {
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
            function c(e, t) {
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
                u = function (e) {
                    var t = r.useContext(p),
                        n = t
                    return (
                        e &&
                            (n =
                                "function" == typeof e ? e(t) : i(i({}, t), e)),
                        n
                    )
                },
                l = function (e) {
                    var t = u(e.components)
                    return r.createElement(p.Provider, { value: t }, e.children)
                },
                s = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return r.createElement(r.Fragment, {}, t)
                    }
                },
                f = r.forwardRef(function (e, t) {
                    var n = e.components,
                        o = e.mdxType,
                        a = e.originalType,
                        p = e.parentName,
                        l = c(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        f = u(n),
                        y = o,
                        m = f["".concat(p, ".").concat(y)] || f[y] || s[y] || a
                    return n
                        ? r.createElement(
                              m,
                              i(i({ ref: t }, l), {}, { components: n })
                          )
                        : r.createElement(m, i({ ref: t }, l))
                })
            function y(e, t) {
                var n = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var a = n.length,
                        i = new Array(a)
                    i[0] = f
                    var c = {}
                    for (var p in t) hasOwnProperty.call(t, p) && (c[p] = t[p])
                    ;(c.originalType = e),
                        (c.mdxType = "string" == typeof e ? e : o),
                        (i[1] = c)
                    for (var u = 2; u < a; u++) i[u] = n[u]
                    return r.createElement.apply(null, i)
                }
                return r.createElement.apply(null, n)
            }
            f.displayName = "MDXCreateElement"
        },
        2052: (e, t, n) => {
            n.r(t),
                n.d(t, {
                    assets: () => l,
                    contentTitle: () => p,
                    default: () => y,
                    frontMatter: () => c,
                    metadata: () => u,
                    toc: () => s
                })
            var r = n(4250),
                o = n(7075),
                a = (n(9496), n(9613)),
                i = ["components"],
                c = { hide_table_of_contents: !0 },
                p = "union",
                u = {
                    unversionedId: "api/union",
                    id: "api/union",
                    title: "union",
                    description: "text",
                    source: "@site/docs/api/union.md",
                    sourceDirName: "api",
                    slug: "/api/union",
                    permalink: "/docs/next/api/union",
                    draft: !1,
                    tags: [],
                    version: "current",
                    frontMatter: { hide_table_of_contents: !0 }
                },
                l = {},
                s = [{ value: "text", id: "text", level: 2 }],
                f = { toc: s }
            function y(e) {
                var t = e.components,
                    n = (0, o.Z)(e, i)
                return (0, a.kt)(
                    "wrapper",
                    (0, r.Z)({}, f, n, { components: t, mdxType: "MDXLayout" }),
                    (0, a.kt)("h1", { id: "union" }, "union"),
                    (0, a.kt)("h2", { id: "text" }, "text"),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            { parentName: "pre", className: "language-ts" },
                            'union: Ark["union"]\n'
                        )
                    )
                )
            }
            y.isMDXComponent = !0
        }
    }
])
