"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [7949],
    {
        9613: (e, t, r) => {
            r.d(t, { Zo: () => s, kt: () => y })
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
            function p(e) {
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
            function c(e, t) {
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
            var i = n.createContext({}),
                l = function (e) {
                    var t = n.useContext(i),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : p(p({}, t), e)),
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
                        a = e.mdxType,
                        o = e.originalType,
                        i = e.parentName,
                        s = c(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        f = l(r),
                        y = a,
                        m = f["".concat(i, ".").concat(y)] || f[y] || u[y] || o
                    return r
                        ? n.createElement(
                              m,
                              p(p({ ref: t }, s), {}, { components: r })
                          )
                        : n.createElement(m, p({ ref: t }, s))
                })
            function y(e, t) {
                var r = arguments,
                    a = t && t.mdxType
                if ("string" == typeof e || a) {
                    var o = r.length,
                        p = new Array(o)
                    p[0] = f
                    var c = {}
                    for (var i in t) hasOwnProperty.call(t, i) && (c[i] = t[i])
                    ;(c.originalType = e),
                        (c.mdxType = "string" == typeof e ? e : a),
                        (p[1] = c)
                    for (var l = 2; l < o; l++) p[l] = r[l]
                    return n.createElement.apply(null, p)
                }
                return n.createElement.apply(null, r)
            }
            f.displayName = "MDXCreateElement"
        },
        10: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => s,
                    contentTitle: () => i,
                    default: () => y,
                    frontMatter: () => c,
                    metadata: () => l,
                    toc: () => u
                })
            var n = r(4250),
                a = r(7075),
                o = (r(9496), r(9613)),
                p = ["components"],
                c = { hide_table_of_contents: !0 },
                i = "Space",
                l = {
                    unversionedId: "api/space",
                    id: "version-1.0.9-alpha/api/space",
                    title: "Space",
                    description: "text",
                    source: "@site/versioned_docs/version-1.0.9-alpha/api/space.md",
                    sourceDirName: "api",
                    slug: "/api/space",
                    permalink: "/docs/api/space",
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
                    r = (0, a.Z)(e, p)
                return (0, o.kt)(
                    "wrapper",
                    (0, n.Z)({}, f, r, { components: t, mdxType: "MDXLayout" }),
                    (0, o.kt)("h1", { id: "space" }, "Space"),
                    (0, o.kt)("h2", { id: "text" }, "text"),
                    (0, o.kt)(
                        "pre",
                        null,
                        (0, o.kt)(
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
