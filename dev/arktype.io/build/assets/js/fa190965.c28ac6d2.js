"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [7957],
    {
        9613: (t, e, n) => {
            n.d(e, { Zo: () => m, kt: () => c })
            var a = n(9496)
            function r(t, e, n) {
                return (
                    e in t
                        ? Object.defineProperty(t, e, {
                              value: n,
                              enumerable: !0,
                              configurable: !0,
                              writable: !0
                          })
                        : (t[e] = n),
                    t
                )
            }
            function l(t, e) {
                var n = Object.keys(t)
                if (Object.getOwnPropertySymbols) {
                    var a = Object.getOwnPropertySymbols(t)
                    e &&
                        (a = a.filter(function (e) {
                            return Object.getOwnPropertyDescriptor(
                                t,
                                e
                            ).enumerable
                        })),
                        n.push.apply(n, a)
                }
                return n
            }
            function i(t) {
                for (var e = 1; e < arguments.length; e++) {
                    var n = null != arguments[e] ? arguments[e] : {}
                    e % 2
                        ? l(Object(n), !0).forEach(function (e) {
                              r(t, e, n[e])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              t,
                              Object.getOwnPropertyDescriptors(n)
                          )
                        : l(Object(n)).forEach(function (e) {
                              Object.defineProperty(
                                  t,
                                  e,
                                  Object.getOwnPropertyDescriptor(n, e)
                              )
                          })
                }
                return t
            }
            function o(t, e) {
                if (null == t) return {}
                var n,
                    a,
                    r = (function (t, e) {
                        if (null == t) return {}
                        var n,
                            a,
                            r = {},
                            l = Object.keys(t)
                        for (a = 0; a < l.length; a++)
                            (n = l[a]), e.indexOf(n) >= 0 || (r[n] = t[n])
                        return r
                    })(t, e)
                if (Object.getOwnPropertySymbols) {
                    var l = Object.getOwnPropertySymbols(t)
                    for (a = 0; a < l.length; a++)
                        (n = l[a]),
                            e.indexOf(n) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    t,
                                    n
                                ) &&
                                    (r[n] = t[n]))
                }
                return r
            }
            var p = a.createContext({}),
                d = function (t) {
                    var e = a.useContext(p),
                        n = e
                    return (
                        t &&
                            (n =
                                "function" == typeof t ? t(e) : i(i({}, e), t)),
                        n
                    )
                },
                m = function (t) {
                    var e = d(t.components)
                    return a.createElement(p.Provider, { value: e }, t.children)
                },
                u = {
                    inlineCode: "code",
                    wrapper: function (t) {
                        var e = t.children
                        return a.createElement(a.Fragment, {}, e)
                    }
                },
                k = a.forwardRef(function (t, e) {
                    var n = t.components,
                        r = t.mdxType,
                        l = t.originalType,
                        p = t.parentName,
                        m = o(t, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        k = d(n),
                        c = r,
                        s = k["".concat(p, ".").concat(c)] || k[c] || u[c] || l
                    return n
                        ? a.createElement(
                              s,
                              i(i({ ref: e }, m), {}, { components: n })
                          )
                        : a.createElement(s, i({ ref: e }, m))
                })
            function c(t, e) {
                var n = arguments,
                    r = e && e.mdxType
                if ("string" == typeof t || r) {
                    var l = n.length,
                        i = new Array(l)
                    i[0] = k
                    var o = {}
                    for (var p in e) hasOwnProperty.call(e, p) && (o[p] = e[p])
                    ;(o.originalType = t),
                        (o.mdxType = "string" == typeof t ? t : r),
                        (i[1] = o)
                    for (var d = 2; d < l; d++) i[d] = n[d]
                    return a.createElement.apply(null, i)
                }
                return a.createElement.apply(null, n)
            }
            k.displayName = "MDXCreateElement"
        },
        2594: (t, e, n) => {
            n.r(e),
                n.d(e, {
                    assets: () => m,
                    contentTitle: () => p,
                    default: () => c,
                    frontMatter: () => o,
                    metadata: () => d,
                    toc: () => u
                })
            var a = n(4250),
                r = n(7075),
                l = (n(9496), n(9613)),
                i = ["components"],
                o = { hide_table_of_contents: !0 },
                p = "tsKeywordsScope",
                d = {
                    unversionedId: "api/tskeywordsscope",
                    id: "api/tskeywordsscope",
                    title: "tsKeywordsScope",
                    description: "text",
                    source: "@site/docs/api/tskeywordsscope.md",
                    sourceDirName: "api",
                    slug: "/api/tskeywordsscope",
                    permalink: "/docs/next/api/tskeywordsscope",
                    draft: !1,
                    tags: [],
                    version: "current",
                    frontMatter: { hide_table_of_contents: !0 },
                    sidebar: "sidebar",
                    previous: {
                        title: "jsObjectsScope",
                        permalink: "/docs/next/api/jsobjectsscope"
                    },
                    next: {
                        title: "validationScope",
                        permalink: "/docs/next/api/validationscope"
                    }
                },
                m = {},
                u = [{ value: "text", id: "text", level: 2 }],
                k = { toc: u }
            function c(t) {
                var e = t.components,
                    n = (0, r.Z)(t, i)
                return (0, l.kt)(
                    "wrapper",
                    (0, a.Z)({}, k, n, { components: e, mdxType: "MDXLayout" }),
                    (0, l.kt)(
                        "h1",
                        { id: "tskeywordsscope" },
                        "tsKeywordsScope"
                    ),
                    (0, l.kt)("h2", { id: "text" }, "text"),
                    (0, l.kt)(
                        "table",
                        null,
                        (0, l.kt)(
                            "thead",
                            { parentName: "table" },
                            (0, l.kt)(
                                "tr",
                                { parentName: "thead" },
                                (0, l.kt)(
                                    "th",
                                    { parentName: "tr", align: null },
                                    "Name"
                                ),
                                (0, l.kt)(
                                    "th",
                                    { parentName: "tr", align: null },
                                    "Type"
                                ),
                                (0, l.kt)(
                                    "th",
                                    { parentName: "tr", align: null },
                                    "Description"
                                )
                            )
                        ),
                        (0, l.kt)(
                            "tbody",
                            { parentName: "table" },
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "any"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " any"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "any"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "bigint"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " bigint"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a bigint"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "boolean"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " boolean"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a boolean"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "false"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " false"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "false"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "never"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " never"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "never"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "null"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " null"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "null"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "number"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " number"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a number"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "object"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " object"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "an object"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "string"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " string"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a string"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "symbol"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " symbol"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a symbol"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "true"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " true"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "true"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "unknown"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " unknown"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "unknown"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "void"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " void"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "void"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "undefined"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " undefined"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "undefined"
                                )
                            )
                        )
                    )
                )
            }
            c.isMDXComponent = !0
        }
    }
])
