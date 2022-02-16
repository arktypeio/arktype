"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [886],
    {
        6383: (e, t, r) => {
            r.d(t, { Zo: () => u, kt: () => y })
            var o = r(1672)
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
            function a(e, t) {
                var r = Object.keys(e)
                if (Object.getOwnPropertySymbols) {
                    var o = Object.getOwnPropertySymbols(e)
                    t &&
                        (o = o.filter(function (t) {
                            return Object.getOwnPropertyDescriptor(
                                e,
                                t
                            ).enumerable
                        })),
                        r.push.apply(r, o)
                }
                return r
            }
            function l(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var r = null != arguments[t] ? arguments[t] : {}
                    t % 2
                        ? a(Object(r), !0).forEach(function (t) {
                              n(e, t, r[t])
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
            function i(e, t) {
                if (null == e) return {}
                var r,
                    o,
                    n = (function (e, t) {
                        if (null == e) return {}
                        var r,
                            o,
                            n = {},
                            a = Object.keys(e)
                        for (o = 0; o < a.length; o++)
                            (r = a[o]), t.indexOf(r) >= 0 || (n[r] = e[r])
                        return n
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var a = Object.getOwnPropertySymbols(e)
                    for (o = 0; o < a.length; o++)
                        (r = a[o]),
                            t.indexOf(r) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    r
                                ) &&
                                    (n[r] = e[r]))
                }
                return n
            }
            var s = o.createContext({}),
                p = function (e) {
                    var t = o.useContext(s),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : l(l({}, t), e)),
                        r
                    )
                },
                u = function (e) {
                    var t = p(e.components)
                    return o.createElement(s.Provider, { value: t }, e.children)
                },
                c = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return o.createElement(o.Fragment, {}, t)
                    }
                },
                d = o.forwardRef(function (e, t) {
                    var r = e.components,
                        n = e.mdxType,
                        a = e.originalType,
                        s = e.parentName,
                        u = i(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        d = p(r),
                        y = n,
                        m = d["".concat(s, ".").concat(y)] || d[y] || c[y] || a
                    return r
                        ? o.createElement(
                              m,
                              l(l({ ref: t }, u), {}, { components: r })
                          )
                        : o.createElement(m, l({ ref: t }, u))
                })
            function y(e, t) {
                var r = arguments,
                    n = t && t.mdxType
                if ("string" == typeof e || n) {
                    var a = r.length,
                        l = new Array(a)
                    l[0] = d
                    var i = {}
                    for (var s in t) hasOwnProperty.call(t, s) && (i[s] = t[s])
                    ;(i.originalType = e),
                        (i.mdxType = "string" == typeof e ? e : n),
                        (l[1] = i)
                    for (var p = 2; p < a; p++) l[p] = r[p]
                    return o.createElement.apply(null, l)
                }
                return o.createElement.apply(null, r)
            }
            d.displayName = "MDXCreateElement"
        },
        6978: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    frontMatter: () => d,
                    contentTitle: () => y,
                    metadata: () => m,
                    toc: () => f,
                    default: () => g
                })
            var o = r(6383),
                n = Object.defineProperty,
                a = Object.defineProperties,
                l = Object.getOwnPropertyDescriptors,
                i = Object.getOwnPropertySymbols,
                s = Object.prototype.hasOwnProperty,
                p = Object.prototype.propertyIsEnumerable,
                u = (e, t, r) =>
                    t in e
                        ? n(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                c = (e, t) => {
                    for (var r in t || (t = {})) s.call(t, r) && u(e, r, t[r])
                    if (i) for (var r of i(t)) p.call(t, r) && u(e, r, t[r])
                    return e
                }
            const d = { sidebar_position: 5 },
                y = "Deploy your site",
                m = {
                    unversionedId: "model/tutorial-basics/deploy-your-site",
                    id: "model/tutorial-basics/deploy-your-site",
                    title: "Deploy your site",
                    description:
                        "Docusaurus is a static-site-generator (also called Jamstack).",
                    source: "@site/docs/model/tutorial-basics/deploy-your-site.md",
                    sourceDirName: "model/tutorial-basics",
                    slug: "/model/tutorial-basics/deploy-your-site",
                    permalink: "/docs/model/tutorial-basics/deploy-your-site",
                    editUrl:
                        "https://github.com/re-do/re-po/edit/main/pkgs/docs/docs/model/tutorial-basics/deploy-your-site.md",
                    tags: [],
                    version: "current",
                    sidebarPosition: 5,
                    frontMatter: { sidebar_position: 5 },
                    sidebar: "model",
                    previous: {
                        title: "Markdown Features",
                        permalink:
                            "/docs/model/tutorial-basics/markdown-features"
                    },
                    next: {
                        title: "Congratulations!",
                        permalink: "/docs/model/tutorial-basics/congratulations"
                    }
                },
                f = [
                    {
                        value: "Build your site",
                        id: "build-your-site",
                        children: [],
                        level: 2
                    },
                    {
                        value: "Deploy your site",
                        id: "deploy-your-site-1",
                        children: [],
                        level: 2
                    }
                ],
                b = { toc: f }
            function g(e) {
                var t,
                    r = e,
                    { components: n } = r,
                    u = ((e, t) => {
                        var r = {}
                        for (var o in e)
                            s.call(e, o) && t.indexOf(o) < 0 && (r[o] = e[o])
                        if (null != e && i)
                            for (var o of i(e))
                                t.indexOf(o) < 0 &&
                                    p.call(e, o) &&
                                    (r[o] = e[o])
                        return r
                    })(r, ["components"])
                return (0, o.kt)(
                    "wrapper",
                    ((t = c(c({}, b), u)),
                    a(t, l({ components: n, mdxType: "MDXLayout" }))),
                    (0, o.kt)(
                        "h1",
                        c({}, { id: "deploy-your-site" }),
                        "Deploy your site"
                    ),
                    (0, o.kt)(
                        "p",
                        null,
                        "Docusaurus is a ",
                        (0, o.kt)(
                            "strong",
                            { parentName: "p" },
                            "static-site-generator"
                        ),
                        " (also called ",
                        (0, o.kt)(
                            "strong",
                            { parentName: "p" },
                            (0, o.kt)(
                                "a",
                                c(
                                    { parentName: "strong" },
                                    { href: "https://jamstack.org/" }
                                ),
                                "Jamstack"
                            )
                        ),
                        ")."
                    ),
                    (0, o.kt)(
                        "p",
                        null,
                        "It builds your site as simple ",
                        (0, o.kt)(
                            "strong",
                            { parentName: "p" },
                            "static HTML, JavaScript and CSS files"
                        ),
                        "."
                    ),
                    (0, o.kt)(
                        "h2",
                        c({}, { id: "build-your-site" }),
                        "Build your site"
                    ),
                    (0, o.kt)(
                        "p",
                        null,
                        "Build your site ",
                        (0, o.kt)(
                            "strong",
                            { parentName: "p" },
                            "for production"
                        ),
                        ":"
                    ),
                    (0, o.kt)(
                        "pre",
                        null,
                        (0, o.kt)(
                            "code",
                            c(
                                { parentName: "pre" },
                                { className: "language-bash" }
                            ),
                            "npm run build\n"
                        )
                    ),
                    (0, o.kt)(
                        "p",
                        null,
                        "The static files are generated in the ",
                        (0, o.kt)("inlineCode", { parentName: "p" }, "build"),
                        " folder."
                    ),
                    (0, o.kt)(
                        "h2",
                        c({}, { id: "deploy-your-site-1" }),
                        "Deploy your site"
                    ),
                    (0, o.kt)("p", null, "Test your production build locally:"),
                    (0, o.kt)(
                        "pre",
                        null,
                        (0, o.kt)(
                            "code",
                            c(
                                { parentName: "pre" },
                                { className: "language-bash" }
                            ),
                            "npm run serve\n"
                        )
                    ),
                    (0, o.kt)(
                        "p",
                        null,
                        "The ",
                        (0, o.kt)("inlineCode", { parentName: "p" }, "build"),
                        " folder is now served at ",
                        (0, o.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "http://localhost:3000/"
                        ),
                        "."
                    ),
                    (0, o.kt)(
                        "p",
                        null,
                        "You can now deploy the ",
                        (0, o.kt)("inlineCode", { parentName: "p" }, "build"),
                        " folder ",
                        (0, o.kt)(
                            "strong",
                            { parentName: "p" },
                            "almost anywhere"
                        ),
                        " easily, ",
                        (0, o.kt)("strong", { parentName: "p" }, "for free"),
                        " or very small cost (read the ",
                        (0, o.kt)(
                            "strong",
                            { parentName: "p" },
                            (0, o.kt)(
                                "a",
                                c(
                                    { parentName: "strong" },
                                    {
                                        href: "https://docusaurus.io/docs/deployment"
                                    }
                                ),
                                "Deployment Guide"
                            )
                        ),
                        ")."
                    )
                )
            }
            g.isMDXComponent = !0
        }
    }
])
