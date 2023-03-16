"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [5534],
    {
        9613: (e, t, r) => {
            r.d(t, { Zo: () => u, kt: () => v })
            var n = r(9496)
            function a(e, t, r) {
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
            function o(e, t) {
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
                        ? o(Object(r), !0).forEach(function (t) {
                              a(e, t, r[t])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(r)
                          )
                        : o(Object(r)).forEach(function (t) {
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
                    a = (function (e, t) {
                        if (null == e) return {}
                        var r,
                            n,
                            a = {},
                            o = Object.keys(e)
                        for (n = 0; n < o.length; n++)
                            (r = o[n]), t.indexOf(r) >= 0 || (a[r] = e[r])
                        return a
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var o = Object.getOwnPropertySymbols(e)
                    for (n = 0; n < o.length; n++)
                        (r = o[n]),
                            t.indexOf(r) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    r
                                ) &&
                                    (a[r] = e[r]))
                }
                return a
            }
            var c = n.createContext({}),
                p = function (e) {
                    var t = n.useContext(c),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : i(i({}, t), e)),
                        r
                    )
                },
                u = function (e) {
                    var t = p(e.components)
                    return n.createElement(c.Provider, { value: t }, e.children)
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
                        a = e.mdxType,
                        o = e.originalType,
                        c = e.parentName,
                        u = l(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        s = p(r),
                        v = a,
                        y = s["".concat(c, ".").concat(v)] || s[v] || f[v] || o
                    return r
                        ? n.createElement(
                              y,
                              i(i({ ref: t }, u), {}, { components: r })
                          )
                        : n.createElement(y, i({ ref: t }, u))
                })
            function v(e, t) {
                var r = arguments,
                    a = t && t.mdxType
                if ("string" == typeof e || a) {
                    var o = r.length,
                        i = new Array(o)
                    i[0] = s
                    var l = {}
                    for (var c in t) hasOwnProperty.call(t, c) && (l[c] = t[c])
                    ;(l.originalType = e),
                        (l.mdxType = "string" == typeof e ? e : a),
                        (i[1] = l)
                    for (var p = 2; p < o; p++) i[p] = r[p]
                    return n.createElement.apply(null, i)
                }
                return n.createElement.apply(null, r)
            }
            s.displayName = "MDXCreateElement"
        },
        1795: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => u,
                    contentTitle: () => c,
                    default: () => v,
                    frontMatter: () => l,
                    metadata: () => p,
                    toc: () => f
                })
            var n = r(4250),
                a = r(7075),
                o = (r(9496), r(9613)),
                i = ["components"],
                l = { hide_table_of_contents: !0 },
                c = "valueOf",
                p = {
                    unversionedId: "api/valueof",
                    id: "version-1.0.9-alpha/api/valueof",
                    title: "valueOf",
                    description: "text",
                    source: "@site/versioned_docs/version-1.0.9-alpha/api/valueof.md",
                    sourceDirName: "api",
                    slug: "/api/valueof",
                    permalink: "/docs/api/valueof",
                    draft: !1,
                    tags: [],
                    version: "1.0.9-alpha",
                    frontMatter: { hide_table_of_contents: !0 }
                },
                u = {},
                f = [{ value: "text", id: "text", level: 2 }],
                s = { toc: f }
            function v(e) {
                var t = e.components,
                    r = (0, a.Z)(e, i)
                return (0, o.kt)(
                    "wrapper",
                    (0, n.Z)({}, s, r, { components: t, mdxType: "MDXLayout" }),
                    (0, o.kt)("h1", { id: "valueof" }, "valueOf"),
                    (0, o.kt)("h2", { id: "text" }, "text"),
                    (0, o.kt)(
                        "pre",
                        null,
                        (0, o.kt)(
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
