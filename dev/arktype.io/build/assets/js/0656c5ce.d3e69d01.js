"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [2234],
    {
        9613: (e, n, t) => {
            t.d(n, { Zo: () => l, kt: () => f })
            var r = t(9496)
            function o(e, n, t) {
                return (
                    n in e
                        ? Object.defineProperty(e, n, {
                              value: t,
                              enumerable: !0,
                              configurable: !0,
                              writable: !0
                          })
                        : (e[n] = t),
                    e
                )
            }
            function s(e, n) {
                var t = Object.keys(e)
                if (Object.getOwnPropertySymbols) {
                    var r = Object.getOwnPropertySymbols(e)
                    n &&
                        (r = r.filter(function (n) {
                            return Object.getOwnPropertyDescriptor(
                                e,
                                n
                            ).enumerable
                        })),
                        t.push.apply(t, r)
                }
                return t
            }
            function a(e) {
                for (var n = 1; n < arguments.length; n++) {
                    var t = null != arguments[n] ? arguments[n] : {}
                    n % 2
                        ? s(Object(t), !0).forEach(function (n) {
                              o(e, n, t[n])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(t)
                          )
                        : s(Object(t)).forEach(function (n) {
                              Object.defineProperty(
                                  e,
                                  n,
                                  Object.getOwnPropertyDescriptor(t, n)
                              )
                          })
                }
                return e
            }
            function i(e, n) {
                if (null == e) return {}
                var t,
                    r,
                    o = (function (e, n) {
                        if (null == e) return {}
                        var t,
                            r,
                            o = {},
                            s = Object.keys(e)
                        for (r = 0; r < s.length; r++)
                            (t = s[r]), n.indexOf(t) >= 0 || (o[t] = e[t])
                        return o
                    })(e, n)
                if (Object.getOwnPropertySymbols) {
                    var s = Object.getOwnPropertySymbols(e)
                    for (r = 0; r < s.length; r++)
                        (t = s[r]),
                            n.indexOf(t) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    t
                                ) &&
                                    (o[t] = e[t]))
                }
                return o
            }
            var p = r.createContext({}),
                c = function (e) {
                    var n = r.useContext(p),
                        t = n
                    return (
                        e &&
                            (t =
                                "function" == typeof e ? e(n) : a(a({}, n), e)),
                        t
                    )
                },
                l = function (e) {
                    var n = c(e.components)
                    return r.createElement(p.Provider, { value: n }, e.children)
                },
                u = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var n = e.children
                        return r.createElement(r.Fragment, {}, n)
                    }
                },
                d = r.forwardRef(function (e, n) {
                    var t = e.components,
                        o = e.mdxType,
                        s = e.originalType,
                        p = e.parentName,
                        l = i(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        d = c(t),
                        f = o,
                        m = d["".concat(p, ".").concat(f)] || d[f] || u[f] || s
                    return t
                        ? r.createElement(
                              m,
                              a(a({ ref: n }, l), {}, { components: t })
                          )
                        : r.createElement(m, a({ ref: n }, l))
                })
            function f(e, n) {
                var t = arguments,
                    o = n && n.mdxType
                if ("string" == typeof e || o) {
                    var s = t.length,
                        a = new Array(s)
                    a[0] = d
                    var i = {}
                    for (var p in n) hasOwnProperty.call(n, p) && (i[p] = n[p])
                    ;(i.originalType = e),
                        (i.mdxType = "string" == typeof e ? e : o),
                        (a[1] = i)
                    for (var c = 2; c < s; c++) a[c] = t[c]
                    return r.createElement.apply(null, a)
                }
                return r.createElement.apply(null, t)
            }
            d.displayName = "MDXCreateElement"
        },
        9621: (e, n, t) => {
            t.r(n),
                t.d(n, {
                    assets: () => l,
                    contentTitle: () => p,
                    default: () => f,
                    frontMatter: () => i,
                    metadata: () => c,
                    toc: () => u
                })
            var r = t(4250),
                o = t(7075),
                s = (t(9496), t(9613)),
                a = ["components"],
                i = { hide_table_of_contents: !0 },
                p = "scope",
                c = {
                    unversionedId: "api/scope",
                    id: "version-1.0.9-alpha/api/scope",
                    title: "scope",
                    description: "text",
                    source: "@site/versioned_docs/version-1.0.9-alpha/api/scope.md",
                    sourceDirName: "api",
                    slug: "/api/scope",
                    permalink: "/docs/api/scope",
                    draft: !1,
                    tags: [],
                    version: "1.0.9-alpha",
                    frontMatter: { hide_table_of_contents: !0 }
                },
                l = {},
                u = [
                    { value: "text", id: "text", level: 2 },
                    {
                        value: "hide_table_of_contents: true",
                        id: "hide_table_of_contents-true",
                        level: 2
                    },
                    { value: "text", id: "text-1", level: 2 }
                ],
                d = { toc: u }
            function f(e) {
                var n = e.components,
                    t = (0, o.Z)(e, a)
                return (0, s.kt)(
                    "wrapper",
                    (0, r.Z)({}, d, t, { components: n, mdxType: "MDXLayout" }),
                    (0, s.kt)("h1", { id: "scope" }, "scope"),
                    (0, s.kt)("h2", { id: "text" }, "text"),
                    (0, s.kt)(
                        "pre",
                        null,
                        (0, s.kt)(
                            "code",
                            { parentName: "pre", className: "language-ts" },
                            "scope: ScopeParser\n"
                        )
                    ),
                    (0, s.kt)("hr", null),
                    (0, s.kt)(
                        "h2",
                        { id: "hide_table_of_contents-true" },
                        "hide_table_of_contents: true"
                    ),
                    (0, s.kt)("h1", { id: "scope-1" }, "Scope"),
                    (0, s.kt)("h2", { id: "text-1" }, "text"),
                    (0, s.kt)(
                        "pre",
                        null,
                        (0, s.kt)(
                            "code",
                            { parentName: "pre", className: "language-ts" },
                            'export declare class Scope<context extends ScopeContext = any> {\n    #private\n    aliases: Dict\n    name: string\n    config: ScopeConfig\n    parseCache: FreezingCache<Node>\n    constructor(aliases: Dict, opts?: ScopeOptions)\n    getAnonymousQualifiedName(base: AnonymousTypeName): QualifiedTypeName\n    addAnonymousTypeReference(referencedType: Type, ctx: ParseContext): Node\n    get infer(): exportsOf<context>\n    compile(): Space<exportsOf<context>>\n    addParsedReferenceIfResolvable(\n        name: name<context>,\n        ctx: ParseContext\n    ): boolean\n    resolve(name: name<context>): Type\n    resolveNode(node: Node): ResolvedNode\n    resolveTypeNode(node: Node): TypeNode\n    expressions: Expressions<resolutions<context>>\n    intersection: import("./expressions.js").BinaryExpressionParser<\n        resolutions<context>,\n        "&"\n    >\n    union: import("./expressions.js").BinaryExpressionParser<\n        resolutions<context>,\n        "|"\n    >\n    arrayOf: import("./expressions.js").UnaryExpressionParser<\n        resolutions<context>,\n        "[]"\n    >\n    keyOf: import("./expressions.js").UnaryExpressionParser<\n        resolutions<context>,\n        "keyof"\n    >\n    valueOf: import("./expressions.js").UnvalidatedExpressionParser<\n        resolutions<context>,\n        "==="\n    >\n    instanceOf: import("./expressions.js").UnvalidatedExpressionParser<\n        resolutions<context>,\n        "instanceof"\n    >\n    narrow: import("./expressions.js").FunctionalExpressionParser<\n        resolutions<context>,\n        "=>"\n    >\n    morph: import("./expressions.js").FunctionalExpressionParser<\n        resolutions<context>,\n        "|>"\n    >\n    type: TypeParser<resolutions<context>>\n    isResolvable(name: string): unknown\n}\n'
                        )
                    )
                )
            }
            f.isMDXComponent = !0
        }
    }
])
