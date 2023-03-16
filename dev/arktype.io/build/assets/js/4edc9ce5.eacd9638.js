"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [5820],
    {
        9613: (t, e, n) => {
            n.d(e, { Zo: () => o, kt: () => u })
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
            function d(t, e) {
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
                m = function (t) {
                    var e = a.useContext(p),
                        n = e
                    return (
                        t &&
                            (n =
                                "function" == typeof t ? t(e) : i(i({}, e), t)),
                        n
                    )
                },
                o = function (t) {
                    var e = m(t.components)
                    return a.createElement(p.Provider, { value: e }, t.children)
                },
                k = {
                    inlineCode: "code",
                    wrapper: function (t) {
                        var e = t.children
                        return a.createElement(a.Fragment, {}, e)
                    }
                },
                N = a.forwardRef(function (t, e) {
                    var n = t.components,
                        r = t.mdxType,
                        l = t.originalType,
                        p = t.parentName,
                        o = d(t, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        N = m(n),
                        u = r,
                        g = N["".concat(p, ".").concat(u)] || N[u] || k[u] || l
                    return n
                        ? a.createElement(
                              g,
                              i(i({ ref: e }, o), {}, { components: n })
                          )
                        : a.createElement(g, i({ ref: e }, o))
                })
            function u(t, e) {
                var n = arguments,
                    r = e && e.mdxType
                if ("string" == typeof t || r) {
                    var l = n.length,
                        i = new Array(l)
                    i[0] = N
                    var d = {}
                    for (var p in e) hasOwnProperty.call(e, p) && (d[p] = e[p])
                    ;(d.originalType = t),
                        (d.mdxType = "string" == typeof t ? t : r),
                        (i[1] = d)
                    for (var m = 2; m < l; m++) i[m] = n[m]
                    return a.createElement.apply(null, i)
                }
                return a.createElement.apply(null, n)
            }
            N.displayName = "MDXCreateElement"
        },
        423: (t, e, n) => {
            n.r(e),
                n.d(e, {
                    assets: () => o,
                    contentTitle: () => p,
                    default: () => u,
                    frontMatter: () => d,
                    metadata: () => m,
                    toc: () => k
                })
            var a = n(4250),
                r = n(7075),
                l = (n(9496), n(9613)),
                i = ["components"],
                d = { hide_table_of_contents: !0 },
                p = "Keywords",
                m = {
                    unversionedId: "api/keywords",
                    id: "api/keywords",
                    title: "Keywords",
                    description: "jsObjectsScope",
                    source: "@site/docs/api/keywords.md",
                    sourceDirName: "api",
                    slug: "/api/keywords",
                    permalink: "/docs/next/api/keywords",
                    draft: !1,
                    tags: [],
                    version: "current",
                    frontMatter: { hide_table_of_contents: !0 },
                    sidebar: "sidebar",
                    previous: {
                        title: "Scopes",
                        permalink: "/docs/next/scopes"
                    },
                    next: {
                        title: "jsObjectsScope",
                        permalink: "/docs/next/api/jsobjectsscope"
                    }
                },
                o = {},
                k = [
                    { value: "jsObjectsScope", id: "jsobjectsscope", level: 2 },
                    {
                        value: "tsKeywordsScope",
                        id: "tskeywordsscope",
                        level: 2
                    },
                    {
                        value: "validationScope",
                        id: "validationscope",
                        level: 2
                    }
                ],
                N = { toc: k }
            function u(t) {
                var e = t.components,
                    n = (0, r.Z)(t, i)
                return (0, l.kt)(
                    "wrapper",
                    (0, a.Z)({}, N, n, { components: e, mdxType: "MDXLayout" }),
                    (0, l.kt)("h1", { id: "keywords" }, "Keywords"),
                    (0, l.kt)("h2", { id: "jsobjectsscope" }, "jsObjectsScope"),
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
                                    "Function"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " (...args: any[]) => unknown"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a function"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "Array"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " unknown[]"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "an array"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "Date"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " Date"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a Date"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "Error"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " Error"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "an Error"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "Map"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " Map<unknown, unknown>"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a Map"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "RegExp"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " RegExp"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a RegExp"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "Set"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " Set<unknown>"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a Set"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "Object"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " Record<string, unknown>"
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
                                    "String"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " String"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a String object"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "Number"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " Number"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a Number object"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "Boolean"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " Boolean"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a Boolean object"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "WeakMap"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " WeakMap<object, unknown>"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a WeakMap"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "WeakSet"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " WeakSet<object>"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a WeakSet"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "Promise"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " Promise<unknown>"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a Promise"
                                )
                            )
                        )
                    ),
                    (0, l.kt)(
                        "h2",
                        { id: "tskeywordsscope" },
                        "tsKeywordsScope"
                    ),
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
                    ),
                    (0, l.kt)(
                        "h2",
                        { id: "validationscope" },
                        "validationScope"
                    ),
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
                                    "alpha"
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
                                    "only letters"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "alphanumeric"
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
                                    "only letters and digits"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "lowercase"
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
                                    "only lowercase letters"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "uppercase"
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
                                    "only uppercase letters"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "creditCard"
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
                                    "a valid credit card number"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "email"
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
                                    "a valid email"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "uuid"
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
                                    "a valid UUID"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "parsedNumber"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " (In: string) => number"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a well-formed numeric string"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "parsedInteger"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " (In: string) => number"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a well-formed integer string"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "parsedDate"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " (In: string) => Date"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a valid date"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "semver"
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
                                    "a valid semantic version"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "json"
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    (0, l.kt)(
                                        "inlineCode",
                                        { parentName: "td" },
                                        " (In: string) => unknown"
                                    )
                                ),
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "a JSON-parsable string"
                                )
                            ),
                            (0, l.kt)(
                                "tr",
                                { parentName: "tbody" },
                                (0, l.kt)(
                                    "td",
                                    { parentName: "tr", align: null },
                                    "integer"
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
                                    "an integer"
                                )
                            )
                        )
                    )
                )
            }
            u.isMDXComponent = !0
        }
    }
])
