"use strict"
;(self.webpackChunkredo_dev = self.webpackChunkredo_dev || []).push([
    [662],
    {
        7965: (e, r, t) => {
            t.d(r, { Zo: () => u, kt: () => d })
            var n = t(3889)
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
            function c(e) {
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
            function l(e, r) {
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
            var i = n.createContext({}),
                p = function (e) {
                    var r = n.useContext(i),
                        t = r
                    return (
                        e &&
                            (t =
                                "function" == typeof e ? e(r) : c(c({}, r), e)),
                        t
                    )
                },
                u = function (e) {
                    var r = p(e.components)
                    return n.createElement(i.Provider, { value: r }, e.children)
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
                        a = e.mdxType,
                        o = e.originalType,
                        i = e.parentName,
                        u = l(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        f = p(t),
                        d = a,
                        m = f["".concat(i, ".").concat(d)] || f[d] || s[d] || o
                    return t
                        ? n.createElement(
                              m,
                              c(c({ ref: r }, u), {}, { components: t })
                          )
                        : n.createElement(m, c({ ref: r }, u))
                })
            function d(e, r) {
                var t = arguments,
                    a = r && r.mdxType
                if ("string" == typeof e || a) {
                    var o = t.length,
                        c = new Array(o)
                    c[0] = f
                    var l = {}
                    for (var i in r) hasOwnProperty.call(r, i) && (l[i] = r[i])
                    ;(l.originalType = e),
                        (l.mdxType = "string" == typeof e ? e : a),
                        (c[1] = l)
                    for (var p = 2; p < o; p++) c[p] = t[p]
                    return n.createElement.apply(null, c)
                }
                return n.createElement.apply(null, t)
            }
            f.displayName = "MDXCreateElement"
        },
        5383: (e, r, t) => {
            t.r(r),
                t.d(r, {
                    assets: () => y,
                    contentTitle: () => d,
                    default: () => O,
                    frontMatter: () => f,
                    metadata: () => m,
                    toc: () => b
                })
            var n = t(7965),
                a = Object.defineProperty,
                o = Object.defineProperties,
                c = Object.getOwnPropertyDescriptors,
                l = Object.getOwnPropertySymbols,
                i = Object.prototype.hasOwnProperty,
                p = Object.prototype.propertyIsEnumerable,
                u = (e, r, t) =>
                    r in e
                        ? a(e, r, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: t
                          })
                        : (e[r] = t),
                s = (e, r) => {
                    for (var t in r || (r = {})) i.call(r, t) && u(e, t, r[t])
                    if (l) for (var t of l(r)) p.call(r, t) && u(e, t, r[t])
                    return e
                }
            const f = {},
                d = "declare",
                m = {
                    unversionedId: "api/declare",
                    id: "api/declare",
                    title: "declare",
                    description: "tags",
                    source: "@site/docs/model/api/declare.md",
                    sourceDirName: "api",
                    slug: "/api/declare",
                    permalink: "/model/next/api/declare",
                    draft: !1,
                    tags: [],
                    version: "current",
                    frontMatter: {},
                    sidebar: "sidebar",
                    previous: {
                        title: "compile",
                        permalink: "/model/next/api/compile"
                    }
                },
                y = {},
                b = [
                    { value: "tags", id: "tags", level: 2 },
                    { value: "text", id: "text", level: 2 }
                ],
                v = { toc: b }
            function O(e) {
                var r,
                    t = e,
                    { components: a } = t,
                    u = ((e, r) => {
                        var t = {}
                        for (var n in e)
                            i.call(e, n) && r.indexOf(n) < 0 && (t[n] = e[n])
                        if (null != e && l)
                            for (var n of l(e))
                                r.indexOf(n) < 0 &&
                                    p.call(e, n) &&
                                    (t[n] = e[n])
                        return t
                    })(t, ["components"])
                return (0, n.kt)(
                    "wrapper",
                    ((r = s(s({}, v), u)),
                    o(r, c({ components: a, mdxType: "MDXLayout" }))),
                    (0, n.kt)("h1", s({}, { id: "declare" }), "declare"),
                    (0, n.kt)("h2", s({}, { id: "tags" }), "tags"),
                    (0, n.kt)(
                        "pre",
                        null,
                        (0, n.kt)(
                            "code",
                            s(
                                { parentName: "pre" },
                                { className: "language-ts" }
                            ),
                            ";[]\n"
                        )
                    ),
                    (0, n.kt)("h2", s({}, { id: "text" }), "text"),
                    (0, n.kt)(
                        "pre",
                        null,
                        (0, n.kt)(
                            "code",
                            s(
                                { parentName: "pre" },
                                { className: "language-ts" }
                            ),
                            "declare: DeclareFunction\n"
                        )
                    )
                )
            }
            O.isMDXComponent = !0
        }
    }
])
