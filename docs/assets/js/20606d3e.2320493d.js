"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [262],
    {
        6383: (e, t, n) => {
            n.d(t, { Zo: () => c, kt: () => m })
            var r = n(1672)
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
            var l = r.createContext({}),
                d = function (e) {
                    var t = r.useContext(l),
                        n = t
                    return (
                        e &&
                            (n =
                                "function" == typeof e ? e(t) : i(i({}, t), e)),
                        n
                    )
                },
                c = function (e) {
                    var t = d(e.components)
                    return r.createElement(l.Provider, { value: t }, e.children)
                },
                p = {
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
                        l = e.parentName,
                        c = s(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        u = d(n),
                        m = o,
                        f = u["".concat(l, ".").concat(m)] || u[m] || p[m] || a
                    return n
                        ? r.createElement(
                              f,
                              i(i({ ref: t }, c), {}, { components: n })
                          )
                        : r.createElement(f, i({ ref: t }, c))
                })
            function m(e, t) {
                var n = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var a = n.length,
                        i = new Array(a)
                    i[0] = u
                    var s = {}
                    for (var l in t) hasOwnProperty.call(t, l) && (s[l] = t[l])
                    ;(s.originalType = e),
                        (s.mdxType = "string" == typeof e ? e : o),
                        (i[1] = s)
                    for (var d = 2; d < a; d++) i[d] = n[d]
                    return r.createElement.apply(null, i)
                }
                return r.createElement.apply(null, n)
            }
            u.displayName = "MDXCreateElement"
        },
        7240: (e, t, n) => {
            n.r(t),
                n.d(t, {
                    frontMatter: () => u,
                    contentTitle: () => m,
                    metadata: () => f,
                    toc: () => v,
                    default: () => h
                })
            var r = n(6383),
                o = Object.defineProperty,
                a = Object.defineProperties,
                i = Object.getOwnPropertyDescriptors,
                s = Object.getOwnPropertySymbols,
                l = Object.prototype.hasOwnProperty,
                d = Object.prototype.propertyIsEnumerable,
                c = (e, t, n) =>
                    t in e
                        ? o(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: n
                          })
                        : (e[t] = n),
                p = (e, t) => {
                    for (var n in t || (t = {})) l.call(t, n) && c(e, n, t[n])
                    if (s) for (var n of s(t)) d.call(t, n) && c(e, n, t[n])
                    return e
                }
            const u = { sidebar_position: 1 },
                m = "Manage Docs Versions",
                f = {
                    unversionedId: "model/tutorial-extras/manage-docs-versions",
                    id: "model/tutorial-extras/manage-docs-versions",
                    title: "Manage Docs Versions",
                    description:
                        "Docusaurus can manage multiple versions of your docs.",
                    source: "@site/docs/model/tutorial-extras/manage-docs-versions.md",
                    sourceDirName: "model/tutorial-extras",
                    slug: "/model/tutorial-extras/manage-docs-versions",
                    permalink:
                        "/docs/model/tutorial-extras/manage-docs-versions",
                    editUrl:
                        "https://github.com/re-do/re-po/edit/main/pkgs/docs/docs/model/tutorial-extras/manage-docs-versions.md",
                    tags: [],
                    version: "current",
                    sidebarPosition: 1,
                    frontMatter: { sidebar_position: 1 },
                    sidebar: "model",
                    previous: {
                        title: "Congratulations!",
                        permalink: "/docs/model/tutorial-basics/congratulations"
                    },
                    next: {
                        title: "Translate your site",
                        permalink:
                            "/docs/model/tutorial-extras/translate-your-site"
                    }
                },
                v = [
                    {
                        value: "Create a docs version",
                        id: "create-a-docs-version",
                        children: [],
                        level: 2
                    },
                    {
                        value: "Add a Version Dropdown",
                        id: "add-a-version-dropdown",
                        children: [],
                        level: 2
                    },
                    {
                        value: "Update an existing version",
                        id: "update-an-existing-version",
                        children: [],
                        level: 2
                    }
                ],
                g = { toc: v }
            function h(e) {
                var t,
                    o = e,
                    { components: c } = o,
                    u = ((e, t) => {
                        var n = {}
                        for (var r in e)
                            l.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r])
                        if (null != e && s)
                            for (var r of s(e))
                                t.indexOf(r) < 0 &&
                                    d.call(e, r) &&
                                    (n[r] = e[r])
                        return n
                    })(o, ["components"])
                return (0, r.kt)(
                    "wrapper",
                    ((t = p(p({}, g), u)),
                    a(t, i({ components: c, mdxType: "MDXLayout" }))),
                    (0, r.kt)(
                        "h1",
                        p({}, { id: "manage-docs-versions" }),
                        "Manage Docs Versions"
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "Docusaurus can manage multiple versions of your docs."
                    ),
                    (0, r.kt)(
                        "h2",
                        p({}, { id: "create-a-docs-version" }),
                        "Create a docs version"
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "Release a version 1.0 of your project:"
                    ),
                    (0, r.kt)(
                        "pre",
                        null,
                        (0, r.kt)(
                            "code",
                            p(
                                { parentName: "pre" },
                                { className: "language-bash" }
                            ),
                            "npm run docusaurus docs:version 1.0\n"
                        )
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "The ",
                        (0, r.kt)("inlineCode", { parentName: "p" }, "docs"),
                        " folder is copied into ",
                        (0, r.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "versioned_docs/version-1.0"
                        ),
                        " and ",
                        (0, r.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "versions.json"
                        ),
                        " is created."
                    ),
                    (0, r.kt)("p", null, "Your docs now have 2 versions:"),
                    (0, r.kt)(
                        "ul",
                        null,
                        (0, r.kt)(
                            "li",
                            { parentName: "ul" },
                            (0, r.kt)(
                                "inlineCode",
                                { parentName: "li" },
                                "1.0"
                            ),
                            " at ",
                            (0, r.kt)(
                                "inlineCode",
                                { parentName: "li" },
                                "http://localhost:3000/docs/"
                            ),
                            " for the version 1.0 docs"
                        ),
                        (0, r.kt)(
                            "li",
                            { parentName: "ul" },
                            (0, r.kt)(
                                "inlineCode",
                                { parentName: "li" },
                                "current"
                            ),
                            " at ",
                            (0, r.kt)(
                                "inlineCode",
                                { parentName: "li" },
                                "http://localhost:3000/docs/next/"
                            ),
                            " for the ",
                            (0, r.kt)(
                                "strong",
                                { parentName: "li" },
                                "upcoming, unreleased docs"
                            )
                        )
                    ),
                    (0, r.kt)(
                        "h2",
                        p({}, { id: "add-a-version-dropdown" }),
                        "Add a Version Dropdown"
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "To navigate seamlessly across versions, add a version dropdown."
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "Modify the ",
                        (0, r.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "docusaurus.config.js"
                        ),
                        " file:"
                    ),
                    (0, r.kt)(
                        "pre",
                        null,
                        (0, r.kt)(
                            "code",
                            p(
                                { parentName: "pre" },
                                {
                                    className: "language-js",
                                    metastring: 'title="docusaurus.config.js"',
                                    title: '"docusaurus.config.js"'
                                }
                            ),
                            'module.exports = {\n    themeConfig: {\n        navbar: {\n            items: [\n                // highlight-start\n                {\n                    type: "docsVersionDropdown"\n                }\n                // highlight-end\n            ]\n        }\n    }\n}\n'
                        )
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "The docs version dropdown appears in your navbar:"
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        (0, r.kt)("img", {
                            alt: "Docs Version Dropdown",
                            src: n(8773).Z,
                            width: "494",
                            height: "276"
                        })
                    ),
                    (0, r.kt)(
                        "h2",
                        p({}, { id: "update-an-existing-version" }),
                        "Update an existing version"
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "It is possible to edit versioned docs in their respective folder:"
                    ),
                    (0, r.kt)(
                        "ul",
                        null,
                        (0, r.kt)(
                            "li",
                            { parentName: "ul" },
                            (0, r.kt)(
                                "inlineCode",
                                { parentName: "li" },
                                "versioned_docs/version-1.0/hello.md"
                            ),
                            " updates ",
                            (0, r.kt)(
                                "inlineCode",
                                { parentName: "li" },
                                "http://localhost:3000/docs/hello"
                            )
                        ),
                        (0, r.kt)(
                            "li",
                            { parentName: "ul" },
                            (0, r.kt)(
                                "inlineCode",
                                { parentName: "li" },
                                "docs/hello.md"
                            ),
                            " updates ",
                            (0, r.kt)(
                                "inlineCode",
                                { parentName: "li" },
                                "http://localhost:3000/docs/next/hello"
                            )
                        )
                    )
                )
            }
            h.isMDXComponent = !0
        },
        8773: (e, t, n) => {
            n.d(t, { Z: () => r })
            const r =
                n.p +
                "assets/images/docsVersionDropdown-dda80f009a926fb2dd92bab8faa6c4d8.png"
        }
    }
])
