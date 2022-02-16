"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [531],
    {
        6383: (t, e, r) => {
            r.d(e, { Zo: () => l, kt: () => d })
            var a = r(1672)
            function n(t, e, r) {
                return (
                    e in t
                        ? Object.defineProperty(t, e, {
                              value: r,
                              enumerable: !0,
                              configurable: !0,
                              writable: !0
                          })
                        : (t[e] = r),
                    t
                )
            }
            function o(t, e) {
                var r = Object.keys(t)
                if (Object.getOwnPropertySymbols) {
                    var a = Object.getOwnPropertySymbols(t)
                    e &&
                        (a = a.filter(function (e) {
                            return Object.getOwnPropertyDescriptor(
                                t,
                                e
                            ).enumerable
                        })),
                        r.push.apply(r, a)
                }
                return r
            }
            function s(t) {
                for (var e = 1; e < arguments.length; e++) {
                    var r = null != arguments[e] ? arguments[e] : {}
                    e % 2
                        ? o(Object(r), !0).forEach(function (e) {
                              n(t, e, r[e])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              t,
                              Object.getOwnPropertyDescriptors(r)
                          )
                        : o(Object(r)).forEach(function (e) {
                              Object.defineProperty(
                                  t,
                                  e,
                                  Object.getOwnPropertyDescriptor(r, e)
                              )
                          })
                }
                return t
            }
            function i(t, e) {
                if (null == t) return {}
                var r,
                    a,
                    n = (function (t, e) {
                        if (null == t) return {}
                        var r,
                            a,
                            n = {},
                            o = Object.keys(t)
                        for (a = 0; a < o.length; a++)
                            (r = o[a]), e.indexOf(r) >= 0 || (n[r] = t[r])
                        return n
                    })(t, e)
                if (Object.getOwnPropertySymbols) {
                    var o = Object.getOwnPropertySymbols(t)
                    for (a = 0; a < o.length; a++)
                        (r = o[a]),
                            e.indexOf(r) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    t,
                                    r
                                ) &&
                                    (n[r] = t[r]))
                }
                return n
            }
            var u = a.createContext({}),
                c = function (t) {
                    var e = a.useContext(u),
                        r = e
                    return (
                        t &&
                            (r =
                                "function" == typeof t ? t(e) : s(s({}, e), t)),
                        r
                    )
                },
                l = function (t) {
                    var e = c(t.components)
                    return a.createElement(u.Provider, { value: e }, t.children)
                },
                p = {
                    inlineCode: "code",
                    wrapper: function (t) {
                        var e = t.children
                        return a.createElement(a.Fragment, {}, e)
                    }
                },
                m = a.forwardRef(function (t, e) {
                    var r = t.components,
                        n = t.mdxType,
                        o = t.originalType,
                        u = t.parentName,
                        l = i(t, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        m = c(r),
                        d = n,
                        f = m["".concat(u, ".").concat(d)] || m[d] || p[d] || o
                    return r
                        ? a.createElement(
                              f,
                              s(s({ ref: e }, l), {}, { components: r })
                          )
                        : a.createElement(f, s({ ref: e }, l))
                })
            function d(t, e) {
                var r = arguments,
                    n = e && e.mdxType
                if ("string" == typeof t || n) {
                    var o = r.length,
                        s = new Array(o)
                    s[0] = m
                    var i = {}
                    for (var u in e) hasOwnProperty.call(e, u) && (i[u] = e[u])
                    ;(i.originalType = t),
                        (i.mdxType = "string" == typeof t ? t : n),
                        (s[1] = i)
                    for (var c = 2; c < o; c++) s[c] = r[c]
                    return a.createElement.apply(null, s)
                }
                return a.createElement.apply(null, r)
            }
            m.displayName = "MDXCreateElement"
        },
        7958: (t, e, r) => {
            r.r(e),
                r.d(e, {
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
                u = Object.prototype.hasOwnProperty,
                c = Object.prototype.propertyIsEnumerable,
                l = (t, e, r) =>
                    e in t
                        ? n(t, e, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (t[e] = r),
                p = (t, e) => {
                    for (var r in e || (e = {})) u.call(e, r) && l(t, r, e[r])
                    if (i) for (var r of i(e)) c.call(e, r) && l(t, r, e[r])
                    return t
                }
            const m = { sidebar_position: 6 },
                d = "Congratulations!",
                f = {
                    unversionedId: "state/tutorial-basics/congratulations",
                    id: "state/tutorial-basics/congratulations",
                    title: "Congratulations!",
                    description:
                        "You have just learned the basics of Docusaurus and made some changes to the initial template.",
                    source: "@site/docs/state/tutorial-basics/congratulations.md",
                    sourceDirName: "state/tutorial-basics",
                    slug: "/state/tutorial-basics/congratulations",
                    permalink: "/docs/state/tutorial-basics/congratulations",
                    editUrl:
                        "https://github.com/re-do/re-po/edit/main/pkgs/docs/docs/state/tutorial-basics/congratulations.md",
                    tags: [],
                    version: "current",
                    sidebarPosition: 6,
                    frontMatter: { sidebar_position: 6 },
                    sidebar: "state",
                    previous: {
                        title: "Deploy your site",
                        permalink:
                            "/docs/state/tutorial-basics/deploy-your-site"
                    },
                    next: {
                        title: "Manage Docs Versions",
                        permalink:
                            "/docs/state/tutorial-extras/manage-docs-versions"
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
            function h(t) {
                var e,
                    r = t,
                    { components: n } = r,
                    l = ((t, e) => {
                        var r = {}
                        for (var a in t)
                            u.call(t, a) && e.indexOf(a) < 0 && (r[a] = t[a])
                        if (null != t && i)
                            for (var a of i(t))
                                e.indexOf(a) < 0 &&
                                    c.call(t, a) &&
                                    (r[a] = t[a])
                        return r
                    })(r, ["components"])
                return (0, a.kt)(
                    "wrapper",
                    ((e = p(p({}, b), l)),
                    o(e, s({ components: n, mdxType: "MDXLayout" }))),
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
                                        href: "/docs/state/tutorial-extras/manage-docs-versions"
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
                                        href: "/docs/state/tutorial-extras/translate-your-site"
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
