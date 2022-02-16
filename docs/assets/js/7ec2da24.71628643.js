"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [92],
    {
        6383: (e, t, r) => {
            r.d(t, { Zo: () => c, kt: () => d })
            var a = r(1672)
            function n(e, t, r) {
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
            function o(e, t) {
                var r = Object.keys(e)
                if (Object.getOwnPropertySymbols) {
                    var a = Object.getOwnPropertySymbols(e)
                    t &&
                        (a = a.filter(function (t) {
                            return Object.getOwnPropertyDescriptor(
                                e,
                                t
                            ).enumerable
                        })),
                        r.push.apply(r, a)
                }
                return r
            }
            function s(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var r = null != arguments[t] ? arguments[t] : {}
                    t % 2
                        ? o(Object(r), !0).forEach(function (t) {
                              n(e, t, r[t])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(r)
                          )
                        : o(Object(r)).forEach(function (t) {
                              Object.defineProperty(
                                  e,
                                  t,
                                  Object.getOwnPropertyDescriptor(r, t)
                              )
                          })
                }
                return e
            }
            function i(e, t) {
                if (null == e) return {}
                var r,
                    a,
                    n = (function (e, t) {
                        if (null == e) return {}
                        var r,
                            a,
                            n = {},
                            o = Object.keys(e)
                        for (a = 0; a < o.length; a++)
                            (r = o[a]), t.indexOf(r) >= 0 || (n[r] = e[r])
                        return n
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var o = Object.getOwnPropertySymbols(e)
                    for (a = 0; a < o.length; a++)
                        (r = o[a]),
                            t.indexOf(r) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    r
                                ) &&
                                    (n[r] = e[r]))
                }
                return n
            }
            var l = a.createContext({}),
                u = function (e) {
                    var t = a.useContext(l),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : s(s({}, t), e)),
                        r
                    )
                },
                c = function (e) {
                    var t = u(e.components)
                    return a.createElement(l.Provider, { value: t }, e.children)
                },
                p = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return a.createElement(a.Fragment, {}, t)
                    }
                },
                m = a.forwardRef(function (e, t) {
                    var r = e.components,
                        n = e.mdxType,
                        o = e.originalType,
                        l = e.parentName,
                        c = i(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        m = u(r),
                        d = n,
                        f = m["".concat(l, ".").concat(d)] || m[d] || p[d] || o
                    return r
                        ? a.createElement(
                              f,
                              s(s({ ref: t }, c), {}, { components: r })
                          )
                        : a.createElement(f, s({ ref: t }, c))
                })
            function d(e, t) {
                var r = arguments,
                    n = t && t.mdxType
                if ("string" == typeof e || n) {
                    var o = r.length,
                        s = new Array(o)
                    s[0] = m
                    var i = {}
                    for (var l in t) hasOwnProperty.call(t, l) && (i[l] = t[l])
                    ;(i.originalType = e),
                        (i.mdxType = "string" == typeof e ? e : n),
                        (s[1] = i)
                    for (var u = 2; u < o; u++) s[u] = r[u]
                    return a.createElement.apply(null, s)
                }
                return a.createElement.apply(null, r)
            }
            m.displayName = "MDXCreateElement"
        },
        7891: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    frontMatter: () => m,
                    contentTitle: () => d,
                    metadata: () => f,
                    toc: () => g,
                    default: () => h
                })
            var a = r(6383),
                n = Object.defineProperty,
                o = Object.defineProperties,
                s = Object.getOwnPropertyDescriptors,
                i = Object.getOwnPropertySymbols,
                l = Object.prototype.hasOwnProperty,
                u = Object.prototype.propertyIsEnumerable,
                c = (e, t, r) =>
                    t in e
                        ? n(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                p = (e, t) => {
                    for (var r in t || (t = {})) l.call(t, r) && c(e, r, t[r])
                    if (i) for (var r of i(t)) u.call(t, r) && c(e, r, t[r])
                    return e
                }
            const m = { sidebar_position: 6 },
                d = "Congratulations!",
                f = {
                    unversionedId: "model/tutorial-basics/congratulations",
                    id: "model/tutorial-basics/congratulations",
                    title: "Congratulations!",
                    description:
                        "You have just learned the basics of Docusaurus and made some changes to the initial template.",
                    source: "@site/docs/model/tutorial-basics/congratulations.md",
                    sourceDirName: "model/tutorial-basics",
                    slug: "/model/tutorial-basics/congratulations",
                    permalink: "/docs/model/tutorial-basics/congratulations",
                    editUrl:
                        "https://github.com/re-do/re-po/edit/main/pkgs/docs/docs/model/tutorial-basics/congratulations.md",
                    tags: [],
                    version: "current",
                    sidebarPosition: 6,
                    frontMatter: { sidebar_position: 6 },
                    sidebar: "model",
                    previous: {
                        title: "Deploy your site",
                        permalink:
                            "/docs/model/tutorial-basics/deploy-your-site"
                    },
                    next: {
                        title: "Manage Docs Versions",
                        permalink:
                            "/docs/model/tutorial-extras/manage-docs-versions"
                    }
                },
                g = [
                    {
                        value: "What&#39;s next?",
                        id: "whats-next",
                        children: [],
                        level: 2
                    }
                ],
                b = { toc: g }
            function h(e) {
                var t,
                    r = e,
                    { components: n } = r,
                    c = ((e, t) => {
                        var r = {}
                        for (var a in e)
                            l.call(e, a) && t.indexOf(a) < 0 && (r[a] = e[a])
                        if (null != e && i)
                            for (var a of i(e))
                                t.indexOf(a) < 0 &&
                                    u.call(e, a) &&
                                    (r[a] = e[a])
                        return r
                    })(r, ["components"])
                return (0, a.kt)(
                    "wrapper",
                    ((t = p(p({}, b), c)),
                    o(t, s({ components: n, mdxType: "MDXLayout" }))),
                    (0, a.kt)(
                        "h1",
                        p({}, { id: "congratulations" }),
                        "Congratulations!"
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "You have just learned the ",
                        (0, a.kt)(
                            "strong",
                            { parentName: "p" },
                            "basics of Docusaurus"
                        ),
                        " and made some changes to the ",
                        (0, a.kt)(
                            "strong",
                            { parentName: "p" },
                            "initial template"
                        ),
                        "."
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "Docusaurus has ",
                        (0, a.kt)(
                            "strong",
                            { parentName: "p" },
                            "much more to offer"
                        ),
                        "!"
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "Have ",
                        (0, a.kt)(
                            "strong",
                            { parentName: "p" },
                            "5 more minutes"
                        ),
                        "? Take a look at ",
                        (0, a.kt)(
                            "strong",
                            { parentName: "p" },
                            (0, a.kt)(
                                "a",
                                p(
                                    { parentName: "strong" },
                                    {
                                        href: "/docs/model/tutorial-extras/manage-docs-versions"
                                    }
                                ),
                                "versioning"
                            )
                        ),
                        " and ",
                        (0, a.kt)(
                            "strong",
                            { parentName: "p" },
                            (0, a.kt)(
                                "a",
                                p(
                                    { parentName: "strong" },
                                    {
                                        href: "/docs/model/tutorial-extras/translate-your-site"
                                    }
                                ),
                                "i18n"
                            )
                        ),
                        "."
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "Anything ",
                        (0, a.kt)("strong", { parentName: "p" }, "unclear"),
                        " or ",
                        (0, a.kt)("strong", { parentName: "p" }, "buggy"),
                        " in this tutorial? ",
                        (0, a.kt)(
                            "a",
                            p(
                                { parentName: "p" },
                                {
                                    href: "https://github.com/facebook/docusaurus/discussions/4610"
                                }
                            ),
                            "Please report it!"
                        )
                    ),
                    (0, a.kt)(
                        "h2",
                        p({}, { id: "whats-next" }),
                        "What's next?"
                    ),
                    (0, a.kt)(
                        "ul",
                        null,
                        (0, a.kt)(
                            "li",
                            { parentName: "ul" },
                            "Read the ",
                            (0, a.kt)(
                                "a",
                                p(
                                    { parentName: "li" },
                                    { href: "https://docusaurus.io/" }
                                ),
                                "official documentation"
                            ),
                            "."
                        ),
                        (0, a.kt)(
                            "li",
                            { parentName: "ul" },
                            "Add a custom ",
                            (0, a.kt)(
                                "a",
                                p(
                                    { parentName: "li" },
                                    {
                                        href: "https://docusaurus.io/docs/styling-layout"
                                    }
                                ),
                                "Design and Layout"
                            )
                        ),
                        (0, a.kt)(
                            "li",
                            { parentName: "ul" },
                            "Add a ",
                            (0, a.kt)(
                                "a",
                                p(
                                    { parentName: "li" },
                                    {
                                        href: "https://docusaurus.io/docs/search"
                                    }
                                ),
                                "search bar"
                            )
                        ),
                        (0, a.kt)(
                            "li",
                            { parentName: "ul" },
                            "Find inspirations in the ",
                            (0, a.kt)(
                                "a",
                                p(
                                    { parentName: "li" },
                                    { href: "https://docusaurus.io/showcase" }
                                ),
                                "Docusaurus showcase"
                            )
                        ),
                        (0, a.kt)(
                            "li",
                            { parentName: "ul" },
                            "Get involved in the ",
                            (0, a.kt)(
                                "a",
                                p(
                                    { parentName: "li" },
                                    {
                                        href: "https://docusaurus.io/community/support"
                                    }
                                ),
                                "Docusaurus Community"
                            )
                        )
                    )
                )
            }
            h.isMDXComponent = !0
        }
    }
])
