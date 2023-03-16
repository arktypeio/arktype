"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [6900],
    {
        9613: (e, t, r) => {
            r.d(t, { Zo: () => s, kt: () => d })
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
                m = n.forwardRef(function (e, t) {
                    var r = e.components,
                        o = e.mdxType,
                        a = e.originalType,
                        p = e.parentName,
                        s = i(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        m = l(r),
                        d = o,
                        f = m["".concat(p, ".").concat(d)] || m[d] || u[d] || a
                    return r
                        ? n.createElement(
                              f,
                              c(c({ ref: t }, s), {}, { components: r })
                          )
                        : n.createElement(f, c({ ref: t }, s))
                })
            function d(e, t) {
                var r = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var a = r.length,
                        c = new Array(a)
                    c[0] = m
                    var i = {}
                    for (var p in t) hasOwnProperty.call(t, p) && (i[p] = t[p])
                    ;(i.originalType = e),
                        (i.mdxType = "string" == typeof e ? e : o),
                        (c[1] = i)
                    for (var l = 2; l < a; l++) c[l] = r[l]
                    return n.createElement.apply(null, c)
                }
                return n.createElement.apply(null, r)
            }
            m.displayName = "MDXCreateElement"
        },
        9669: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => s,
                    contentTitle: () => p,
                    default: () => d,
                    frontMatter: () => i,
                    metadata: () => l,
                    toc: () => u
                })
            var n = r(4250),
                o = r(7075),
                a = (r(9496), r(9613)),
                c = ["components"],
                i = { hide_table_of_contents: !0 },
                p = "Problem",
                l = {
                    unversionedId: "api/problem",
                    id: "api/problem",
                    title: "Problem",
                    description: "text",
                    source: "@site/docs/api/problem.md",
                    sourceDirName: "api",
                    slug: "/api/problem",
                    permalink: "/docs/next/api/problem",
                    draft: !1,
                    tags: [],
                    version: "current",
                    frontMatter: { hide_table_of_contents: !0 }
                },
                s = {},
                u = [{ value: "text", id: "text", level: 2 }],
                m = { toc: u }
            function d(e) {
                var t = e.components,
                    r = (0, o.Z)(e, c)
                return (0, a.kt)(
                    "wrapper",
                    (0, n.Z)({}, m, r, { components: t, mdxType: "MDXLayout" }),
                    (0, a.kt)("h1", { id: "problem" }, "Problem"),
                    (0, a.kt)("h2", { id: "text" }, "text"),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            { parentName: "pre", className: "language-ts" },
                            "export declare class Problem<code extends ProblemCode = ProblemCode> {\n    code: code\n    path: Path\n    private data\n    private source\n    private writers\n    parts?: Problem[]\n    constructor(\n        code: code,\n        path: Path,\n        data: ProblemData<code>,\n        source: ProblemSource<code>,\n        writers: ProblemWriters<code>\n    )\n    toString(): string\n    get message(): string\n    get reason(): string\n    get mustBe(): string\n}\n"
                        )
                    )
                )
            }
            d.isMDXComponent = !0
        }
    }
])
