"use strict"
;(self.webpackChunkredo_dev = self.webpackChunkredo_dev || []).push([
    [118],
    {
        7965: (e, t, r) => {
            r.d(t, { Zo: () => p, kt: () => f })
            var n = r(3889)
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
            var s = n.createContext({}),
                l = function (e) {
                    var t = n.useContext(s),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : i(i({}, t), e)),
                        r
                    )
                },
                p = function (e) {
                    var t = l(e.components)
                    return n.createElement(s.Provider, { value: t }, e.children)
                },
                u = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return n.createElement(n.Fragment, {}, t)
                    }
                },
                d = n.forwardRef(function (e, t) {
                    var r = e.components,
                        o = e.mdxType,
                        a = e.originalType,
                        s = e.parentName,
                        p = c(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        d = l(r),
                        f = o,
                        y = d["".concat(s, ".").concat(f)] || d[f] || u[f] || a
                    return r
                        ? n.createElement(
                              y,
                              i(i({ ref: t }, p), {}, { components: r })
                          )
                        : n.createElement(y, i({ ref: t }, p))
                })
            function f(e, t) {
                var r = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var a = r.length,
                        i = new Array(a)
                    i[0] = d
                    var c = {}
                    for (var s in t) hasOwnProperty.call(t, s) && (c[s] = t[s])
                    ;(c.originalType = e),
                        (c.mdxType = "string" == typeof e ? e : o),
                        (i[1] = c)
                    for (var l = 2; l < a; l++) i[l] = r[l]
                    return n.createElement.apply(null, i)
                }
                return n.createElement.apply(null, r)
            }
            d.displayName = "MDXCreateElement"
        },
        5432: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => m,
                    contentTitle: () => f,
                    default: () => v,
                    frontMatter: () => d,
                    metadata: () => y,
                    toc: () => b
                })
            var n = r(7965),
                o = Object.defineProperty,
                a = Object.defineProperties,
                i = Object.getOwnPropertyDescriptors,
                c = Object.getOwnPropertySymbols,
                s = Object.prototype.hasOwnProperty,
                l = Object.prototype.propertyIsEnumerable,
                p = (e, t, r) =>
                    t in e
                        ? o(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                u = (e, t) => {
                    for (var r in t || (t = {})) s.call(t, r) && p(e, r, t[r])
                    if (c) for (var r of c(t)) l.call(t, r) && p(e, r, t[r])
                    return e
                }
            const d = { sidebar_position: 6, hide_table_of_contents: !0 },
                f = "API",
                y = {
                    unversionedId: "api",
                    id: "version-1.11.0/api",
                    title: "API",
                    description:
                        "Detailed API docs are coming soon! For now, check out the examples from this README and use the type hints you get to learn how you can customize your models and spaces. If you have any questions, don't hesitate to reach out on the dedicated Discord channel!",
                    source: "@site/model_versioned_docs/version-1.11.0/api.mdx",
                    sourceDirName: ".",
                    slug: "/api",
                    permalink: "/model/api",
                    draft: !1,
                    tags: [],
                    version: "1.11.0",
                    sidebarPosition: 6,
                    frontMatter: {
                        sidebar_position: 6,
                        hide_table_of_contents: !0
                    },
                    sidebar: "defaultSidebar",
                    previous: { title: "Syntax", permalink: "/model/syntax" }
                },
                m = {},
                b = [],
                h = { toc: b }
            function v(e) {
                var t,
                    r = e,
                    { components: o } = r,
                    p = ((e, t) => {
                        var r = {}
                        for (var n in e)
                            s.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n])
                        if (null != e && c)
                            for (var n of c(e))
                                t.indexOf(n) < 0 &&
                                    l.call(e, n) &&
                                    (r[n] = e[n])
                        return r
                    })(r, ["components"])
                return (0, n.kt)(
                    "wrapper",
                    ((t = u(u({}, h), p)),
                    a(t, i({ components: o, mdxType: "MDXLayout" }))),
                    (0, n.kt)("h1", u({}, { id: "api" }), "API"),
                    (0, n.kt)(
                        "p",
                        null,
                        "Detailed API docs are coming soon! For now, check out the examples from this README and use the type hints you get to learn how you can customize your models and spaces. If you have any questions, don't hesitate to reach out on the ",
                        (0, n.kt)(
                            "a",
                            u(
                                { parentName: "p" },
                                { href: "https://discord.gg/WSNF3Kc4xh" }
                            ),
                            "dedicated Discord channel"
                        ),
                        "!"
                    )
                )
            }
            v.isMDXComponent = !0
        }
    }
])
