"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [898],
    {
        6383: (e, t, n) => {
            n.d(t, { Zo: () => d, kt: () => m })
            var r = n(1672)
            function a(e, t, n) {
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
            function o(e, t) {
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
            function l(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var n = null != arguments[t] ? arguments[t] : {}
                    t % 2
                        ? o(Object(n), !0).forEach(function (t) {
                              a(e, t, n[t])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(n)
                          )
                        : o(Object(n)).forEach(function (t) {
                              Object.defineProperty(
                                  e,
                                  t,
                                  Object.getOwnPropertyDescriptor(n, t)
                              )
                          })
                }
                return e
            }
            function i(e, t) {
                if (null == e) return {}
                var n,
                    r,
                    a = (function (e, t) {
                        if (null == e) return {}
                        var n,
                            r,
                            a = {},
                            o = Object.keys(e)
                        for (r = 0; r < o.length; r++)
                            (n = o[r]), t.indexOf(n) >= 0 || (a[n] = e[n])
                        return a
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var o = Object.getOwnPropertySymbols(e)
                    for (r = 0; r < o.length; r++)
                        (n = o[r]),
                            t.indexOf(n) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    n
                                ) &&
                                    (a[n] = e[n]))
                }
                return a
            }
            var s = r.createContext({}),
                c = function (e) {
                    var t = r.useContext(s),
                        n = t
                    return (
                        e &&
                            (n =
                                "function" == typeof e ? e(t) : l(l({}, t), e)),
                        n
                    )
                },
                d = function (e) {
                    var t = c(e.components)
                    return r.createElement(s.Provider, { value: t }, e.children)
                },
                u = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return r.createElement(r.Fragment, {}, t)
                    }
                },
                p = r.forwardRef(function (e, t) {
                    var n = e.components,
                        a = e.mdxType,
                        o = e.originalType,
                        s = e.parentName,
                        d = i(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        p = c(n),
                        m = a,
                        f = p["".concat(s, ".").concat(m)] || p[m] || u[m] || o
                    return n
                        ? r.createElement(
                              f,
                              l(l({ ref: t }, d), {}, { components: n })
                          )
                        : r.createElement(f, l({ ref: t }, d))
                })
            function m(e, t) {
                var n = arguments,
                    a = t && t.mdxType
                if ("string" == typeof e || a) {
                    var o = n.length,
                        l = new Array(o)
                    l[0] = p
                    var i = {}
                    for (var s in t) hasOwnProperty.call(t, s) && (i[s] = t[s])
                    ;(i.originalType = e),
                        (i.mdxType = "string" == typeof e ? e : a),
                        (l[1] = i)
                    for (var c = 2; c < o; c++) l[c] = n[c]
                    return r.createElement.apply(null, l)
                }
                return r.createElement.apply(null, n)
            }
            p.displayName = "MDXCreateElement"
        },
        5442: (e, t, n) => {
            n.r(t),
                n.d(t, {
                    frontMatter: () => p,
                    contentTitle: () => m,
                    metadata: () => f,
                    toc: () => g,
                    default: () => h
                })
            var r = n(6383),
                a = Object.defineProperty,
                o = Object.defineProperties,
                l = Object.getOwnPropertyDescriptors,
                i = Object.getOwnPropertySymbols,
                s = Object.prototype.hasOwnProperty,
                c = Object.prototype.propertyIsEnumerable,
                d = (e, t, n) =>
                    t in e
                        ? a(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: n
                          })
                        : (e[t] = n),
                u = (e, t) => {
                    for (var n in t || (t = {})) s.call(t, n) && d(e, n, t[n])
                    if (i) for (var n of i(t)) c.call(t, n) && d(e, n, t[n])
                    return e
                }
            const p = { sidebar_position: 2 },
                m = "Translate your site",
                f = {
                    unversionedId: "model/tutorial-extras/translate-your-site",
                    id: "model/tutorial-extras/translate-your-site",
                    title: "Translate your site",
                    description: "Let's translate docs/intro.md to French.",
                    source: "@site/docs/model/tutorial-extras/translate-your-site.md",
                    sourceDirName: "model/tutorial-extras",
                    slug: "/model/tutorial-extras/translate-your-site",
                    permalink:
                        "/docs/model/tutorial-extras/translate-your-site",
                    editUrl:
                        "https://github.com/re-do/re-po/edit/main/pkgs/docs/docs/model/tutorial-extras/translate-your-site.md",
                    tags: [],
                    version: "current",
                    sidebarPosition: 2,
                    frontMatter: { sidebar_position: 2 },
                    sidebar: "model",
                    previous: {
                        title: "Manage Docs Versions",
                        permalink:
                            "/docs/model/tutorial-extras/manage-docs-versions"
                    }
                },
                g = [
                    {
                        value: "Configure i18n",
                        id: "configure-i18n",
                        children: [],
                        level: 2
                    },
                    {
                        value: "Translate a doc",
                        id: "translate-a-doc",
                        children: [],
                        level: 2
                    },
                    {
                        value: "Start your localized site",
                        id: "start-your-localized-site",
                        children: [],
                        level: 2
                    },
                    {
                        value: "Add a Locale Dropdown",
                        id: "add-a-locale-dropdown",
                        children: [],
                        level: 2
                    },
                    {
                        value: "Build your localized site",
                        id: "build-your-localized-site",
                        children: [],
                        level: 2
                    }
                ],
                y = { toc: g }
            function h(e) {
                var t,
                    a = e,
                    { components: d } = a,
                    p = ((e, t) => {
                        var n = {}
                        for (var r in e)
                            s.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r])
                        if (null != e && i)
                            for (var r of i(e))
                                t.indexOf(r) < 0 &&
                                    c.call(e, r) &&
                                    (n[r] = e[r])
                        return n
                    })(a, ["components"])
                return (0, r.kt)(
                    "wrapper",
                    ((t = u(u({}, y), p)),
                    o(t, l({ components: d, mdxType: "MDXLayout" }))),
                    (0, r.kt)(
                        "h1",
                        u({}, { id: "translate-your-site" }),
                        "Translate your site"
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "Let's translate ",
                        (0, r.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "docs/intro.md"
                        ),
                        " to French."
                    ),
                    (0, r.kt)(
                        "h2",
                        u({}, { id: "configure-i18n" }),
                        "Configure i18n"
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "Modify ",
                        (0, r.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "docusaurus.config.js"
                        ),
                        " to add support for the ",
                        (0, r.kt)("inlineCode", { parentName: "p" }, "fr"),
                        " locale:"
                    ),
                    (0, r.kt)(
                        "pre",
                        null,
                        (0, r.kt)(
                            "code",
                            u(
                                { parentName: "pre" },
                                {
                                    className: "language-js",
                                    metastring: 'title="docusaurus.config.js"',
                                    title: '"docusaurus.config.js"'
                                }
                            ),
                            'module.exports = {\n    i18n: {\n        defaultLocale: "en",\n        locales: ["en", "fr"]\n    }\n}\n'
                        )
                    ),
                    (0, r.kt)(
                        "h2",
                        u({}, { id: "translate-a-doc" }),
                        "Translate a doc"
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "Copy the ",
                        (0, r.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "docs/intro.md"
                        ),
                        " file to the ",
                        (0, r.kt)("inlineCode", { parentName: "p" }, "i18n/fr"),
                        " folder:"
                    ),
                    (0, r.kt)(
                        "pre",
                        null,
                        (0, r.kt)(
                            "code",
                            u(
                                { parentName: "pre" },
                                { className: "language-bash" }
                            ),
                            "mkdir -p i18n/fr/docusaurus-plugin-content-docs/current/\n\ncp docs/intro.md i18n/fr/docusaurus-plugin-content-docs/current/intro.md\n"
                        )
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "Translate ",
                        (0, r.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "i18n/fr/docusaurus-plugin-content-docs/current/intro.md"
                        ),
                        " in French."
                    ),
                    (0, r.kt)(
                        "h2",
                        u({}, { id: "start-your-localized-site" }),
                        "Start your localized site"
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "Start your site on the French locale:"
                    ),
                    (0, r.kt)(
                        "pre",
                        null,
                        (0, r.kt)(
                            "code",
                            u(
                                { parentName: "pre" },
                                { className: "language-bash" }
                            ),
                            "npm run start -- --locale fr\n"
                        )
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "Your localized site is accessible at ",
                        (0, r.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "http://localhost:3000/fr/"
                        ),
                        " and the ",
                        (0, r.kt)(
                            "inlineCode",
                            { parentName: "p" },
                            "Getting Started"
                        ),
                        " page is translated."
                    ),
                    (0, r.kt)(
                        "div",
                        u(
                            {},
                            {
                                className:
                                    "admonition admonition-caution alert alert--warning"
                            }
                        ),
                        (0, r.kt)(
                            "div",
                            u(
                                { parentName: "div" },
                                { className: "admonition-heading" }
                            ),
                            (0, r.kt)(
                                "h5",
                                { parentName: "div" },
                                (0, r.kt)(
                                    "span",
                                    u(
                                        { parentName: "h5" },
                                        { className: "admonition-icon" }
                                    ),
                                    (0, r.kt)(
                                        "svg",
                                        u(
                                            { parentName: "span" },
                                            {
                                                xmlns: "http://www.w3.org/2000/svg",
                                                width: "16",
                                                height: "16",
                                                viewBox: "0 0 16 16"
                                            }
                                        ),
                                        (0, r.kt)(
                                            "path",
                                            u(
                                                { parentName: "svg" },
                                                {
                                                    fillRule: "evenodd",
                                                    d: "M8.893 1.5c-.183-.31-.52-.5-.887-.5s-.703.19-.886.5L.138 13.499a.98.98 0 0 0 0 1.001c.193.31.53.501.886.501h13.964c.367 0 .704-.19.877-.5a1.03 1.03 0 0 0 .01-1.002L8.893 1.5zm.133 11.497H6.987v-2.003h2.039v2.003zm0-3.004H6.987V5.987h2.039v4.006z"
                                                }
                                            )
                                        )
                                    )
                                ),
                                "caution"
                            )
                        ),
                        (0, r.kt)(
                            "div",
                            u(
                                { parentName: "div" },
                                { className: "admonition-content" }
                            ),
                            (0, r.kt)(
                                "p",
                                { parentName: "div" },
                                "In development, you can only use one locale at a same time."
                            )
                        )
                    ),
                    (0, r.kt)(
                        "h2",
                        u({}, { id: "add-a-locale-dropdown" }),
                        "Add a Locale Dropdown"
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "To navigate seamlessly across languages, add a locale dropdown."
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
                            u(
                                { parentName: "pre" },
                                {
                                    className: "language-js",
                                    metastring: 'title="docusaurus.config.js"',
                                    title: '"docusaurus.config.js"'
                                }
                            ),
                            'module.exports = {\n    themeConfig: {\n        navbar: {\n            items: [\n                // highlight-start\n                {\n                    type: "localeDropdown"\n                }\n                // highlight-end\n            ]\n        }\n    }\n}\n'
                        )
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "The locale dropdown now appears in your navbar:"
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        (0, r.kt)("img", {
                            alt: "Locale Dropdown",
                            src: n(3145).Z,
                            width: "418",
                            height: "344"
                        })
                    ),
                    (0, r.kt)(
                        "h2",
                        u({}, { id: "build-your-localized-site" }),
                        "Build your localized site"
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "Build your site for a specific locale:"
                    ),
                    (0, r.kt)(
                        "pre",
                        null,
                        (0, r.kt)(
                            "code",
                            u(
                                { parentName: "pre" },
                                { className: "language-bash" }
                            ),
                            "npm run build -- --locale fr\n"
                        )
                    ),
                    (0, r.kt)(
                        "p",
                        null,
                        "Or build your site to include all the locales at once:"
                    ),
                    (0, r.kt)(
                        "pre",
                        null,
                        (0, r.kt)(
                            "code",
                            u(
                                { parentName: "pre" },
                                { className: "language-bash" }
                            ),
                            "npm run build\n"
                        )
                    )
                )
            }
            h.isMDXComponent = !0
        },
        3145: (e, t, n) => {
            n.d(t, { Z: () => r })
            const r =
                n.p +
                "assets/images/localeDropdown-0052c3f08ccaf802ac733b23e655f498.png"
        }
    }
])
