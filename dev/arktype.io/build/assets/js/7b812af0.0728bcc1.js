"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [2708],
    {
        9613: (e, t, r) => {
            r.d(t, { Zo: () => u, kt: () => v })
            var n = r(9496)
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
            function c(e) {
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
            function i(e, t) {
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
                p = function (e) {
                    var t = n.useContext(l),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : c(c({}, t), e)),
                        r
                    )
                },
                u = function (e) {
                    var t = p(e.components)
                    return n.createElement(l.Provider, { value: t }, e.children)
                },
                f = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return n.createElement(n.Fragment, {}, t)
                    }
                },
                s = n.forwardRef(function (e, t) {
                    var r = e.components,
                        o = e.mdxType,
                        a = e.originalType,
                        l = e.parentName,
                        u = i(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        s = p(r),
                        v = o,
                        y = s["".concat(l, ".").concat(v)] || s[v] || f[v] || a
                    return r
                        ? n.createElement(
                              y,
                              c(c({ ref: t }, u), {}, { components: r })
                          )
                        : n.createElement(y, c({ ref: t }, u))
                })
            function v(e, t) {
                var r = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var a = r.length,
                        c = new Array(a)
                    c[0] = s
                    var i = {}
                    for (var l in t) hasOwnProperty.call(t, l) && (i[l] = t[l])
                    ;(i.originalType = e),
                        (i.mdxType = "string" == typeof e ? e : o),
                        (c[1] = i)
                    for (var p = 2; p < a; p++) c[p] = r[p]
                    return n.createElement.apply(null, c)
                }
                return n.createElement.apply(null, r)
            }
            s.displayName = "MDXCreateElement"
        },
        994: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => u,
                    contentTitle: () => l,
                    default: () => v,
                    frontMatter: () => i,
                    metadata: () => p,
                    toc: () => f
                })
            var n = r(4250),
                o = r(7075),
                a = (r(9496), r(9613)),
                c = ["components"],
                i = { hide_table_of_contents: !0 },
                l = "valueOf",
                p = {
                    unversionedId: "api/valueof",
                    id: "api/valueof",
                    title: "valueOf",
                    description: "text",
                    source: "@site/docs/api/valueof.md",
                    sourceDirName: "api",
                    slug: "/api/valueof",
                    permalink: "/docs/next/api/valueof",
                    draft: !1,
                    tags: [],
                    version: "current",
                    frontMatter: { hide_table_of_contents: !0 }
                },
                u = {},
                f = [{ value: "text", id: "text", level: 2 }],
                s = { toc: f }
            function v(e) {
                var t = e.components,
                    r = (0, o.Z)(e, c)
                return (0, a.kt)(
                    "wrapper",
                    (0, n.Z)({}, s, r, { components: t, mdxType: "MDXLayout" }),
                    (0, a.kt)("h1", { id: "valueof" }, "valueOf"),
                    (0, a.kt)("h2", { id: "text" }, "text"),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            { parentName: "pre", className: "language-ts" },
                            'valueOf: Ark["valueOf"]\n'
                        )
                    )
                )
            }
            v.isMDXComponent = !0
        }
    }
])
