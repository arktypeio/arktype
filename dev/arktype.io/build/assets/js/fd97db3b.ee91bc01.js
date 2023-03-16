"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [829],
    {
        9613: (e, t, n) => {
            n.d(t, { Zo: () => s, kt: () => y })
            var r = n(9496)
            function a(e, t, n) {
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
            function o(e, t) {
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
                        ? o(Object(n), !0).forEach(function (t) {
                              a(e, t, n[t])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(n)
                          )
                        : o(Object(n)).forEach(function (t) {
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
                    a = (function (e, t) {
                        if (null == e) return {}
                        var n,
                            r,
                            a = {},
                            o = Object.keys(e)
                        for (r = 0; r < o.length; r++)
                            (n = o[r]), t.indexOf(n) >= 0 || (a[n] = e[n])
                        return a
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var o = Object.getOwnPropertySymbols(e)
                    for (r = 0; r < o.length; r++)
                        (n = o[r]),
                            t.indexOf(n) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    n
                                ) &&
                                    (a[n] = e[n]))
                }
                return a
            }
            var p = r.createContext({}),
                l = function (e) {
                    var t = r.useContext(p),
                        n = t
                    return (
                        e &&
                            (n =
                                "function" == typeof e ? e(t) : i(i({}, t), e)),
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
                        a = e.mdxType,
                        o = e.originalType,
                        p = e.parentName,
                        s = c(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        u = l(n),
                        y = a,
                        m = u["".concat(p, ".").concat(y)] || u[y] || f[y] || o
                    return n
                        ? r.createElement(
                              m,
                              i(i({ ref: t }, s), {}, { components: n })
                          )
                        : r.createElement(m, i({ ref: t }, s))
                })
            function y(e, t) {
                var n = arguments,
                    a = t && t.mdxType
                if ("string" == typeof e || a) {
                    var o = n.length,
                        i = new Array(o)
                    i[0] = u
                    var c = {}
                    for (var p in t) hasOwnProperty.call(t, p) && (c[p] = t[p])
                    ;(c.originalType = e),
                        (c.mdxType = "string" == typeof e ? e : a),
                        (i[1] = c)
                    for (var l = 2; l < o; l++) i[l] = n[l]
                    return r.createElement.apply(null, i)
                }
                return r.createElement.apply(null, n)
            }
            u.displayName = "MDXCreateElement"
        },
        2002: (e, t, n) => {
            n.r(t),
                n.d(t, {
                    assets: () => s,
                    contentTitle: () => p,
                    default: () => y,
                    frontMatter: () => c,
                    metadata: () => l,
                    toc: () => f
                })
            var r = n(4250),
                a = n(7075),
                o = (n(9496), n(9613)),
                i = ["components"],
                c = { hide_table_of_contents: !0 },
                p = "instanceOf",
                l = {
                    unversionedId: "api/instanceof",
                    id: "version-1.0.9-alpha/api/instanceof",
                    title: "instanceOf",
                    description: "text",
                    source: "@site/versioned_docs/version-1.0.9-alpha/api/instanceof.md",
                    sourceDirName: "api",
                    slug: "/api/instanceof",
                    permalink: "/docs/api/instanceof",
                    draft: !1,
                    tags: [],
                    version: "1.0.9-alpha",
                    frontMatter: { hide_table_of_contents: !0 }
                },
                s = {},
                f = [{ value: "text", id: "text", level: 2 }],
                u = { toc: f }
            function y(e) {
                var t = e.components,
                    n = (0, a.Z)(e, i)
                return (0, o.kt)(
                    "wrapper",
                    (0, r.Z)({}, u, n, { components: t, mdxType: "MDXLayout" }),
                    (0, o.kt)("h1", { id: "instanceof" }, "instanceOf"),
                    (0, o.kt)("h2", { id: "text" }, "text"),
                    (0, o.kt)(
                        "pre",
                        null,
                        (0, o.kt)(
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
