"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [9443],
    {
        9613: (e, t, r) => {
            r.d(t, { Zo: () => u, kt: () => m })
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
            function c(e) {
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
            function i(e, t) {
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
            var p = n.createContext({}),
                l = function (e) {
                    var t = n.useContext(p),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : c(c({}, t), e)),
                        r
                    )
                },
                u = function (e) {
                    var t = l(e.components)
                    return n.createElement(p.Provider, { value: t }, e.children)
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
                        a = e.mdxType,
                        o = e.originalType,
                        p = e.parentName,
                        u = i(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        f = l(r),
                        m = a,
                        y = f["".concat(p, ".").concat(m)] || f[m] || s[m] || o
                    return r
                        ? n.createElement(
                              y,
                              c(c({ ref: t }, u), {}, { components: r })
                          )
                        : n.createElement(y, c({ ref: t }, u))
                })
            function m(e, t) {
                var r = arguments,
                    a = t && t.mdxType
                if ("string" == typeof e || a) {
                    var o = r.length,
                        c = new Array(o)
                    c[0] = f
                    var i = {}
                    for (var p in t) hasOwnProperty.call(t, p) && (i[p] = t[p])
                    ;(i.originalType = e),
                        (i.mdxType = "string" == typeof e ? e : a),
                        (c[1] = i)
                    for (var l = 2; l < o; l++) c[l] = r[l]
                    return n.createElement.apply(null, c)
                }
                return n.createElement.apply(null, r)
            }
            f.displayName = "MDXCreateElement"
        },
        6361: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => u,
                    contentTitle: () => p,
                    default: () => m,
                    frontMatter: () => i,
                    metadata: () => l,
                    toc: () => s
                })
            var n = r(4250),
                a = r(7075),
                o = (r(9496), r(9613)),
                c = ["components"],
                i = { hide_table_of_contents: !0 },
                p = "ark",
                l = {
                    unversionedId: "api/ark",
                    id: "version-1.0.9-alpha/api/ark",
                    title: "ark",
                    description: "text",
                    source: "@site/versioned_docs/version-1.0.9-alpha/api/ark.md",
                    sourceDirName: "api",
                    slug: "/api/ark",
                    permalink: "/docs/api/ark",
                    draft: !1,
                    tags: [],
                    version: "1.0.9-alpha",
                    frontMatter: { hide_table_of_contents: !0 }
                },
                u = {},
                s = [{ value: "text", id: "text", level: 2 }],
                f = { toc: s }
            function m(e) {
                var t = e.components,
                    r = (0, a.Z)(e, c)
                return (0, o.kt)(
                    "wrapper",
                    (0, n.Z)({}, f, r, { components: t, mdxType: "MDXLayout" }),
                    (0, o.kt)("h1", { id: "ark" }, "ark"),
                    (0, o.kt)("h2", { id: "text" }, "text"),
                    (0, o.kt)(
                        "pre",
                        null,
                        (0, o.kt)(
                            "code",
                            { parentName: "pre", className: "language-ts" },
                            "ark: Space<PrecompiledDefaults>\n"
                        )
                    )
                )
            }
            m.isMDXComponent = !0
        }
    }
])
