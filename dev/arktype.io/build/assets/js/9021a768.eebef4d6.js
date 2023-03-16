"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [3038],
    {
        9613: (t, e, n) => {
            n.d(e, { Zo: () => m, kt: () => s })
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
            var o = a.createContext({}),
                d = function (t) {
                    var e = a.useContext(o),
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
                    return a.createElement(o.Provider, { value: e }, t.children)
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
                        o = t.parentName,
                        m = p(t, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        c = d(n),
                        s = r,
                        k = c["".concat(o, ".").concat(s)] || c[s] || u[s] || l
                    return n
                        ? a.createElement(
                              k,
                              i(i({ ref: e }, m), {}, { components: n })
                          )
                        : a.createElement(k, i({ ref: e }, m))
                })
            function s(t, e) {
                var n = arguments,
                    r = e && e.mdxType
                if ("string" == typeof t || r) {
                    var l = n.length,
                        i = new Array(l)
                    i[0] = c
                    var p = {}
                    for (var o in e) hasOwnProperty.call(e, o) && (p[o] = e[o])
                    ;(p.originalType = t),
                        (p.mdxType = "string" == typeof t ? t : r),
                        (i[1] = p)
                    for (var d = 2; d < l; d++) i[d] = n[d]
                    return a.createElement.apply(null, i)
                }
                return a.createElement.apply(null, n)
            }
            c.displayName = "MDXCreateElement"
        },
        7493: (t, e, n) => {
            n.r(e),
                n.d(e, {
                    assets: () => m,
                    contentTitle: () => o,
                    default: () => s,
                    frontMatter: () => p,
                    metadata: () => d,
                    toc: () => u
                })
            var a = n(4250),
                r = n(7075),
                l = (n(9496), n(9613)),
                i = ["components"],
                p = { hide_table_of_contents: !0 },
                o = "validationScope",
                d = {
                    unversionedId: "api/validationscope",
                    id: "api/validationscope",
                    title: "validationScope",
                    description: "text",
                    source: "@site/docs/api/validationscope.md",
                    sourceDirName: "api",
                    slug: "/api/validationscope",
                    permalink: "/docs/next/api/validationscope",
                    draft: !1,
                    tags: [],
                    version: "current",
                    frontMatter: { hide_table_of_contents: !0 },
                    sidebar: "sidebar",
                    previous: {
                        title: "tsKeywordsScope",
                        permalink: "/docs/next/api/tskeywordsscope"
                    },
                    next: { title: "API", permalink: "/docs/next/api" }
                },
                m = {},
                u = [{ value: "text", id: "text", level: 2 }],
                c = { toc: u }
            function s(t) {
                var e = t.components,
                    n = (0, r.Z)(t, i)
                return (0, l.kt)(
                    "wrapper",
                    (0, a.Z)({}, c, n, { components: e, mdxType: "MDXLayout" }),
                    (0, l.kt)(
                        "h1",
                        { id: "validationscope" },
                        "validationScope"
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
            s.isMDXComponent = !0
        }
    }
])
