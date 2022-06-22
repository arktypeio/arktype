"use strict"
;(self.webpackChunkredo_dev = self.webpackChunkredo_dev || []).push([
    [387],
    {
        7965: (e, t, r) => {
            r.d(t, { Zo: () => d, kt: () => f })
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
            function i(e, t) {
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
            function a(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var r = null != arguments[t] ? arguments[t] : {}
                    t % 2
                        ? i(Object(r), !0).forEach(function (t) {
                              o(e, t, r[t])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(r)
                          )
                        : i(Object(r)).forEach(function (t) {
                              Object.defineProperty(
                                  e,
                                  t,
                                  Object.getOwnPropertyDescriptor(r, t)
                              )
                          })
                }
                return e
            }
            function l(e, t) {
                if (null == e) return {}
                var r,
                    n,
                    o = (function (e, t) {
                        if (null == e) return {}
                        var r,
                            n,
                            o = {},
                            i = Object.keys(e)
                        for (n = 0; n < i.length; n++)
                            (r = i[n]), t.indexOf(r) >= 0 || (o[r] = e[r])
                        return o
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var i = Object.getOwnPropertySymbols(e)
                    for (n = 0; n < i.length; n++)
                        (r = i[n]),
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
                s = function (e) {
                    var t = n.useContext(p),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : a(a({}, t), e)),
                        r
                    )
                },
                d = function (e) {
                    var t = s(e.components)
                    return n.createElement(p.Provider, { value: t }, e.children)
                },
                c = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return n.createElement(n.Fragment, {}, t)
                    }
                },
                u = n.forwardRef(function (e, t) {
                    var r = e.components,
                        o = e.mdxType,
                        i = e.originalType,
                        p = e.parentName,
                        d = l(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        u = s(r),
                        f = o,
                        m = u["".concat(p, ".").concat(f)] || u[f] || c[f] || i
                    return r
                        ? n.createElement(
                              m,
                              a(a({ ref: t }, d), {}, { components: r })
                          )
                        : n.createElement(m, a({ ref: t }, d))
                })
            function f(e, t) {
                var r = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var i = r.length,
                        a = new Array(i)
                    a[0] = u
                    var l = {}
                    for (var p in t) hasOwnProperty.call(t, p) && (l[p] = t[p])
                    ;(l.originalType = e),
                        (l.mdxType = "string" == typeof e ? e : o),
                        (a[1] = l)
                    for (var s = 2; s < i; s++) a[s] = r[s]
                    return n.createElement.apply(null, a)
                }
                return n.createElement.apply(null, r)
            }
            u.displayName = "MDXCreateElement"
        },
        1119: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => y,
                    contentTitle: () => f,
                    default: () => v,
                    frontMatter: () => u,
                    metadata: () => m,
                    toc: () => b
                })
            var n = r(7965),
                o = Object.defineProperty,
                i = Object.defineProperties,
                a = Object.getOwnPropertyDescriptors,
                l = Object.getOwnPropertySymbols,
                p = Object.prototype.hasOwnProperty,
                s = Object.prototype.propertyIsEnumerable,
                d = (e, t, r) =>
                    t in e
                        ? o(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                c = (e, t) => {
                    for (var r in t || (t = {})) p.call(t, r) && d(e, r, t[r])
                    if (l) for (var r of l(t)) s.call(t, r) && d(e, r, t[r])
                    return e
                }
            const u = { sidebar_position: 1, hide_table_of_contents: !0 },
                f = "Model",
                m = {
                    unversionedId: "intro",
                    id: "version-1.11.0/intro",
                    title: "Model",
                    description:
                        "Type-first validation from editor to runtime\ud83e\uddec",
                    source: "@site/model_versioned_docs/version-1.11.0/intro.mdx",
                    sourceDirName: ".",
                    slug: "/intro",
                    permalink: "/model/intro",
                    draft: !1,
                    tags: [],
                    version: "1.11.0",
                    sidebarPosition: 1,
                    frontMatter: {
                        sidebar_position: 1,
                        hide_table_of_contents: !0
                    },
                    sidebar: "defaultSidebar",
                    next: { title: "Spaces", permalink: "/model/spaces" }
                },
                y = {},
                b = [
                    {
                        value: "What&#39;s a model? \ud83e\udd37",
                        id: "whats-a-model-",
                        level: 2
                    },
                    {
                        value: "Installation \ud83d\udce6",
                        id: "installation-",
                        level: 2
                    },
                    {
                        value: "Start quick \u23f1\ufe0f",
                        id: "start-quick-\ufe0f",
                        level: 2
                    }
                ],
                h = { toc: b }
            function v(e) {
                var t,
                    r = e,
                    { components: o } = r,
                    d = ((e, t) => {
                        var r = {}
                        for (var n in e)
                            p.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n])
                        if (null != e && l)
                            for (var n of l(e))
                                t.indexOf(n) < 0 &&
                                    s.call(e, n) &&
                                    (r[n] = e[n])
                        return r
                    })(r, ["components"])
                return (0, n.kt)(
                    "wrapper",
                    ((t = c(c({}, h), d)),
                    i(t, a({ components: o, mdxType: "MDXLayout" }))),
                    (0, n.kt)("h1", c({}, { id: "model" }), "Model"),
                    (0, n.kt)(
                        "h4",
                        null,
                        (0, n.kt)(
                            "i",
                            null,
                            "Type-first validation from editor to runtime\ud83e\uddec"
                        )
                    ),
                    (0, n.kt)(
                        "h2",
                        c({}, { id: "whats-a-model-" }),
                        "What's a model? \ud83e\udd37"
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "A model is a way to create universal types for your JS/TS values. From one definition, you get all the benefits of ",
                        (0, n.kt)(
                            "a",
                            c(
                                { parentName: "p" },
                                {
                                    href: "https://github.com/microsoft/TypeScript"
                                }
                            ),
                            "TypeScript"
                        ),
                        " in your editor and build and a validator like ",
                        (0, n.kt)(
                            "a",
                            c(
                                { parentName: "p" },
                                { href: "https://github.com/jquense/yup" }
                            ),
                            "Yup"
                        ),
                        " or ",
                        (0, n.kt)(
                            "a",
                            c(
                                { parentName: "p" },
                                { href: "https://github.com/sideway/joi" }
                            ),
                            "JOI"
                        ),
                        " at runtime."
                    ),
                    (0, n.kt)(
                        "h2",
                        c({}, { id: "installation-" }),
                        "Installation \ud83d\udce6"
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        (0, n.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "npm install @re-/model"
                        )
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "(feel free to substitute ",
                        (0, n.kt)("inlineCode", { parentName: "p" }, "yarn"),
                        ", ",
                        (0, n.kt)("inlineCode", { parentName: "p" }, "pnpm"),
                        ", et al.)"
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "If you're using TypeScript, you'll need at least ",
                        (0, n.kt)("inlineCode", { parentName: "p" }, "4.4"),
                        "."
                    ),
                    (0, n.kt)(
                        "h2",
                        c({}, { id: "start-quick-\ufe0f" }),
                        "Start quick \u23f1\ufe0f"
                    ),
                    (0, n.kt)(
                        "p",
                        null,
                        "This snippet will give you an idea of ",
                        (0, n.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "@re-/model"
                        ),
                        " syntax. Try messing around with the ",
                        (0, n.kt)("inlineCode", { parentName: "p" }, "user"),
                        " definition below and see how the type hints help guide you in the right direction."
                    ),
                    (0, n.kt)(
                        "div",
                        {
                            style: {
                                width: "100%",
                                height: "660px",
                                border: 0,
                                marginLeft: -8,
                                marginRight: -8,
                                padding: 16,
                                overflow: "hidden",
                                borderRadius: 8
                            }
                        },
                        (0, n.kt)("iframe", {
                            id: "demo",
                            src: "https://stackblitz.com/edit/re-model?embed=1&file=model.ts&hideDevTools=1&hideExplorer=1&hideNavigation=1&theme=dark",
                            style: {
                                height: "100%",
                                width: "100%",
                                borderRadius: 8
                            },
                            title: "@re-/model",
                            sandbox:
                                "allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                        })
                    )
                )
            }
            v.isMDXComponent = !0
        }
    }
])
