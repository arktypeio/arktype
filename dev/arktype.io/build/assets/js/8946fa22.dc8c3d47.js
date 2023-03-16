"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [4],
    {
        9613: (e, t, r) => {
            r.d(t, { Zo: () => u, kt: () => y })
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
            function p(e) {
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
            var c = n.createContext({}),
                l = function (e) {
                    var t = n.useContext(c),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : p(p({}, t), e)),
                        r
                    )
                },
                u = function (e) {
                    var t = l(e.components)
                    return n.createElement(c.Provider, { value: t }, e.children)
                },
                s = {
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
                        c = e.parentName,
                        u = i(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        f = l(r),
                        y = o,
                        d = f["".concat(c, ".").concat(y)] || f[y] || s[y] || a
                    return r
                        ? n.createElement(
                              d,
                              p(p({ ref: t }, u), {}, { components: r })
                          )
                        : n.createElement(d, p({ ref: t }, u))
                })
            function y(e, t) {
                var r = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var a = r.length,
                        p = new Array(a)
                    p[0] = f
                    var i = {}
                    for (var c in t) hasOwnProperty.call(t, c) && (i[c] = t[c])
                    ;(i.originalType = e),
                        (i.mdxType = "string" == typeof e ? e : o),
                        (p[1] = i)
                    for (var l = 2; l < a; l++) p[l] = r[l]
                    return n.createElement.apply(null, p)
                }
                return n.createElement.apply(null, r)
            }
            f.displayName = "MDXCreateElement"
        },
        5251: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => u,
                    contentTitle: () => c,
                    default: () => y,
                    frontMatter: () => i,
                    metadata: () => l,
                    toc: () => s
                })
            var n = r(4250),
                o = r(7075),
                a = (r(9496), r(9613)),
                p = ["components"],
                i = { hide_table_of_contents: !0 },
                c = "type",
                l = {
                    unversionedId: "api/type",
                    id: "version-1.0.9-alpha/api/type",
                    title: "type",
                    description: "text",
                    source: "@site/versioned_docs/version-1.0.9-alpha/api/type.md",
                    sourceDirName: "api",
                    slug: "/api/type",
                    permalink: "/docs/api/type",
                    draft: !1,
                    tags: [],
                    version: "1.0.9-alpha",
                    frontMatter: { hide_table_of_contents: !0 }
                },
                u = {},
                s = [
                    { value: "text", id: "text", level: 2 },
                    {
                        value: "hide_table_of_contents: true",
                        id: "hide_table_of_contents-true",
                        level: 2
                    },
                    { value: "text", id: "text-1", level: 2 }
                ],
                f = { toc: s }
            function y(e) {
                var t = e.components,
                    r = (0, o.Z)(e, p)
                return (0, a.kt)(
                    "wrapper",
                    (0, n.Z)({}, f, r, { components: t, mdxType: "MDXLayout" }),
                    (0, a.kt)("h1", { id: "type" }, "type"),
                    (0, a.kt)("h2", { id: "text" }, "text"),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            { parentName: "pre", className: "language-ts" },
                            "type: TypeParser<PrecompiledDefaults>\n"
                        )
                    ),
                    (0, a.kt)("hr", null),
                    (0, a.kt)(
                        "h2",
                        { id: "hide_table_of_contents-true" },
                        "hide_table_of_contents: true"
                    ),
                    (0, a.kt)("h1", { id: "type-1" }, "Type"),
                    (0, a.kt)("h2", { id: "text-1" }, "text"),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            { parentName: "pre", className: "language-ts" },
                            "export type Type<t = unknown> = defer<Checker<t> & TypeRoot<t>>\n"
                        )
                    )
                )
            }
            y.isMDXComponent = !0
        }
    }
])
