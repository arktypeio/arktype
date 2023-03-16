"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [5348],
    {
        9613: (t, e, n) => {
            n.d(e, { Zo: () => m, kt: () => k })
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
            function o(t) {
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
            function p(t, e) {
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
            var i = a.createContext({}),
                d = function (t) {
                    var e = a.useContext(i),
                        n = e
                    return (
                        t &&
                            (n =
                                "function" == typeof t ? t(e) : o(o({}, e), t)),
                        n
                    )
                },
                m = function (t) {
                    var e = d(t.components)
                    return a.createElement(i.Provider, { value: e }, t.children)
                },
                u = {
                    inlineCode: "code",
                    wrapper: function (t) {
                        var e = t.children
                        return a.createElement(a.Fragment, {}, e)
                    }
                },
                c = a.forwardRef(function (t, e) {
                    var n = t.components,
                        r = t.mdxType,
                        l = t.originalType,
                        i = t.parentName,
                        m = p(t, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        c = d(n),
                        k = r,
                        s = c["".concat(i, ".").concat(k)] || c[k] || u[k] || l
                    return n
                        ? a.createElement(
                              s,
                              o(o({ ref: e }, m), {}, { components: n })
                          )
                        : a.createElement(s, o({ ref: e }, m))
                })
            function k(t, e) {
                var n = arguments,
                    r = e && e.mdxType
                if ("string" == typeof t || r) {
                    var l = n.length,
                        o = new Array(l)
                    o[0] = c
                    var p = {}
                    for (var i in e) hasOwnProperty.call(e, i) && (p[i] = e[i])
                    ;(p.originalType = t),
                        (p.mdxType = "string" == typeof t ? t : r),
                        (o[1] = p)
                    for (var d = 2; d < l; d++) o[d] = n[d]
                    return a.createElement.apply(null, o)
                }
                return a.createElement.apply(null, n)
            }
            c.displayName = "MDXCreateElement"
        },
        1350: (t, e, n) => {
            n.r(e),
                n.d(e, {
                    assets: () => m,
                    contentTitle: () => i,
                    default: () => k,
                    frontMatter: () => p,
                    metadata: () => d,
                    toc: () => u
                })
            var a = n(4250),
                r = n(7075),
                l = (n(9496), n(9613)),
                o = ["components"],
                p = { hide_table_of_contents: !0 },
                i = "jsObjectsScope",
                d = {
                    unversionedId: "api/jsobjectsscope",
                    id: "api/jsobjectsscope",
                    title: "jsObjectsScope",
                    description: "text",
                    source: "@site/docs/api/jsobjectsscope.md",
                    sourceDirName: "api",
                    slug: "/api/jsobjectsscope",
                    permalink: "/docs/next/api/jsobjectsscope",
                    draft: !1,
                    tags: [],
                    version: "current",
                    frontMatter: { hide_table_of_contents: !0 },
                    sidebar: "sidebar",
                    previous: {
                        title: "Keywords",
                        permalink: "/docs/next/api/keywords"
                    },
                    next: {
                        title: "tsKeywordsScope",
                        permalink: "/docs/next/api/tskeywordsscope"
                    }
                },
                m = {},
                u = [{ value: "text", id: "text", level: 2 }],
                c = { toc: u }
            function k(t) {
                var e = t.components,
                    n = (0, r.Z)(t, o)
                return (0, l.kt)(
                    "wrapper",
                    (0, a.Z)({}, c, n, { components: e, mdxType: "MDXLayout" }),
                    (0, l.kt)("h1", { id: "jsobjectsscope" }, "jsObjectsScope"),
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
                    )
                )
            }
            k.isMDXComponent = !0
        }
    }
])
