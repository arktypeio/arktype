"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [541],
    {
        6383: (e, t, r) => {
            r.d(t, { Zo: () => p, kt: () => b })
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
            function s(e) {
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
            var l = o.createContext({}),
                c = function (e) {
                    var t = o.useContext(l),
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
                    return o.createElement(l.Provider, { value: t }, e.children)
                },
                u = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return o.createElement(o.Fragment, {}, t)
                    }
                },
                g = o.forwardRef(function (e, t) {
                    var r = e.components,
                        n = e.mdxType,
                        a = e.originalType,
                        l = e.parentName,
                        p = i(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        g = c(r),
                        b = n,
                        f = g["".concat(l, ".").concat(b)] || g[b] || u[b] || a
                    return r
                        ? o.createElement(
                              f,
                              s(s({ ref: t }, p), {}, { components: r })
                          )
                        : o.createElement(f, s({ ref: t }, p))
                })
            function b(e, t) {
                var r = arguments,
                    n = t && t.mdxType
                if ("string" == typeof e || n) {
                    var a = r.length,
                        s = new Array(a)
                    s[0] = g
                    var i = {}
                    for (var l in t) hasOwnProperty.call(t, l) && (i[l] = t[l])
                    ;(i.originalType = e),
                        (i.mdxType = "string" == typeof e ? e : n),
                        (s[1] = i)
                    for (var c = 2; c < a; c++) s[c] = r[c]
                    return o.createElement.apply(null, s)
                }
                return o.createElement.apply(null, r)
            }
            g.displayName = "MDXCreateElement"
        },
        6787: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    frontMatter: () => g,
                    contentTitle: () => b,
                    metadata: () => f,
                    toc: () => m,
                    default: () => y
                })
            var o = r(6383),
                n = Object.defineProperty,
                a = Object.defineProperties,
                s = Object.getOwnPropertyDescriptors,
                i = Object.getOwnPropertySymbols,
                l = Object.prototype.hasOwnProperty,
                c = Object.prototype.propertyIsEnumerable,
                p = (e, t, r) =>
                    t in e
                        ? n(e, t, {
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
                    unversionedId: "test/tutorial-basics/create-a-blog-post",
                    id: "test/tutorial-basics/create-a-blog-post",
                    title: "Create a Blog Post",
                    description:
                        "Docusaurus creates a page for each blog post, but also a blog index page, a tag system, an RSS feed...",
                    source: "@site/docs/test/tutorial-basics/create-a-blog-post.md",
                    sourceDirName: "test/tutorial-basics",
                    slug: "/test/tutorial-basics/create-a-blog-post",
                    permalink: "/docs/test/tutorial-basics/create-a-blog-post",
                    editUrl:
                        "https://github.com/re-do/re-po/edit/main/pkgs/docs/docs/test/tutorial-basics/create-a-blog-post.md",
                    tags: [],
                    version: "current",
                    sidebarPosition: 3,
                    frontMatter: { sidebar_position: 3 },
                    sidebar: "test",
                    previous: {
                        title: "Create a Document",
                        permalink:
                            "/docs/test/tutorial-basics/create-a-document"
                    },
                    next: {
                        title: "Markdown Features",
                        permalink:
                            "/docs/test/tutorial-basics/markdown-features"
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
                    { components: n } = r,
                    p = ((e, t) => {
                        var r = {}
                        for (var o in e)
                            l.call(e, o) && t.indexOf(o) < 0 && (r[o] = e[o])
                        if (null != e && i)
                            for (var o of i(e))
                                t.indexOf(o) < 0 &&
                                    c.call(e, o) &&
                                    (r[o] = e[o])
                        return r
                    })(r, ["components"])
                return (0, o.kt)(
                    "wrapper",
                    ((t = u(u({}, d), p)),
                    a(t, s({ components: n, mdxType: "MDXLayout" }))),
                    (0, o.kt)(
                        "h1",
                        u({}, { id: "create-a-blog-post" }),
                        "Create a Blog Post"
                    ),
                    (0, o.kt)(
                        "p",
                        null,
                        "Docusaurus creates a ",
                        (0, o.kt)(
                            "strong",
                            { parentName: "p" },
                            "page for each blog post"
                        ),
                        ", but also a ",
                        (0, o.kt)(
                            "strong",
                            { parentName: "p" },
                            "blog index page"
                        ),
                        ", a ",
                        (0, o.kt)("strong", { parentName: "p" }, "tag system"),
                        ", an ",
                        (0, o.kt)("strong", { parentName: "p" }, "RSS"),
                        " feed..."
                    ),
                    (0, o.kt)(
                        "h2",
                        u({}, { id: "create-your-first-post" }),
                        "Create your first Post"
                    ),
                    (0, o.kt)(
                        "p",
                        null,
                        "Create a file at ",
                        (0, o.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "blog/2021-02-28-greetings.md"
                        ),
                        ":"
                    ),
                    (0, o.kt)(
                        "pre",
                        null,
                        (0, o.kt)(
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
                    (0, o.kt)(
                        "p",
                        null,
                        "A new blog post is now available at ",
                        (0, o.kt)(
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
