"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [2087],
    {
        9613: (e, r, t) => {
            t.d(r, { Zo: () => u, kt: () => y })
            var n = t(9496)
            function o(e, r, t) {
                return (
                    r in e
                        ? Object.defineProperty(e, r, {
                              value: t,
                              enumerable: !0,
                              configurable: !0,
                              writable: !0
                          })
                        : (e[r] = t),
                    e
                )
            }
            function a(e, r) {
                var t = Object.keys(e)
                if (Object.getOwnPropertySymbols) {
                    var n = Object.getOwnPropertySymbols(e)
                    r &&
                        (n = n.filter(function (r) {
                            return Object.getOwnPropertyDescriptor(
                                e,
                                r
                            ).enumerable
                        })),
                        t.push.apply(t, n)
                }
                return t
            }
            function c(e) {
                for (var r = 1; r < arguments.length; r++) {
                    var t = null != arguments[r] ? arguments[r] : {}
                    r % 2
                        ? a(Object(t), !0).forEach(function (r) {
                              o(e, r, t[r])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(t)
                          )
                        : a(Object(t)).forEach(function (r) {
                              Object.defineProperty(
                                  e,
                                  r,
                                  Object.getOwnPropertyDescriptor(t, r)
                              )
                          })
                }
                return e
            }
            function i(e, r) {
                if (null == e) return {}
                var t,
                    n,
                    o = (function (e, r) {
                        if (null == e) return {}
                        var t,
                            n,
                            o = {},
                            a = Object.keys(e)
                        for (n = 0; n < a.length; n++)
                            (t = a[n]), r.indexOf(t) >= 0 || (o[t] = e[t])
                        return o
                    })(e, r)
                if (Object.getOwnPropertySymbols) {
                    var a = Object.getOwnPropertySymbols(e)
                    for (n = 0; n < a.length; n++)
                        (t = a[n]),
                            r.indexOf(t) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    t
                                ) &&
                                    (o[t] = e[t]))
                }
                return o
            }
            var p = n.createContext({}),
                l = function (e) {
                    var r = n.useContext(p),
                        t = r
                    return (
                        e &&
                            (t =
                                "function" == typeof e ? e(r) : c(c({}, r), e)),
                        t
                    )
                },
                u = function (e) {
                    var r = l(e.components)
                    return n.createElement(p.Provider, { value: r }, e.children)
                },
                s = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var r = e.children
                        return n.createElement(n.Fragment, {}, r)
                    }
                },
                f = n.forwardRef(function (e, r) {
                    var t = e.components,
                        o = e.mdxType,
                        a = e.originalType,
                        p = e.parentName,
                        u = i(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        f = l(t),
                        y = o,
                        m = f["".concat(p, ".").concat(y)] || f[y] || s[y] || a
                    return t
                        ? n.createElement(
                              m,
                              c(c({ ref: r }, u), {}, { components: t })
                          )
                        : n.createElement(m, c({ ref: r }, u))
                })
            function y(e, r) {
                var t = arguments,
                    o = r && r.mdxType
                if ("string" == typeof e || o) {
                    var a = t.length,
                        c = new Array(a)
                    c[0] = f
                    var i = {}
                    for (var p in r) hasOwnProperty.call(r, p) && (i[p] = r[p])
                    ;(i.originalType = e),
                        (i.mdxType = "string" == typeof e ? e : o),
                        (c[1] = i)
                    for (var l = 2; l < a; l++) c[l] = t[l]
                    return n.createElement.apply(null, c)
                }
                return n.createElement.apply(null, t)
            }
            f.displayName = "MDXCreateElement"
        },
        1179: (e, r, t) => {
            t.r(r),
                t.d(r, {
                    assets: () => u,
                    contentTitle: () => p,
                    default: () => y,
                    frontMatter: () => i,
                    metadata: () => l,
                    toc: () => s
                })
            var n = t(4250),
                o = t(7075),
                a = (t(9496), t(9613)),
                c = ["components"],
                i = { hide_table_of_contents: !0 },
                p = "narrow",
                l = {
                    unversionedId: "api/narrow",
                    id: "api/narrow",
                    title: "narrow",
                    description: "text",
                    source: "@site/docs/api/narrow.md",
                    sourceDirName: "api",
                    slug: "/api/narrow",
                    permalink: "/docs/next/api/narrow",
                    draft: !1,
                    tags: [],
                    version: "current",
                    frontMatter: { hide_table_of_contents: !0 }
                },
                u = {},
                s = [{ value: "text", id: "text", level: 2 }],
                f = { toc: s }
            function y(e) {
                var r = e.components,
                    t = (0, o.Z)(e, c)
                return (0, a.kt)(
                    "wrapper",
                    (0, n.Z)({}, f, t, { components: r, mdxType: "MDXLayout" }),
                    (0, a.kt)("h1", { id: "narrow" }, "narrow"),
                    (0, a.kt)("h2", { id: "text" }, "text"),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            { parentName: "pre", className: "language-ts" },
                            'narrow: Ark["narrow"]\n'
                        )
                    )
                )
            }
            y.isMDXComponent = !0
        }
    }
])
