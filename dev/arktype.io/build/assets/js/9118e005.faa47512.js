"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [9452],
    {
        9613: (e, r, t) => {
            t.d(r, { Zo: () => f, kt: () => y })
            var n = t(9496)
            function a(e, r, t) {
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
            function o(e, r) {
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
            function i(e) {
                for (var r = 1; r < arguments.length; r++) {
                    var t = null != arguments[r] ? arguments[r] : {}
                    r % 2
                        ? o(Object(t), !0).forEach(function (r) {
                              a(e, r, t[r])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(t)
                          )
                        : o(Object(t)).forEach(function (r) {
                              Object.defineProperty(
                                  e,
                                  r,
                                  Object.getOwnPropertyDescriptor(t, r)
                              )
                          })
                }
                return e
            }
            function c(e, r) {
                if (null == e) return {}
                var t,
                    n,
                    a = (function (e, r) {
                        if (null == e) return {}
                        var t,
                            n,
                            a = {},
                            o = Object.keys(e)
                        for (n = 0; n < o.length; n++)
                            (t = o[n]), r.indexOf(t) >= 0 || (a[t] = e[t])
                        return a
                    })(e, r)
                if (Object.getOwnPropertySymbols) {
                    var o = Object.getOwnPropertySymbols(e)
                    for (n = 0; n < o.length; n++)
                        (t = o[n]),
                            r.indexOf(t) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    t
                                ) &&
                                    (a[t] = e[t]))
                }
                return a
            }
            var p = n.createContext({}),
                l = function (e) {
                    var r = n.useContext(p),
                        t = r
                    return (
                        e &&
                            (t =
                                "function" == typeof e ? e(r) : i(i({}, r), e)),
                        t
                    )
                },
                f = function (e) {
                    var r = l(e.components)
                    return n.createElement(p.Provider, { value: r }, e.children)
                },
                u = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var r = e.children
                        return n.createElement(n.Fragment, {}, r)
                    }
                },
                s = n.forwardRef(function (e, r) {
                    var t = e.components,
                        a = e.mdxType,
                        o = e.originalType,
                        p = e.parentName,
                        f = c(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        s = l(t),
                        y = a,
                        m = s["".concat(p, ".").concat(y)] || s[y] || u[y] || o
                    return t
                        ? n.createElement(
                              m,
                              i(i({ ref: r }, f), {}, { components: t })
                          )
                        : n.createElement(m, i({ ref: r }, f))
                })
            function y(e, r) {
                var t = arguments,
                    a = r && r.mdxType
                if ("string" == typeof e || a) {
                    var o = t.length,
                        i = new Array(o)
                    i[0] = s
                    var c = {}
                    for (var p in r) hasOwnProperty.call(r, p) && (c[p] = r[p])
                    ;(c.originalType = e),
                        (c.mdxType = "string" == typeof e ? e : a),
                        (i[1] = c)
                    for (var l = 2; l < o; l++) i[l] = t[l]
                    return n.createElement.apply(null, i)
                }
                return n.createElement.apply(null, t)
            }
            s.displayName = "MDXCreateElement"
        },
        25: (e, r, t) => {
            t.r(r),
                t.d(r, {
                    assets: () => f,
                    contentTitle: () => p,
                    default: () => y,
                    frontMatter: () => c,
                    metadata: () => l,
                    toc: () => u
                })
            var n = t(4250),
                a = t(7075),
                o = (t(9496), t(9613)),
                i = ["components"],
                c = { hide_table_of_contents: !0 },
                p = "arrayOf",
                l = {
                    unversionedId: "api/arrayof",
                    id: "version-1.0.9-alpha/api/arrayof",
                    title: "arrayOf",
                    description: "text",
                    source: "@site/versioned_docs/version-1.0.9-alpha/api/arrayof.md",
                    sourceDirName: "api",
                    slug: "/api/arrayof",
                    permalink: "/docs/api/arrayof",
                    draft: !1,
                    tags: [],
                    version: "1.0.9-alpha",
                    frontMatter: { hide_table_of_contents: !0 }
                },
                f = {},
                u = [{ value: "text", id: "text", level: 2 }],
                s = { toc: u }
            function y(e) {
                var r = e.components,
                    t = (0, a.Z)(e, i)
                return (0, o.kt)(
                    "wrapper",
                    (0, n.Z)({}, s, t, { components: r, mdxType: "MDXLayout" }),
                    (0, o.kt)("h1", { id: "arrayof" }, "arrayOf"),
                    (0, o.kt)("h2", { id: "text" }, "text"),
                    (0, o.kt)(
                        "pre",
                        null,
                        (0, o.kt)(
                            "code",
                            { parentName: "pre", className: "language-ts" },
                            'arrayOf: Ark["arrayOf"]\n'
                        )
                    )
                )
            }
            y.isMDXComponent = !0
        }
    }
])
