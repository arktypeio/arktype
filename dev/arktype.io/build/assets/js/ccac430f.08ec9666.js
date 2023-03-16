"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [1384],
    {
        9613: (e, t, r) => {
            r.d(t, { Zo: () => s, kt: () => y })
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
            function p(e, t) {
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
            var i = n.createContext({}),
                l = function (e) {
                    var t = n.useContext(i),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : c(c({}, t), e)),
                        r
                    )
                },
                s = function (e) {
                    var t = l(e.components)
                    return n.createElement(i.Provider, { value: t }, e.children)
                },
                u = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return n.createElement(n.Fragment, {}, t)
                    }
                },
                f = n.forwardRef(function (e, t) {
                    var r = e.components,
                        o = e.mdxType,
                        a = e.originalType,
                        i = e.parentName,
                        s = p(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        f = l(r),
                        y = o,
                        m = f["".concat(i, ".").concat(y)] || f[y] || u[y] || a
                    return r
                        ? n.createElement(
                              m,
                              c(c({ ref: t }, s), {}, { components: r })
                          )
                        : n.createElement(m, c({ ref: t }, s))
                })
            function y(e, t) {
                var r = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var a = r.length,
                        c = new Array(a)
                    c[0] = f
                    var p = {}
                    for (var i in t) hasOwnProperty.call(t, i) && (p[i] = t[i])
                    ;(p.originalType = e),
                        (p.mdxType = "string" == typeof e ? e : o),
                        (c[1] = p)
                    for (var l = 2; l < a; l++) c[l] = r[l]
                    return n.createElement.apply(null, c)
                }
                return n.createElement.apply(null, r)
            }
            f.displayName = "MDXCreateElement"
        },
        1359: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => s,
                    contentTitle: () => i,
                    default: () => y,
                    frontMatter: () => p,
                    metadata: () => l,
                    toc: () => u
                })
            var n = r(4250),
                o = r(7075),
                a = (r(9496), r(9613)),
                c = ["components"],
                p = { hide_table_of_contents: !0 },
                i = "Space",
                l = {
                    unversionedId: "api/space",
                    id: "api/space",
                    title: "Space",
                    description: "text",
                    source: "@site/docs/api/space.md",
                    sourceDirName: "api",
                    slug: "/api/space",
                    permalink: "/docs/next/api/space",
                    draft: !1,
                    tags: [],
                    version: "current",
                    frontMatter: { hide_table_of_contents: !0 }
                },
                s = {},
                u = [{ value: "text", id: "text", level: 2 }],
                f = { toc: u }
            function y(e) {
                var t = e.components,
                    r = (0, o.Z)(e, c)
                return (0, a.kt)(
                    "wrapper",
                    (0, n.Z)({}, f, r, { components: t, mdxType: "MDXLayout" }),
                    (0, a.kt)("h1", { id: "space" }, "Space"),
                    (0, a.kt)("h2", { id: "text" }, "text"),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            { parentName: "pre", className: "language-ts" },
                            "export type Space<exports = Dict> = {\n    [k in keyof exports]: Type<exports[k]>\n}\n"
                        )
                    )
                )
            }
            y.isMDXComponent = !0
        }
    }
])
