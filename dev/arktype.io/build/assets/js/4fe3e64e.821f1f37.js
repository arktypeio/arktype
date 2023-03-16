"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [1012],
    {
        9613: (e, n, r) => {
            r.d(n, { Zo: () => u, kt: () => m })
            var t = r(9496)
            function o(e, n, r) {
                return (
                    n in e
                        ? Object.defineProperty(e, n, {
                              value: r,
                              enumerable: !0,
                              configurable: !0,
                              writable: !0
                          })
                        : (e[n] = r),
                    e
                )
            }
            function a(e, n) {
                var r = Object.keys(e)
                if (Object.getOwnPropertySymbols) {
                    var t = Object.getOwnPropertySymbols(e)
                    n &&
                        (t = t.filter(function (n) {
                            return Object.getOwnPropertyDescriptor(
                                e,
                                n
                            ).enumerable
                        })),
                        r.push.apply(r, t)
                }
                return r
            }
            function i(e) {
                for (var n = 1; n < arguments.length; n++) {
                    var r = null != arguments[n] ? arguments[n] : {}
                    n % 2
                        ? a(Object(r), !0).forEach(function (n) {
                              o(e, n, r[n])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(r)
                          )
                        : a(Object(r)).forEach(function (n) {
                              Object.defineProperty(
                                  e,
                                  n,
                                  Object.getOwnPropertyDescriptor(r, n)
                              )
                          })
                }
                return e
            }
            function c(e, n) {
                if (null == e) return {}
                var r,
                    t,
                    o = (function (e, n) {
                        if (null == e) return {}
                        var r,
                            t,
                            o = {},
                            a = Object.keys(e)
                        for (t = 0; t < a.length; t++)
                            (r = a[t]), n.indexOf(r) >= 0 || (o[r] = e[r])
                        return o
                    })(e, n)
                if (Object.getOwnPropertySymbols) {
                    var a = Object.getOwnPropertySymbols(e)
                    for (t = 0; t < a.length; t++)
                        (r = a[t]),
                            n.indexOf(r) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    r
                                ) &&
                                    (o[r] = e[r]))
                }
                return o
            }
            var p = t.createContext({}),
                s = function (e) {
                    var n = t.useContext(p),
                        r = n
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(n) : i(i({}, n), e)),
                        r
                    )
                },
                u = function (e) {
                    var n = s(e.components)
                    return t.createElement(p.Provider, { value: n }, e.children)
                },
                l = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var n = e.children
                        return t.createElement(t.Fragment, {}, n)
                    }
                },
                f = t.forwardRef(function (e, n) {
                    var r = e.components,
                        o = e.mdxType,
                        a = e.originalType,
                        p = e.parentName,
                        u = c(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        f = s(r),
                        m = o,
                        d = f["".concat(p, ".").concat(m)] || f[m] || l[m] || a
                    return r
                        ? t.createElement(
                              d,
                              i(i({ ref: n }, u), {}, { components: r })
                          )
                        : t.createElement(d, i({ ref: n }, u))
                })
            function m(e, n) {
                var r = arguments,
                    o = n && n.mdxType
                if ("string" == typeof e || o) {
                    var a = r.length,
                        i = new Array(a)
                    i[0] = f
                    var c = {}
                    for (var p in n) hasOwnProperty.call(n, p) && (c[p] = n[p])
                    ;(c.originalType = e),
                        (c.mdxType = "string" == typeof e ? e : o),
                        (i[1] = c)
                    for (var s = 2; s < a; s++) i[s] = r[s]
                    return t.createElement.apply(null, i)
                }
                return t.createElement.apply(null, r)
            }
            f.displayName = "MDXCreateElement"
        },
        664: (e, n, r) => {
            r.r(n),
                r.d(n, {
                    assets: () => u,
                    contentTitle: () => p,
                    default: () => m,
                    frontMatter: () => c,
                    metadata: () => s,
                    toc: () => l
                })
            var t = r(4250),
                o = r(7075),
                a = (r(9496), r(9613)),
                i = ["components"],
                c = { hide_table_of_contents: !0 },
                p = "arkScope",
                s = {
                    unversionedId: "api/arkscope",
                    id: "version-1.0.9-alpha/api/arkscope",
                    title: "arkScope",
                    description: "text",
                    source: "@site/versioned_docs/version-1.0.9-alpha/api/arkscope.md",
                    sourceDirName: "api",
                    slug: "/api/arkscope",
                    permalink: "/docs/api/arkscope",
                    draft: !1,
                    tags: [],
                    version: "1.0.9-alpha",
                    frontMatter: { hide_table_of_contents: !0 }
                },
                u = {},
                l = [{ value: "text", id: "text", level: 2 }],
                f = { toc: l }
            function m(e) {
                var n = e.components,
                    r = (0, o.Z)(e, i)
                return (0, a.kt)(
                    "wrapper",
                    (0, t.Z)({}, f, r, { components: n, mdxType: "MDXLayout" }),
                    (0, a.kt)("h1", { id: "arkscope" }, "arkScope"),
                    (0, a.kt)("h2", { id: "text" }, "text"),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            { parentName: "pre", className: "language-ts" },
                            'arkScope: import("./scope.js").Scope<\n    [\n        {\n            any: any\n            bigint: bigint\n            boolean: boolean\n            false: false\n            never: never\n            null: null\n            number: number\n            object: object\n            string: string\n            symbol: symbol\n            true: true\n            unknown: unknown\n            void: void\n            undefined: undefined\n            Function: (...args: any[]) => unknown\n            Array: unknown[]\n            Date: Date\n            Error: Error\n            Map: Map<unknown, unknown>\n            RegExp: RegExp\n            Set: Set<unknown>\n            Object: Record<string, unknown>\n            String: String\n            Number: Number\n            Boolean: Boolean\n            WeakMap: WeakMap<object, unknown>\n            WeakSet: WeakSet<object>\n            Promise: Promise<unknown>\n            alpha: string\n            alphanumeric: string\n            lowercase: string\n            uppercase: string\n            creditCard: string\n            email: string\n            uuid: string\n            parsedNumber: (In: string) => number\n            parsedInteger: (In: string) => number\n            parsedDate: (In: string) => Date\n            semver: string\n            json: (In: string) => unknown\n            integer: number\n        },\n        {},\n        false\n    ]\n>\n'
                        )
                    )
                )
            }
            m.isMDXComponent = !0
        }
    }
])
