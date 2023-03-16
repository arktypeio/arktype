"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [7600],
    {
        9613: (e, t, r) => {
            r.d(t, { Zo: () => u, kt: () => d })
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
            function i(e) {
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
            function p(e, t) {
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
                s = function (e) {
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
                    var t = s(e.components)
                    return n.createElement(c.Provider, { value: t }, e.children)
                },
                l = {
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
                        u = p(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        f = s(r),
                        d = o,
                        y = f["".concat(c, ".").concat(d)] || f[d] || l[d] || a
                    return r
                        ? n.createElement(
                              y,
                              i(i({ ref: t }, u), {}, { components: r })
                          )
                        : n.createElement(y, i({ ref: t }, u))
                })
            function d(e, t) {
                var r = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var a = r.length,
                        i = new Array(a)
                    i[0] = f
                    var p = {}
                    for (var c in t) hasOwnProperty.call(t, c) && (p[c] = t[c])
                    ;(p.originalType = e),
                        (p.mdxType = "string" == typeof e ? e : o),
                        (i[1] = p)
                    for (var s = 2; s < a; s++) i[s] = r[s]
                    return n.createElement.apply(null, i)
                }
                return n.createElement.apply(null, r)
            }
            f.displayName = "MDXCreateElement"
        },
        4453: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => u,
                    contentTitle: () => c,
                    default: () => d,
                    frontMatter: () => p,
                    metadata: () => s,
                    toc: () => l
                })
            var n = r(4250),
                o = r(7075),
                a = (r(9496), r(9613)),
                i = ["components"],
                p = { id: "api", hide_table_of_contents: !0, title: "API" },
                c = "API",
                s = {
                    unversionedId: "api",
                    id: "api",
                    title: "API",
                    description:
                        "replace(./dev/test,https://github.com/arktypeio/arktype/tree/main/dev/test) --\x3e",
                    source: "@site/docs/api.mdx",
                    sourceDirName: ".",
                    slug: "/api",
                    permalink: "/docs/next/api",
                    draft: !1,
                    tags: [],
                    version: "current",
                    frontMatter: {
                        id: "api",
                        hide_table_of_contents: !0,
                        title: "API"
                    },
                    sidebar: "sidebar",
                    previous: {
                        title: "validationScope",
                        permalink: "/docs/next/api/validationscope"
                    }
                },
                u = {},
                l = [],
                f = { toc: l }
            function d(e) {
                var t = e.components,
                    r = (0, o.Z)(e, i)
                return (0, a.kt)(
                    "wrapper",
                    (0, n.Z)({}, f, r, { components: t, mdxType: "MDXLayout" }),
                    (0, a.kt)("h1", { id: "api" }, "API"),
                    (0, a.kt)(
                        "p",
                        null,
                        "ArkType supports many of TypeScript's built-in types and operators, as well as some new ones dedicated exclusively to runtime validation. In fact, we got a little ahead of ourselves and built a ton of cool features, but we're still working on getting caught up syntax and API docs. Keep an eye out for more in the next couple weeks \u26f5"
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "In the meantime, check out the examples here and use the type hints you get to learn how you can customize your types and scopes. If you want to explore some of the more advanced features, take a look at ",
                        (0, a.kt)(
                            "a",
                            {
                                parentName: "p",
                                href: "https://github.com/arktypeio/arktype/tree/main/dev/test"
                            },
                            "our unit tests"
                        ),
                        " or ask us ",
                        (0, a.kt)(
                            "a",
                            {
                                parentName: "p",
                                href: "https://discord.gg/WSNF3Kc4xh"
                            },
                            "on Discord"
                        ),
                        " if your functionality is supported. If not, ",
                        (0, a.kt)(
                            "a",
                            {
                                parentName: "p",
                                href: "https://github.com/arktypeio/arktype/issues/new"
                            },
                            "create a GitHub issue"
                        ),
                        " so we can prioritize it!"
                    )
                )
            }
            d.isMDXComponent = !0
        }
    }
])
