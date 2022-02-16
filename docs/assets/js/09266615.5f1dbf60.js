"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [948],
    {
        6383: (e, t, r) => {
            r.d(t, { Zo: () => p, kt: () => b })
            var a = r(1672)
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
            function n(e, t) {
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
                        ? n(Object(r), !0).forEach(function (t) {
                              o(e, t, r[t])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(r)
                          )
                        : n(Object(r)).forEach(function (t) {
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
                    o = (function (e, t) {
                        if (null == e) return {}
                        var r,
                            a,
                            o = {},
                            n = Object.keys(e)
                        for (a = 0; a < n.length; a++)
                            (r = n[a]), t.indexOf(r) >= 0 || (o[r] = e[r])
                        return o
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var n = Object.getOwnPropertySymbols(e)
                    for (a = 0; a < n.length; a++)
                        (r = n[a]),
                            t.indexOf(r) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    r
                                ) &&
                                    (o[r] = e[r]))
                }
                return o
            }
            var l = a.createContext({}),
                c = function (e) {
                    var t = a.useContext(l),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : s(s({}, t), e)),
                        r
                    )
                },
                p = function (e) {
                    var t = c(e.components)
                    return a.createElement(l.Provider, { value: t }, e.children)
                },
                u = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return a.createElement(a.Fragment, {}, t)
                    }
                },
                g = a.forwardRef(function (e, t) {
                    var r = e.components,
                        o = e.mdxType,
                        n = e.originalType,
                        l = e.parentName,
                        p = i(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        g = c(r),
                        b = o,
                        f = g["".concat(l, ".").concat(b)] || g[b] || u[b] || n
                    return r
                        ? a.createElement(
                              f,
                              s(s({ ref: t }, p), {}, { components: r })
                          )
                        : a.createElement(f, s({ ref: t }, p))
                })
            function b(e, t) {
                var r = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var n = r.length,
                        s = new Array(n)
                    s[0] = g
                    var i = {}
                    for (var l in t) hasOwnProperty.call(t, l) && (i[l] = t[l])
                    ;(i.originalType = e),
                        (i.mdxType = "string" == typeof e ? e : o),
                        (s[1] = i)
                    for (var c = 2; c < n; c++) s[c] = r[c]
                    return a.createElement.apply(null, s)
                }
                return a.createElement.apply(null, r)
            }
            g.displayName = "MDXCreateElement"
        },
        2634: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    frontMatter: () => g,
                    contentTitle: () => b,
                    metadata: () => f,
                    toc: () => m,
                    default: () => y
                })
            var a = r(6383),
                o = Object.defineProperty,
                n = Object.defineProperties,
                s = Object.getOwnPropertyDescriptors,
                i = Object.getOwnPropertySymbols,
                l = Object.prototype.hasOwnProperty,
                c = Object.prototype.propertyIsEnumerable,
                p = (e, t, r) =>
                    t in e
                        ? o(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                u = (e, t) => {
                    for (var r in t || (t = {})) l.call(t, r) && p(e, r, t[r])
                    if (i) for (var r of i(t)) c.call(t, r) && p(e, r, t[r])
                    return e
                }
            const g = { sidebar_position: 3 },
                b = "Create a Blog Post",
                f = {
                    unversionedId: "state/tutorial-basics/create-a-blog-post",
                    id: "state/tutorial-basics/create-a-blog-post",
                    title: "Create a Blog Post",
                    description:
                        "Docusaurus creates a page for each blog post, but also a blog index page, a tag system, an RSS feed...",
                    source: "@site/docs/state/tutorial-basics/create-a-blog-post.md",
                    sourceDirName: "state/tutorial-basics",
                    slug: "/state/tutorial-basics/create-a-blog-post",
                    permalink: "/docs/state/tutorial-basics/create-a-blog-post",
                    editUrl:
                        "https://github.com/re-do/re-po/edit/main/pkgs/docs/docs/state/tutorial-basics/create-a-blog-post.md",
                    tags: [],
                    version: "current",
                    sidebarPosition: 3,
                    frontMatter: { sidebar_position: 3 },
                    sidebar: "state",
                    previous: {
                        title: "Create a Document",
                        permalink:
                            "/docs/state/tutorial-basics/create-a-document"
                    },
                    next: {
                        title: "Markdown Features",
                        permalink:
                            "/docs/state/tutorial-basics/markdown-features"
                    }
                },
                m = [
                    {
                        value: "Create your first Post",
                        id: "create-your-first-post",
                        children: [],
                        level: 2
                    }
                ],
                d = { toc: m }
            function y(e) {
                var t,
                    r = e,
                    { components: o } = r,
                    p = ((e, t) => {
                        var r = {}
                        for (var a in e)
                            l.call(e, a) && t.indexOf(a) < 0 && (r[a] = e[a])
                        if (null != e && i)
                            for (var a of i(e))
                                t.indexOf(a) < 0 &&
                                    c.call(e, a) &&
                                    (r[a] = e[a])
                        return r
                    })(r, ["components"])
                return (0, a.kt)(
                    "wrapper",
                    ((t = u(u({}, d), p)),
                    n(t, s({ components: o, mdxType: "MDXLayout" }))),
                    (0, a.kt)(
                        "h1",
                        u({}, { id: "create-a-blog-post" }),
                        "Create a Blog Post"
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "Docusaurus creates a ",
                        (0, a.kt)(
                            "strong",
                            { parentName: "p" },
                            "page for each blog post"
                        ),
                        ", but also a ",
                        (0, a.kt)(
                            "strong",
                            { parentName: "p" },
                            "blog index page"
                        ),
                        ", a ",
                        (0, a.kt)("strong", { parentName: "p" }, "tag system"),
                        ", an ",
                        (0, a.kt)("strong", { parentName: "p" }, "RSS"),
                        " feed..."
                    ),
                    (0, a.kt)(
                        "h2",
                        u({}, { id: "create-your-first-post" }),
                        "Create your first Post"
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "Create a file at ",
                        (0, a.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "blog/2021-02-28-greetings.md"
                        ),
                        ":"
                    ),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            u(
                                { parentName: "pre" },
                                {
                                    className: "language-md",
                                    metastring:
                                        'title="blog/2021-02-28-greetings.md"',
                                    title: '"blog/2021-02-28-greetings.md"'
                                }
                            ),
                            "---\nslug: greetings\ntitle: Greetings!\nauthors:\n    - name: Joel Marcey\n      title: Co-creator of Docusaurus 1\n      url: https://github.com/JoelMarcey\n      image_url: https://github.com/JoelMarcey.png\n    - name: S\xe9bastien Lorber\n      title: Docusaurus maintainer\n      url: https://sebastienlorber.com\n      image_url: https://github.com/slorber.png\ntags: [greetings]\n---\n\nCongratulations, you have made your first post!\n\nFeel free to play around and edit this post as much you like.\n"
                        )
                    ),
                    (0, a.kt)(
                        "p",
                        null,
                        "A new blog post is now available at ",
                        (0, a.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "http://localhost:3000/blog/greetings"
                        ),
                        "."
                    )
                )
            }
            y.isMDXComponent = !0
        }
    }
])
