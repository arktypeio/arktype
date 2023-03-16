"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [7760],
    {
        9613: (e, t, r) => {
            r.d(t, { Zo: () => s, kt: () => f })
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
            function l(e) {
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
            function c(e, t) {
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
            var p = n.createContext({}),
                i = function (e) {
                    var t = n.useContext(p),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : l(l({}, t), e)),
                        r
                    )
                },
                s = function (e) {
                    var t = i(e.components)
                    return n.createElement(p.Provider, { value: t }, e.children)
                },
                u = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return n.createElement(n.Fragment, {}, t)
                    }
                },
                m = n.forwardRef(function (e, t) {
                    var r = e.components,
                        o = e.mdxType,
                        a = e.originalType,
                        p = e.parentName,
                        s = c(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        m = i(r),
                        f = o,
                        b = m["".concat(p, ".").concat(f)] || m[f] || u[f] || a
                    return r
                        ? n.createElement(
                              b,
                              l(l({ ref: t }, s), {}, { components: r })
                          )
                        : n.createElement(b, l({ ref: t }, s))
                })
            function f(e, t) {
                var r = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var a = r.length,
                        l = new Array(a)
                    l[0] = m
                    var c = {}
                    for (var p in t) hasOwnProperty.call(t, p) && (c[p] = t[p])
                    ;(c.originalType = e),
                        (c.mdxType = "string" == typeof e ? e : o),
                        (l[1] = c)
                    for (var i = 2; i < a; i++) l[i] = r[i]
                    return n.createElement.apply(null, l)
                }
                return n.createElement.apply(null, r)
            }
            m.displayName = "MDXCreateElement"
        },
        9470: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => s,
                    contentTitle: () => p,
                    default: () => f,
                    frontMatter: () => c,
                    metadata: () => i,
                    toc: () => u
                })
            var n = r(4250),
                o = r(7075),
                a = (r(9496), r(9613)),
                l = ["components"],
                c = { hide_table_of_contents: !0 },
                p = "Problems",
                i = {
                    unversionedId: "api/problems",
                    id: "api/problems",
                    title: "Problems",
                    description: "text",
                    source: "@site/docs/api/problems.md",
                    sourceDirName: "api",
                    slug: "/api/problems",
                    permalink: "/docs/next/api/problems",
                    draft: !1,
                    tags: [],
                    version: "current",
                    frontMatter: { hide_table_of_contents: !0 }
                },
                s = {},
                u = [{ value: "text", id: "text", level: 2 }],
                m = { toc: u }
            function f(e) {
                var t = e.components,
                    r = (0, o.Z)(e, l)
                return (0, a.kt)(
                    "wrapper",
                    (0, n.Z)({}, m, r, { components: t, mdxType: "MDXLayout" }),
                    (0, a.kt)("h1", { id: "problems" }, "Problems"),
                    (0, a.kt)("h2", { id: "text" }, "text"),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            { parentName: "pre", className: "language-ts" },
                            "Problems: new (state: TraversalState) => Problems\nexport type Problems = arraySubclassToReadonly<ProblemArray>;\n"
                        )
                    )
                )
            }
            f.isMDXComponent = !0
        }
    }
])
