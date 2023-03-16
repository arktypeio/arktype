"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [4788],
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
            function i(e, t) {
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
            function a(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var r = null != arguments[t] ? arguments[t] : {}
                    t % 2
                        ? i(Object(r), !0).forEach(function (t) {
                              o(e, t, r[t])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(r)
                          )
                        : i(Object(r)).forEach(function (t) {
                              Object.defineProperty(
                                  e,
                                  t,
                                  Object.getOwnPropertyDescriptor(r, t)
                              )
                          })
                }
                return e
            }
            function c(e, t) {
                if (null == e) return {}
                var r,
                    n,
                    o = (function (e, t) {
                        if (null == e) return {}
                        var r,
                            n,
                            o = {},
                            i = Object.keys(e)
                        for (n = 0; n < i.length; n++)
                            (r = i[n]), t.indexOf(r) >= 0 || (o[r] = e[r])
                        return o
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var i = Object.getOwnPropertySymbols(e)
                    for (n = 0; n < i.length; n++)
                        (r = i[n]),
                            t.indexOf(r) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    r
                                ) &&
                                    (o[r] = e[r]))
                }
                return o
            }
            var p = n.createContext({}),
                l = function (e) {
                    var t = n.useContext(p),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : a(a({}, t), e)),
                        r
                    )
                },
                s = function (e) {
                    var t = l(e.components)
                    return n.createElement(p.Provider, { value: t }, e.children)
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
                        i = e.originalType,
                        p = e.parentName,
                        s = c(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        f = l(r),
                        y = o,
                        m = f["".concat(p, ".").concat(y)] || f[y] || u[y] || i
                    return r
                        ? n.createElement(
                              m,
                              a(a({ ref: t }, s), {}, { components: r })
                          )
                        : n.createElement(m, a({ ref: t }, s))
                })
            function y(e, t) {
                var r = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var i = r.length,
                        a = new Array(i)
                    a[0] = f
                    var c = {}
                    for (var p in t) hasOwnProperty.call(t, p) && (c[p] = t[p])
                    ;(c.originalType = e),
                        (c.mdxType = "string" == typeof e ? e : o),
                        (a[1] = c)
                    for (var l = 2; l < i; l++) a[l] = r[l]
                    return n.createElement.apply(null, a)
                }
                return n.createElement.apply(null, r)
            }
            f.displayName = "MDXCreateElement"
        },
        9183: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => s,
                    contentTitle: () => p,
                    default: () => y,
                    frontMatter: () => c,
                    metadata: () => l,
                    toc: () => u
                })
            var n = r(4250),
                o = r(7075),
                i = (r(9496), r(9613)),
                a = ["components"],
                c = { hide_table_of_contents: !0 },
                p = "intersection",
                l = {
                    unversionedId: "api/intersection",
                    id: "version-1.0.9-alpha/api/intersection",
                    title: "intersection",
                    description: "text",
                    source: "@site/versioned_docs/version-1.0.9-alpha/api/intersection.md",
                    sourceDirName: "api",
                    slug: "/api/intersection",
                    permalink: "/docs/api/intersection",
                    draft: !1,
                    tags: [],
                    version: "1.0.9-alpha",
                    frontMatter: { hide_table_of_contents: !0 }
                },
                s = {},
                u = [{ value: "text", id: "text", level: 2 }],
                f = { toc: u }
            function y(e) {
                var t = e.components,
                    r = (0, o.Z)(e, a)
                return (0, i.kt)(
                    "wrapper",
                    (0, n.Z)({}, f, r, { components: t, mdxType: "MDXLayout" }),
                    (0, i.kt)("h1", { id: "intersection" }, "intersection"),
                    (0, i.kt)("h2", { id: "text" }, "text"),
                    (0, i.kt)(
                        "pre",
                        null,
                        (0, i.kt)(
                            "code",
                            { parentName: "pre", className: "language-ts" },
                            'intersection: Ark["intersection"]\n'
                        )
                    )
                )
            }
            y.isMDXComponent = !0
        }
    }
])
