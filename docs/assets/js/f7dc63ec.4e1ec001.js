"use strict"
;(self.webpackChunkredo_dev = self.webpackChunkredo_dev || []).push([
    [265],
    {
        7965: (e, t, n) => {
            n.d(t, { Zo: () => f, kt: () => d })
            var r = n(3889)
            function o(e, t, n) {
                return (
                    t in e
                        ? Object.defineProperty(e, t, {
                              value: n,
                              enumerable: !0,
                              configurable: !0,
                              writable: !0
                          })
                        : (e[t] = n),
                    e
                )
            }
            function a(e, t) {
                var n = Object.keys(e)
                if (Object.getOwnPropertySymbols) {
                    var r = Object.getOwnPropertySymbols(e)
                    t &&
                        (r = r.filter(function (t) {
                            return Object.getOwnPropertyDescriptor(
                                e,
                                t
                            ).enumerable
                        })),
                        n.push.apply(n, r)
                }
                return n
            }
            function i(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var n = null != arguments[t] ? arguments[t] : {}
                    t % 2
                        ? a(Object(n), !0).forEach(function (t) {
                              o(e, t, n[t])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(n)
                          )
                        : a(Object(n)).forEach(function (t) {
                              Object.defineProperty(
                                  e,
                                  t,
                                  Object.getOwnPropertyDescriptor(n, t)
                              )
                          })
                }
                return e
            }
            function s(e, t) {
                if (null == e) return {}
                var n,
                    r,
                    o = (function (e, t) {
                        if (null == e) return {}
                        var n,
                            r,
                            o = {},
                            a = Object.keys(e)
                        for (r = 0; r < a.length; r++)
                            (n = a[r]), t.indexOf(n) >= 0 || (o[n] = e[n])
                        return o
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var a = Object.getOwnPropertySymbols(e)
                    for (r = 0; r < a.length; r++)
                        (n = a[r]),
                            t.indexOf(n) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    n
                                ) &&
                                    (o[n] = e[n]))
                }
                return o
            }
            var c = r.createContext({}),
                p = function (e) {
                    var t = r.useContext(c),
                        n = t
                    return (
                        e &&
                            (n =
                                "function" == typeof e ? e(t) : i(i({}, t), e)),
                        n
                    )
                },
                f = function (e) {
                    var t = p(e.components)
                    return r.createElement(c.Provider, { value: t }, e.children)
                },
                l = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return r.createElement(r.Fragment, {}, t)
                    }
                },
                u = r.forwardRef(function (e, t) {
                    var n = e.components,
                        o = e.mdxType,
                        a = e.originalType,
                        c = e.parentName,
                        f = s(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        u = p(n),
                        d = o,
                        y = u["".concat(c, ".").concat(d)] || u[d] || l[d] || a
                    return n
                        ? r.createElement(
                              y,
                              i(i({ ref: t }, f), {}, { components: n })
                          )
                        : r.createElement(y, i({ ref: t }, f))
                })
            function d(e, t) {
                var n = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var a = n.length,
                        i = new Array(a)
                    i[0] = u
                    var s = {}
                    for (var c in t) hasOwnProperty.call(t, c) && (s[c] = t[c])
                    ;(s.originalType = e),
                        (s.mdxType = "string" == typeof e ? e : o),
                        (i[1] = s)
                    for (var p = 2; p < a; p++) i[p] = n[p]
                    return r.createElement.apply(null, i)
                }
                return r.createElement.apply(null, n)
            }
            u.displayName = "MDXCreateElement"
        },
        2433: (e, t, n) => {
            n.r(t),
                n.d(t, {
                    assets: () => m,
                    contentTitle: () => d,
                    default: () => O,
                    frontMatter: () => u,
                    metadata: () => y,
                    toc: () => D
                })
            var r = n(7965),
                o = Object.defineProperty,
                a = Object.defineProperties,
                i = Object.getOwnPropertyDescriptors,
                s = Object.getOwnPropertySymbols,
                c = Object.prototype.hasOwnProperty,
                p = Object.prototype.propertyIsEnumerable,
                f = (e, t, n) =>
                    t in e
                        ? o(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: n
                          })
                        : (e[t] = n),
                l = (e, t) => {
                    for (var n in t || (t = {})) c.call(t, n) && f(e, n, t[n])
                    if (s) for (var n of s(t)) p.call(t, n) && f(e, n, t[n])
                    return e
                }
            const u = {},
                d = "Root",
                y = {
                    unversionedId: "api/Root",
                    id: "api/Root",
                    title: "Root",
                    description: "tags",
                    source: "@site/docs/model/api/Root.md",
                    sourceDirName: "api",
                    slug: "/api/Root",
                    permalink: "/model/next/api/Root",
                    draft: !1,
                    tags: [],
                    version: "current",
                    frontMatter: {}
                },
                m = {},
                D = [
                    { value: "tags", id: "tags", level: 2 },
                    { value: "text", id: "text", level: 2 }
                ],
                b = { toc: D }
            function O(e) {
                var t,
                    n = e,
                    { components: o } = n,
                    f = ((e, t) => {
                        var n = {}
                        for (var r in e)
                            c.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r])
                        if (null != e && s)
                            for (var r of s(e))
                                t.indexOf(r) < 0 &&
                                    p.call(e, r) &&
                                    (n[r] = e[r])
                        return n
                    })(n, ["components"])
                return (0, r.kt)(
                    "wrapper",
                    ((t = l(l({}, b), f)),
                    a(t, i({ components: o, mdxType: "MDXLayout" }))),
                    (0, r.kt)("h1", l({}, { id: "root" }), "Root"),
                    (0, r.kt)("h2", l({}, { id: "tags" }), "tags"),
                    (0, r.kt)(
                        "pre",
                        null,
                        (0, r.kt)(
                            "code",
                            l(
                                { parentName: "pre" },
                                { className: "language-ts" }
                            ),
                            "undefined\n"
                        )
                    ),
                    (0, r.kt)("h2", l({}, { id: "text" }), "text"),
                    (0, r.kt)(
                        "pre",
                        null,
                        (0, r.kt)(
                            "code",
                            l(
                                { parentName: "pre" },
                                { className: "language-ts" }
                            ),
                            'export declare namespace Root {\n    export type Validate<Def, Dict> = Def extends []\n        ? Def\n        : Def extends string\n        ? Str.Validate<Def, Dict, Def>\n        : Def extends BadDefinitionType\n        ? BadDefinitionTypeMessage<Def>\n        : Def extends Obj.Leaves\n        ? Def\n        : Def extends object\n        ? Obj.Validate<Def, Dict>\n        : Def extends Literal.Definition\n        ? Def\n        : Common.Parser.ParseErrorMessage<Common.Parser.UnknownTypeErrorMessage>\n    export type Parse<Def, Dict, Seen> = IsAnyOrUnknown<Def> extends true\n        ? Def\n        : Def extends string\n        ? Str.Parse<Def, Dict, Seen>\n        : Def extends BadDefinitionType\n        ? unknown\n        : Def extends object\n        ? Obj.Parse<Def, Dict, Seen>\n        : Def extends Literal.Definition\n        ? Def\n        : IsAny<Dict> extends true\n        ? any\n        : unknown\n    export type BadDefinitionType = Function | symbol\n    type BadDefinitionTypeMessage<Def extends BadDefinitionType> =\n        Common.Parser.ParseErrorMessage<`Values of type ${Def extends Function\n            ? "function"\n            : "symbol"} are not valid definitions.`>\n    export const parse: Common.Parser.Parser<unknown>\n    export {}\n}\n'
                        )
                    )
                )
            }
            O.isMDXComponent = !0
        }
    }
])
