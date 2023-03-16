"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [7918],
    {
        9613: (e, t, n) => {
            n.d(t, { Zo: () => m, kt: () => v })
            var a = n(9496)
            function r(e, t, n) {
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
            function l(e, t) {
                var n = Object.keys(e)
                if (Object.getOwnPropertySymbols) {
                    var a = Object.getOwnPropertySymbols(e)
                    t &&
                        (a = a.filter(function (t) {
                            return Object.getOwnPropertyDescriptor(
                                e,
                                t
                            ).enumerable
                        })),
                        n.push.apply(n, a)
                }
                return n
            }
            function i(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var n = null != arguments[t] ? arguments[t] : {}
                    t % 2
                        ? l(Object(n), !0).forEach(function (t) {
                              r(e, t, n[t])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(n)
                          )
                        : l(Object(n)).forEach(function (t) {
                              Object.defineProperty(
                                  e,
                                  t,
                                  Object.getOwnPropertyDescriptor(n, t)
                              )
                          })
                }
                return e
            }
            function o(e, t) {
                if (null == e) return {}
                var n,
                    a,
                    r = (function (e, t) {
                        if (null == e) return {}
                        var n,
                            a,
                            r = {},
                            l = Object.keys(e)
                        for (a = 0; a < l.length; a++)
                            (n = l[a]), t.indexOf(n) >= 0 || (r[n] = e[n])
                        return r
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var l = Object.getOwnPropertySymbols(e)
                    for (a = 0; a < l.length; a++)
                        (n = l[a]),
                            t.indexOf(n) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    n
                                ) &&
                                    (r[n] = e[n]))
                }
                return r
            }
            var c = a.createContext({}),
                s = function (e) {
                    var t = a.useContext(c),
                        n = t
                    return (
                        e &&
                            (n =
                                "function" == typeof e ? e(t) : i(i({}, t), e)),
                        n
                    )
                },
                m = function (e) {
                    var t = s(e.components)
                    return a.createElement(c.Provider, { value: t }, e.children)
                },
                d = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return a.createElement(a.Fragment, {}, t)
                    }
                },
                u = a.forwardRef(function (e, t) {
                    var n = e.components,
                        r = e.mdxType,
                        l = e.originalType,
                        c = e.parentName,
                        m = o(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        u = s(n),
                        v = r,
                        f = u["".concat(c, ".").concat(v)] || u[v] || d[v] || l
                    return n
                        ? a.createElement(
                              f,
                              i(i({ ref: t }, m), {}, { components: n })
                          )
                        : a.createElement(f, i({ ref: t }, m))
                })
            function v(e, t) {
                var n = arguments,
                    r = t && t.mdxType
                if ("string" == typeof e || r) {
                    var l = n.length,
                        i = new Array(l)
                    i[0] = u
                    var o = {}
                    for (var c in t) hasOwnProperty.call(t, c) && (o[c] = t[c])
                    ;(o.originalType = e),
                        (o.mdxType = "string" == typeof e ? e : r),
                        (i[1] = o)
                    for (var s = 2; s < l; s++) i[s] = n[s]
                    return a.createElement.apply(null, i)
                }
                return a.createElement.apply(null, n)
            }
            u.displayName = "MDXCreateElement"
        },
        4495: (e, t, n) => {
            n.r(t), n.d(t, { default: () => dt })
            var a = n(9496),
                r = n(619),
                l = n(8798),
                i = a.createContext(null)
            function o(e) {
                var t = e.children,
                    n = (function (e) {
                        return (0, a.useMemo)(
                            function () {
                                return {
                                    metadata: e.metadata,
                                    frontMatter: e.frontMatter,
                                    assets: e.assets,
                                    contentTitle: e.contentTitle,
                                    toc: e.toc
                                }
                            },
                            [e]
                        )
                    })(e.content)
                return a.createElement(i.Provider, { value: n }, t)
            }
            function c() {
                var e = (0, a.useContext)(i)
                if (null === e) throw new l.i6("DocProvider")
                return e
            }
            function s() {
                var e,
                    t = c(),
                    n = t.metadata,
                    l = t.frontMatter,
                    i = t.assets
                return a.createElement(r.d, {
                    title: n.title,
                    description: n.description,
                    keywords: l.keywords,
                    image: null != (e = i.image) ? e : l.image
                })
            }
            var m = n(5924),
                d = n(9379),
                u = n(4250),
                v = n(4959),
                f = n(3088)
            function p(e) {
                var t = e.permalink,
                    n = e.title,
                    r = e.subLabel,
                    l = e.isNext
                return a.createElement(
                    f.Z,
                    {
                        className: (0, m.Z)(
                            "pagination-nav__link",
                            l
                                ? "pagination-nav__link--next"
                                : "pagination-nav__link--prev"
                        ),
                        to: t
                    },
                    r &&
                        a.createElement(
                            "div",
                            { className: "pagination-nav__sublabel" },
                            r
                        ),
                    a.createElement(
                        "div",
                        { className: "pagination-nav__label" },
                        n
                    )
                )
            }
            function h(e) {
                var t = e.previous,
                    n = e.next
                return a.createElement(
                    "nav",
                    {
                        className: "pagination-nav docusaurus-mt-lg",
                        "aria-label": (0, v.I)({
                            id: "theme.docs.paginator.navAriaLabel",
                            message: "Docs pages navigation",
                            description:
                                "The ARIA label for the docs pagination"
                        })
                    },
                    t &&
                        a.createElement(
                            p,
                            (0, u.Z)({}, t, {
                                subLabel: a.createElement(
                                    v.Z,
                                    {
                                        id: "theme.docs.paginator.previous",
                                        description:
                                            "The label used to navigate to the previous doc"
                                    },
                                    "Previous"
                                )
                            })
                        ),
                    n &&
                        a.createElement(
                            p,
                            (0, u.Z)({}, n, {
                                subLabel: a.createElement(
                                    v.Z,
                                    {
                                        id: "theme.docs.paginator.next",
                                        description:
                                            "The label used to navigate to the next doc"
                                    },
                                    "Next"
                                ),
                                isNext: !0
                            })
                        )
                )
            }
            function b() {
                var e = c().metadata
                return a.createElement(h, {
                    previous: e.previous,
                    next: e.next
                })
            }
            var g = n(1483),
                E = n(7133),
                N = n(8282),
                y = n(3656),
                L = n(2772)
            var Z = {
                unreleased: function (e) {
                    var t = e.siteTitle,
                        n = e.versionMetadata
                    return a.createElement(
                        v.Z,
                        {
                            id: "theme.docs.versions.unreleasedVersionLabel",
                            description:
                                "The label used to tell the user that he's browsing an unreleased doc version",
                            values: {
                                siteTitle: t,
                                versionLabel: a.createElement(
                                    "b",
                                    null,
                                    n.label
                                )
                            }
                        },
                        "This is unreleased documentation for {siteTitle} {versionLabel} version."
                    )
                },
                unmaintained: function (e) {
                    var t = e.siteTitle,
                        n = e.versionMetadata
                    return a.createElement(
                        v.Z,
                        {
                            id: "theme.docs.versions.unmaintainedVersionLabel",
                            description:
                                "The label used to tell the user that he's browsing an unmaintained doc version",
                            values: {
                                siteTitle: t,
                                versionLabel: a.createElement(
                                    "b",
                                    null,
                                    n.label
                                )
                            }
                        },
                        "This is documentation for {siteTitle} {versionLabel}, which is no longer actively maintained."
                    )
                }
            }
            function C(e) {
                var t = Z[e.versionMetadata.banner]
                return a.createElement(t, e)
            }
            function k(e) {
                var t = e.versionLabel,
                    n = e.to,
                    r = e.onClick
                return a.createElement(
                    v.Z,
                    {
                        id: "theme.docs.versions.latestVersionSuggestionLabel",
                        description:
                            "The label used to tell the user to check the latest version",
                        values: {
                            versionLabel: t,
                            latestVersionLink: a.createElement(
                                "b",
                                null,
                                a.createElement(
                                    f.Z,
                                    { to: n, onClick: r },
                                    a.createElement(
                                        v.Z,
                                        {
                                            id: "theme.docs.versions.latestVersionLinkLabel",
                                            description:
                                                "The label used for the latest version suggestion link label"
                                        },
                                        "latest version"
                                    )
                                )
                            )
                        }
                    },
                    "For up-to-date documentation, see the {latestVersionLink} ({versionLabel})."
                )
            }
            function _(e) {
                var t,
                    n = e.className,
                    r = e.versionMetadata,
                    l = (0, g.Z)().siteConfig.title,
                    i = (0, E.gA)({ failfast: !0 }).pluginId,
                    o = (0, y.J)(i).savePreferredVersionName,
                    c = (0, E.Jo)(i),
                    s = c.latestDocSuggestion,
                    d = c.latestVersionSuggestion,
                    u =
                        null != s
                            ? s
                            : (t = d).docs.find(function (e) {
                                  return e.id === t.mainDocId
                              })
                return a.createElement(
                    "div",
                    {
                        className: (0, m.Z)(
                            n,
                            N.k.docs.docVersionBanner,
                            "alert alert--warning margin-bottom--md"
                        ),
                        role: "alert"
                    },
                    a.createElement(
                        "div",
                        null,
                        a.createElement(C, { siteTitle: l, versionMetadata: r })
                    ),
                    a.createElement(
                        "div",
                        { className: "margin-top--md" },
                        a.createElement(k, {
                            versionLabel: d.label,
                            to: u.path,
                            onClick: function () {
                                return o(d.name)
                            }
                        })
                    )
                )
            }
            function T(e) {
                var t = e.className,
                    n = (0, L.E)()
                return n.banner
                    ? a.createElement(_, { className: t, versionMetadata: n })
                    : null
            }
            function x(e) {
                var t = e.className,
                    n = (0, L.E)()
                return n.badge
                    ? a.createElement(
                          "span",
                          {
                              className: (0, m.Z)(
                                  t,
                                  N.k.docs.docVersionBadge,
                                  "badge badge--secondary"
                              )
                          },
                          a.createElement(
                              v.Z,
                              {
                                  id: "theme.docs.versionBadge.label",
                                  values: { versionLabel: n.label }
                              },
                              "Version: {versionLabel}"
                          )
                      )
                    : null
            }
            function w(e) {
                var t = e.lastUpdatedAt,
                    n = e.formattedLastUpdatedAt
                return a.createElement(
                    v.Z,
                    {
                        id: "theme.lastUpdated.atDate",
                        description:
                            "The words used to describe on which date a page has been last updated",
                        values: {
                            date: a.createElement(
                                "b",
                                null,
                                a.createElement(
                                    "time",
                                    {
                                        dateTime: new Date(
                                            1e3 * t
                                        ).toISOString()
                                    },
                                    n
                                )
                            )
                        }
                    },
                    " on {date}"
                )
            }
            function H(e) {
                var t = e.lastUpdatedBy
                return a.createElement(
                    v.Z,
                    {
                        id: "theme.lastUpdated.byUser",
                        description:
                            "The words used to describe by who the page has been last updated",
                        values: { user: a.createElement("b", null, t) }
                    },
                    " by {user}"
                )
            }
            function O(e) {
                var t = e.lastUpdatedAt,
                    n = e.formattedLastUpdatedAt,
                    r = e.lastUpdatedBy
                return a.createElement(
                    "span",
                    { className: N.k.common.lastUpdated },
                    a.createElement(
                        v.Z,
                        {
                            id: "theme.lastUpdated.lastUpdatedAtBy",
                            description:
                                "The sentence used to display when a page has been last updated, and by who",
                            values: {
                                atDate:
                                    t && n
                                        ? a.createElement(w, {
                                              lastUpdatedAt: t,
                                              formattedLastUpdatedAt: n
                                          })
                                        : "",
                                byUser: r
                                    ? a.createElement(H, { lastUpdatedBy: r })
                                    : ""
                            }
                        },
                        "Last updated{atDate}{byUser}"
                    ),
                    !1
                )
            }
            var A = n(7075)
            const M = "iconEdit_VAw3"
            var U = ["className"]
            function P(e) {
                var t = e.className,
                    n = (0, A.Z)(e, U)
                return a.createElement(
                    "svg",
                    (0, u.Z)(
                        {
                            fill: "currentColor",
                            height: "20",
                            width: "20",
                            viewBox: "0 0 40 40",
                            className: (0, m.Z)(M, t),
                            "aria-hidden": "true"
                        },
                        n
                    ),
                    a.createElement(
                        "g",
                        null,
                        a.createElement("path", {
                            d: "m34.5 11.7l-3 3.1-6.3-6.3 3.1-3q0.5-0.5 1.2-0.5t1.1 0.5l3.9 3.9q0.5 0.4 0.5 1.1t-0.5 1.2z m-29.5 17.1l18.4-18.5 6.3 6.3-18.4 18.4h-6.3v-6.2z"
                        })
                    )
                )
            }
            function B(e) {
                var t = e.editUrl
                return a.createElement(
                    "a",
                    {
                        href: t,
                        target: "_blank",
                        rel: "noreferrer noopener",
                        className: N.k.common.editThisPage
                    },
                    a.createElement(P, null),
                    a.createElement(
                        v.Z,
                        {
                            id: "theme.common.editThisPage",
                            description:
                                "The link label to edit the current page"
                        },
                        "Edit this page"
                    )
                )
            }
            const I = "tag_ukCb",
                S = "tagRegular_nVPI",
                z = "tagWithCount_ItVd"
            function D(e) {
                var t = e.permalink,
                    n = e.label,
                    r = e.count
                return a.createElement(
                    f.Z,
                    { href: t, className: (0, m.Z)(I, r ? z : S) },
                    n,
                    r && a.createElement("span", null, r)
                )
            }
            const j = "tags_P9f4",
                V = "tag_ekDg"
            function R(e) {
                var t = e.tags
                return a.createElement(
                    a.Fragment,
                    null,
                    a.createElement(
                        "b",
                        null,
                        a.createElement(
                            v.Z,
                            {
                                id: "theme.tags.tagsListLabel",
                                description: "The label alongside a tag list"
                            },
                            "Tags:"
                        )
                    ),
                    a.createElement(
                        "ul",
                        {
                            className: (0, m.Z)(
                                j,
                                "padding--none",
                                "margin-left--sm"
                            )
                        },
                        t.map(function (e) {
                            var t = e.label,
                                n = e.permalink
                            return a.createElement(
                                "li",
                                { key: n, className: V },
                                a.createElement(D, { label: t, permalink: n })
                            )
                        })
                    )
                )
            }
            const F = "lastUpdated_yyJh"
            function q(e) {
                return a.createElement(
                    "div",
                    {
                        className: (0, m.Z)(
                            N.k.docs.docFooterTagsRow,
                            "row margin-bottom--sm"
                        )
                    },
                    a.createElement(
                        "div",
                        { className: "col" },
                        a.createElement(R, e)
                    )
                )
            }
            function W(e) {
                var t = e.editUrl,
                    n = e.lastUpdatedAt,
                    r = e.lastUpdatedBy,
                    l = e.formattedLastUpdatedAt
                return a.createElement(
                    "div",
                    {
                        className: (0, m.Z)(
                            N.k.docs.docFooterEditMetaRow,
                            "row"
                        )
                    },
                    a.createElement(
                        "div",
                        { className: "col" },
                        t && a.createElement(B, { editUrl: t })
                    ),
                    a.createElement(
                        "div",
                        { className: (0, m.Z)("col", F) },
                        (n || r) &&
                            a.createElement(O, {
                                lastUpdatedAt: n,
                                formattedLastUpdatedAt: l,
                                lastUpdatedBy: r
                            })
                    )
                )
            }
            function J() {
                var e = c().metadata,
                    t = e.editUrl,
                    n = e.lastUpdatedAt,
                    r = e.formattedLastUpdatedAt,
                    l = e.lastUpdatedBy,
                    i = e.tags,
                    o = i.length > 0,
                    s = !!(t || n || l)
                return o || s
                    ? a.createElement(
                          "footer",
                          {
                              className: (0, m.Z)(
                                  N.k.docs.docFooter,
                                  "docusaurus-mt-lg"
                              )
                          },
                          o && a.createElement(q, { tags: i }),
                          s &&
                              a.createElement(W, {
                                  editUrl: t,
                                  lastUpdatedAt: n,
                                  lastUpdatedBy: l,
                                  formattedLastUpdatedAt: r
                              })
                      )
                    : null
            }
            var Y = n(5751),
                K = n(5327),
                G = ["parentIndex"]
            function Q(e) {
                var t = e.map(function (e) {
                        return Object.assign({}, e, {
                            parentIndex: -1,
                            children: []
                        })
                    }),
                    n = Array(7).fill(-1)
                t.forEach(function (e, t) {
                    var a = n.slice(2, e.level)
                    ;(e.parentIndex = Math.max.apply(Math, a)), (n[e.level] = t)
                })
                var a = []
                return (
                    t.forEach(function (e) {
                        var n = e.parentIndex,
                            r = (0, A.Z)(e, G)
                        n >= 0 ? t[n].children.push(r) : a.push(r)
                    }),
                    a
                )
            }
            function X(e) {
                var t = e.toc,
                    n = e.minHeadingLevel,
                    a = e.maxHeadingLevel
                return t.flatMap(function (e) {
                    var t = X({
                        toc: e.children,
                        minHeadingLevel: n,
                        maxHeadingLevel: a
                    })
                    return (function (e) {
                        return e.level >= n && e.level <= a
                    })(e)
                        ? [Object.assign({}, e, { children: t })]
                        : t
                })
            }
            function $(e) {
                var t = e.getBoundingClientRect()
                return t.top === t.bottom ? $(e.parentNode) : t
            }
            function ee(e, t) {
                var n,
                    a,
                    r = t.anchorTopOffset,
                    l = e.find(function (e) {
                        return $(e).top >= r
                    })
                return l
                    ? (function (e) {
                          return e.top > 0 && e.bottom < window.innerHeight / 2
                      })($(l))
                        ? l
                        : null != (a = e[e.indexOf(l) - 1])
                        ? a
                        : null
                    : null != (n = e[e.length - 1])
                    ? n
                    : null
            }
            function te() {
                var e = (0, a.useRef)(0),
                    t = (0, K.L)().navbar.hideOnScroll
                return (
                    (0, a.useEffect)(
                        function () {
                            e.current = t
                                ? 0
                                : document.querySelector(".navbar").clientHeight
                        },
                        [t]
                    ),
                    e
                )
            }
            function ne(e) {
                var t = (0, a.useRef)(void 0),
                    n = te()
                ;(0, a.useEffect)(
                    function () {
                        if (!e) return function () {}
                        var a = e.linkClassName,
                            r = e.linkActiveClassName,
                            l = e.minHeadingLevel,
                            i = e.maxHeadingLevel
                        function o() {
                            var e = (function (e) {
                                    return Array.from(
                                        document.getElementsByClassName(e)
                                    )
                                })(a),
                                o = (function (e) {
                                    for (
                                        var t = e.minHeadingLevel,
                                            n = e.maxHeadingLevel,
                                            a = [],
                                            r = t;
                                        r <= n;
                                        r += 1
                                    )
                                        a.push("h" + r + ".anchor")
                                    return Array.from(
                                        document.querySelectorAll(a.join())
                                    )
                                })({ minHeadingLevel: l, maxHeadingLevel: i }),
                                c = ee(o, { anchorTopOffset: n.current }),
                                s = e.find(function (e) {
                                    return (
                                        c &&
                                        c.id ===
                                            (function (e) {
                                                return decodeURIComponent(
                                                    e.href.substring(
                                                        e.href.indexOf("#") + 1
                                                    )
                                                )
                                            })(e)
                                    )
                                })
                            e.forEach(function (e) {
                                !(function (e, n) {
                                    n
                                        ? (t.current &&
                                              t.current !== e &&
                                              t.current.classList.remove(r),
                                          e.classList.add(r),
                                          (t.current = e))
                                        : e.classList.remove(r)
                                })(e, e === s)
                            })
                        }
                        return (
                            document.addEventListener("scroll", o),
                            document.addEventListener("resize", o),
                            o(),
                            function () {
                                document.removeEventListener("scroll", o),
                                    document.removeEventListener("resize", o)
                            }
                        )
                    },
                    [e, n]
                )
            }
            function ae(e) {
                var t = e.toc,
                    n = e.className,
                    r = e.linkClassName,
                    l = e.isChild
                return t.length
                    ? a.createElement(
                          "ul",
                          { className: l ? void 0 : n },
                          t.map(function (e) {
                              return a.createElement(
                                  "li",
                                  { key: e.id },
                                  a.createElement("a", {
                                      href: "#" + e.id,
                                      className: null != r ? r : void 0,
                                      dangerouslySetInnerHTML: {
                                          __html: e.value
                                      }
                                  }),
                                  a.createElement(ae, {
                                      isChild: !0,
                                      toc: e.children,
                                      className: n,
                                      linkClassName: r
                                  })
                              )
                          })
                      )
                    : null
            }
            const re = a.memo(ae)
            var le = [
                "toc",
                "className",
                "linkClassName",
                "linkActiveClassName",
                "minHeadingLevel",
                "maxHeadingLevel"
            ]
            function ie(e) {
                var t = e.toc,
                    n = e.className,
                    r =
                        void 0 === n
                            ? "table-of-contents table-of-contents__left-border"
                            : n,
                    l = e.linkClassName,
                    i = void 0 === l ? "table-of-contents__link" : l,
                    o = e.linkActiveClassName,
                    c = void 0 === o ? void 0 : o,
                    s = e.minHeadingLevel,
                    m = e.maxHeadingLevel,
                    d = (0, A.Z)(e, le),
                    v = (0, K.L)(),
                    f = null != s ? s : v.tableOfContents.minHeadingLevel,
                    p = null != m ? m : v.tableOfContents.maxHeadingLevel,
                    h = (function (e) {
                        var t = e.toc,
                            n = e.minHeadingLevel,
                            r = e.maxHeadingLevel
                        return (0, a.useMemo)(
                            function () {
                                return X({
                                    toc: Q(t),
                                    minHeadingLevel: n,
                                    maxHeadingLevel: r
                                })
                            },
                            [t, n, r]
                        )
                    })({ toc: t, minHeadingLevel: f, maxHeadingLevel: p })
                return (
                    ne(
                        (0, a.useMemo)(
                            function () {
                                if (i && c)
                                    return {
                                        linkClassName: i,
                                        linkActiveClassName: c,
                                        minHeadingLevel: f,
                                        maxHeadingLevel: p
                                    }
                            },
                            [i, c, f, p]
                        )
                    ),
                    a.createElement(
                        re,
                        (0, u.Z)({ toc: h, className: r, linkClassName: i }, d)
                    )
                )
            }
            const oe = "tocCollapsibleButton_DfY9",
                ce = "tocCollapsibleButtonExpanded_zHPy"
            var se = ["collapsed"]
            function me(e) {
                var t = e.collapsed,
                    n = (0, A.Z)(e, se)
                return a.createElement(
                    "button",
                    (0, u.Z)({ type: "button" }, n, {
                        className: (0, m.Z)(
                            "clean-btn",
                            oe,
                            !t && ce,
                            n.className
                        )
                    }),
                    a.createElement(
                        v.Z,
                        {
                            id: "theme.TOCCollapsible.toggleButtonLabel",
                            description:
                                "The label used by the button on the collapsible TOC component"
                        },
                        "On this page"
                    )
                )
            }
            const de = "tocCollapsible_mcv8",
                ue = "tocCollapsibleContent_x3_A",
                ve = "tocCollapsibleExpanded_ibFP"
            function fe(e) {
                var t = e.toc,
                    n = e.className,
                    r = e.minHeadingLevel,
                    l = e.maxHeadingLevel,
                    i = (0, Y.u)({ initialState: !0 }),
                    o = i.collapsed,
                    c = i.toggleCollapsed
                return a.createElement(
                    "div",
                    { className: (0, m.Z)(de, !o && ve, n) },
                    a.createElement(me, { collapsed: o, onClick: c }),
                    a.createElement(
                        Y.z,
                        { lazy: !0, className: ue, collapsed: o },
                        a.createElement(ie, {
                            toc: t,
                            minHeadingLevel: r,
                            maxHeadingLevel: l
                        })
                    )
                )
            }
            const pe = "tocMobile_vJF2"
            function he() {
                var e = c(),
                    t = e.toc,
                    n = e.frontMatter
                return a.createElement(fe, {
                    toc: t,
                    minHeadingLevel: n.toc_min_heading_level,
                    maxHeadingLevel: n.toc_max_heading_level,
                    className: (0, m.Z)(N.k.docs.docTocMobile, pe)
                })
            }
            const be = "tableOfContents_qN5L"
            var ge = ["className"]
            function Ee(e) {
                var t = e.className,
                    n = (0, A.Z)(e, ge)
                return a.createElement(
                    "div",
                    { className: (0, m.Z)(be, "thin-scrollbar", t) },
                    a.createElement(
                        ie,
                        (0, u.Z)({}, n, {
                            linkClassName:
                                "table-of-contents__link toc-highlight",
                            linkActiveClassName:
                                "table-of-contents__link--active"
                        })
                    )
                )
            }
            function Ne() {
                var e = c(),
                    t = e.toc,
                    n = e.frontMatter
                return a.createElement(Ee, {
                    toc: t,
                    minHeadingLevel: n.toc_min_heading_level,
                    maxHeadingLevel: n.toc_max_heading_level,
                    className: N.k.docs.docTocDesktop
                })
            }
            const ye = "anchorWithStickyNavbar_IDSQ",
                Le = "anchorWithHideOnScrollNavbar_zL4f"
            var Ze = ["as", "id"]
            function Ce(e) {
                var t = e.as,
                    n = e.id,
                    r = (0, A.Z)(e, Ze),
                    l = (0, K.L)().navbar.hideOnScroll
                if ("h1" === t || !n)
                    return a.createElement(t, (0, u.Z)({}, r, { id: void 0 }))
                var i = (0, v.I)(
                    {
                        id: "theme.common.headingLinkTitle",
                        message: "Direct link to {heading}",
                        description: "Title for link to heading"
                    },
                    { heading: "string" == typeof r.children ? r.children : n }
                )
                return a.createElement(
                    t,
                    (0, u.Z)({}, r, {
                        className: (0, m.Z)("anchor", l ? Le : ye, r.className),
                        id: n
                    }),
                    r.children,
                    a.createElement(
                        f.Z,
                        {
                            className: "hash-link",
                            to: "#" + n,
                            "aria-label": i,
                            title: i
                        },
                        "\u200b"
                    )
                )
            }
            var ke = n(9613),
                _e = n(7577),
                Te = ["mdxType", "originalType"]
            var xe = n(856)
            var we = n(8649)
            const He = "details_d2A3",
                Oe = "isBrowser_oBKs",
                Ae = "collapsibleContent_DW_r"
            var Me = ["summary", "children"]
            function Ue(e) {
                return !!e && ("SUMMARY" === e.tagName || Ue(e.parentElement))
            }
            function Pe(e, t) {
                return !!e && (e === t || Pe(e.parentElement, t))
            }
            function Be(e) {
                var t = e.summary,
                    n = e.children,
                    r = (0, A.Z)(e, Me),
                    l = (0, we.Z)(),
                    i = (0, a.useRef)(null),
                    o = (0, Y.u)({ initialState: !r.open }),
                    c = o.collapsed,
                    s = o.setCollapsed,
                    d = (0, a.useState)(r.open),
                    v = d[0],
                    f = d[1]
                return a.createElement(
                    "details",
                    (0, u.Z)({}, r, {
                        ref: i,
                        open: v,
                        "data-collapsed": c,
                        className: (0, m.Z)(He, l && Oe, r.className),
                        onMouseDown: function (e) {
                            Ue(e.target) && e.detail > 1 && e.preventDefault()
                        },
                        onClick: function (e) {
                            e.stopPropagation()
                            var t = e.target
                            Ue(t) &&
                                Pe(t, i.current) &&
                                (e.preventDefault(), c ? (s(!1), f(!0)) : s(!0))
                        }
                    }),
                    null != t ? t : a.createElement("summary", null, "Details"),
                    a.createElement(
                        Y.z,
                        {
                            lazy: !1,
                            collapsed: c,
                            disableSSRStyle: !0,
                            onCollapseTransitionEnd: function (e) {
                                s(e), f(!e)
                            }
                        },
                        a.createElement("div", { className: Ae }, n)
                    )
                )
            }
            const Ie = "details_PCbd"
            function Se(e) {
                var t = Object.assign(
                    {},
                    ((function (e) {
                        if (null == e)
                            throw new TypeError("Cannot destructure " + e)
                    })(e),
                    e)
                )
                return a.createElement(
                    Be,
                    (0, u.Z)({}, t, {
                        className: (0, m.Z)(
                            "alert alert--info",
                            Ie,
                            t.className
                        )
                    })
                )
            }
            function ze(e) {
                return a.createElement(Ce, e)
            }
            const De = "containsTaskList_Z8fB"
            const je = "img_egWU"
            const Ve = "admonition_o8qs",
                Re = "admonitionHeading_t2m0",
                Fe = "admonitionIcon_OrFq",
                qe = "admonitionContent_KN7q"
            var We = {
                    note: {
                        infimaClassName: "secondary",
                        iconComponent: function () {
                            return a.createElement(
                                "svg",
                                { viewBox: "0 0 14 16" },
                                a.createElement("path", {
                                    fillRule: "evenodd",
                                    d: "M6.3 5.69a.942.942 0 0 1-.28-.7c0-.28.09-.52.28-.7.19-.18.42-.28.7-.28.28 0 .52.09.7.28.18.19.28.42.28.7 0 .28-.09.52-.28.7a1 1 0 0 1-.7.3c-.28 0-.52-.11-.7-.3zM8 7.99c-.02-.25-.11-.48-.31-.69-.2-.19-.42-.3-.69-.31H6c-.27.02-.48.13-.69.31-.2.2-.3.44-.31.69h1v3c.02.27.11.5.31.69.2.2.42.31.69.31h1c.27 0 .48-.11.69-.31.2-.19.3-.42.31-.69H8V7.98v.01zM7 2.3c-3.14 0-5.7 2.54-5.7 5.68 0 3.14 2.56 5.7 5.7 5.7s5.7-2.55 5.7-5.7c0-3.15-2.56-5.69-5.7-5.69v.01zM7 .98c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.12-7-7 3.14-7 7-7z"
                                })
                            )
                        },
                        label: a.createElement(
                            v.Z,
                            {
                                id: "theme.admonition.note",
                                description:
                                    "The default label used for the Note admonition (:::note)"
                            },
                            "note"
                        )
                    },
                    tip: {
                        infimaClassName: "success",
                        iconComponent: function () {
                            return a.createElement(
                                "svg",
                                { viewBox: "0 0 12 16" },
                                a.createElement("path", {
                                    fillRule: "evenodd",
                                    d: "M6.5 0C3.48 0 1 2.19 1 5c0 .92.55 2.25 1 3 1.34 2.25 1.78 2.78 2 4v1h5v-1c.22-1.22.66-1.75 2-4 .45-.75 1-2.08 1-3 0-2.81-2.48-5-5.5-5zm3.64 7.48c-.25.44-.47.8-.67 1.11-.86 1.41-1.25 2.06-1.45 3.23-.02.05-.02.11-.02.17H5c0-.06 0-.13-.02-.17-.2-1.17-.59-1.83-1.45-3.23-.2-.31-.42-.67-.67-1.11C2.44 6.78 2 5.65 2 5c0-2.2 2.02-4 4.5-4 1.22 0 2.36.42 3.22 1.19C10.55 2.94 11 3.94 11 5c0 .66-.44 1.78-.86 2.48zM4 14h5c-.23 1.14-1.3 2-2.5 2s-2.27-.86-2.5-2z"
                                })
                            )
                        },
                        label: a.createElement(
                            v.Z,
                            {
                                id: "theme.admonition.tip",
                                description:
                                    "The default label used for the Tip admonition (:::tip)"
                            },
                            "tip"
                        )
                    },
                    danger: {
                        infimaClassName: "danger",
                        iconComponent: function () {
                            return a.createElement(
                                "svg",
                                { viewBox: "0 0 12 16" },
                                a.createElement("path", {
                                    fillRule: "evenodd",
                                    d: "M5.05.31c.81 2.17.41 3.38-.52 4.31C3.55 5.67 1.98 6.45.9 7.98c-1.45 2.05-1.7 6.53 3.53 7.7-2.2-1.16-2.67-4.52-.3-6.61-.61 2.03.53 3.33 1.94 2.86 1.39-.47 2.3.53 2.27 1.67-.02.78-.31 1.44-1.13 1.81 3.42-.59 4.78-3.42 4.78-5.56 0-2.84-2.53-3.22-1.25-5.61-1.52.13-2.03 1.13-1.89 2.75.09 1.08-1.02 1.8-1.86 1.33-.67-.41-.66-1.19-.06-1.78C8.18 5.31 8.68 2.45 5.05.32L5.03.3l.02.01z"
                                })
                            )
                        },
                        label: a.createElement(
                            v.Z,
                            {
                                id: "theme.admonition.danger",
                                description:
                                    "The default label used for the Danger admonition (:::danger)"
                            },
                            "danger"
                        )
                    },
                    info: {
                        infimaClassName: "info",
                        iconComponent: function () {
                            return a.createElement(
                                "svg",
                                { viewBox: "0 0 14 16" },
                                a.createElement("path", {
                                    fillRule: "evenodd",
                                    d: "M7 2.3c3.14 0 5.7 2.56 5.7 5.7s-2.56 5.7-5.7 5.7A5.71 5.71 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zM7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm1 3H6v5h2V4zm0 6H6v2h2v-2z"
                                })
                            )
                        },
                        label: a.createElement(
                            v.Z,
                            {
                                id: "theme.admonition.info",
                                description:
                                    "The default label used for the Info admonition (:::info)"
                            },
                            "info"
                        )
                    },
                    caution: {
                        infimaClassName: "warning",
                        iconComponent: function () {
                            return a.createElement(
                                "svg",
                                { viewBox: "0 0 16 16" },
                                a.createElement("path", {
                                    fillRule: "evenodd",
                                    d: "M8.893 1.5c-.183-.31-.52-.5-.887-.5s-.703.19-.886.5L.138 13.499a.98.98 0 0 0 0 1.001c.193.31.53.501.886.501h13.964c.367 0 .704-.19.877-.5a1.03 1.03 0 0 0 .01-1.002L8.893 1.5zm.133 11.497H6.987v-2.003h2.039v2.003zm0-3.004H6.987V5.987h2.039v4.006z"
                                })
                            )
                        },
                        label: a.createElement(
                            v.Z,
                            {
                                id: "theme.admonition.caution",
                                description:
                                    "The default label used for the Caution admonition (:::caution)"
                            },
                            "caution"
                        )
                    }
                },
                Je = {
                    secondary: "note",
                    important: "info",
                    success: "tip",
                    warning: "danger"
                }
            function Ye(e) {
                var t,
                    n = (function (e) {
                        var t = a.Children.toArray(e),
                            n = t.find(function (e) {
                                var t
                                return (
                                    a.isValidElement(e) &&
                                    "mdxAdmonitionTitle" ===
                                        (null == (t = e.props)
                                            ? void 0
                                            : t.mdxType)
                                )
                            }),
                            r = a.createElement(
                                a.Fragment,
                                null,
                                t.filter(function (e) {
                                    return e !== n
                                })
                            )
                        return { mdxAdmonitionTitle: n, rest: r }
                    })(e.children),
                    r = n.mdxAdmonitionTitle,
                    l = n.rest
                return Object.assign({}, e, {
                    title: null != (t = e.title) ? t : r,
                    children: l
                })
            }
            const Ke = {
                head: function (e) {
                    var t = a.Children.map(e.children, function (e) {
                        return a.isValidElement(e)
                            ? (function (e) {
                                  var t
                                  if (
                                      null != (t = e.props) &&
                                      t.mdxType &&
                                      e.props.originalType
                                  ) {
                                      var n = e.props,
                                          r =
                                              (n.mdxType,
                                              n.originalType,
                                              (0, A.Z)(n, Te))
                                      return a.createElement(
                                          e.props.originalType,
                                          r
                                      )
                                  }
                                  return e
                              })(e)
                            : e
                    })
                    return a.createElement(_e.Z, e, t)
                },
                code: function (e) {
                    var t = [
                        "a",
                        "abbr",
                        "b",
                        "br",
                        "button",
                        "cite",
                        "code",
                        "del",
                        "dfn",
                        "em",
                        "i",
                        "img",
                        "input",
                        "ins",
                        "kbd",
                        "label",
                        "object",
                        "output",
                        "q",
                        "ruby",
                        "s",
                        "small",
                        "span",
                        "strong",
                        "sub",
                        "sup",
                        "time",
                        "u",
                        "var",
                        "wbr"
                    ]
                    return a.Children.toArray(e.children).every(function (e) {
                        var n
                        return (
                            ("string" == typeof e && !e.includes("\n")) ||
                            ((0, a.isValidElement)(e) &&
                                t.includes(
                                    null == (n = e.props) ? void 0 : n.mdxType
                                ))
                        )
                    })
                        ? a.createElement("code", e)
                        : a.createElement(xe.Z, e)
                },
                a: function (e) {
                    return a.createElement(f.Z, e)
                },
                pre: function (e) {
                    var t
                    return a.createElement(
                        xe.Z,
                        (0, a.isValidElement)(e.children) &&
                            "code" ===
                                (null == (t = e.children.props)
                                    ? void 0
                                    : t.originalType)
                            ? e.children.props
                            : Object.assign({}, e)
                    )
                },
                details: function (e) {
                    var t = a.Children.toArray(e.children),
                        n = t.find(function (e) {
                            var t
                            return (
                                a.isValidElement(e) &&
                                "summary" ===
                                    (null == (t = e.props) ? void 0 : t.mdxType)
                            )
                        }),
                        r = a.createElement(
                            a.Fragment,
                            null,
                            t.filter(function (e) {
                                return e !== n
                            })
                        )
                    return a.createElement(
                        Se,
                        (0, u.Z)({}, e, { summary: n }),
                        r
                    )
                },
                ul: function (e) {
                    return a.createElement(
                        "ul",
                        (0, u.Z)({}, e, {
                            className:
                                ((t = e.className),
                                (0, m.Z)(
                                    t,
                                    (null == t
                                        ? void 0
                                        : t.includes("contains-task-list")) &&
                                        De
                                ))
                        })
                    )
                    var t
                },
                img: function (e) {
                    return a.createElement(
                        "img",
                        (0, u.Z)({ loading: "lazy" }, e, {
                            className: ((t = e.className), (0, m.Z)(t, je))
                        })
                    )
                    var t
                },
                h1: function (e) {
                    return a.createElement(ze, (0, u.Z)({ as: "h1" }, e))
                },
                h2: function (e) {
                    return a.createElement(ze, (0, u.Z)({ as: "h2" }, e))
                },
                h3: function (e) {
                    return a.createElement(ze, (0, u.Z)({ as: "h3" }, e))
                },
                h4: function (e) {
                    return a.createElement(ze, (0, u.Z)({ as: "h4" }, e))
                },
                h5: function (e) {
                    return a.createElement(ze, (0, u.Z)({ as: "h5" }, e))
                },
                h6: function (e) {
                    return a.createElement(ze, (0, u.Z)({ as: "h6" }, e))
                },
                admonition: function (e) {
                    var t = Ye(e),
                        n = t.children,
                        r = t.type,
                        l = t.title,
                        i = t.icon,
                        o = (function (e) {
                            var t,
                                n = null != (t = Je[e]) ? t : e
                            return (
                                We[n] ||
                                (console.warn(
                                    'No admonition config found for admonition type "' +
                                        n +
                                        '". Using Info as fallback.'
                                ),
                                We.info)
                            )
                        })(r),
                        c = null != l ? l : o.label,
                        s = o.iconComponent,
                        d = null != i ? i : a.createElement(s, null)
                    return a.createElement(
                        "div",
                        {
                            className: (0, m.Z)(
                                N.k.common.admonition,
                                N.k.common.admonitionType(e.type),
                                "alert",
                                "alert--" + o.infimaClassName,
                                Ve
                            )
                        },
                        a.createElement(
                            "div",
                            { className: Re },
                            a.createElement("span", { className: Fe }, d),
                            c
                        ),
                        a.createElement("div", { className: qe }, n)
                    )
                },
                mermaid: n(8124).Z
            }
            function Ge(e) {
                var t = e.children
                return a.createElement(ke.Zo, { components: Ke }, t)
            }
            function Qe(e) {
                var t,
                    n,
                    r,
                    l,
                    i = e.children,
                    o =
                        ((t = c()),
                        (n = t.metadata),
                        (r = t.frontMatter),
                        (l = t.contentTitle),
                        r.hide_title || void 0 !== l ? null : n.title)
                return a.createElement(
                    "div",
                    { className: (0, m.Z)(N.k.docs.docMarkdown, "markdown") },
                    o &&
                        a.createElement(
                            "header",
                            null,
                            a.createElement(Ce, { as: "h1" }, o)
                        ),
                    a.createElement(Ge, null, i)
                )
            }
            var Xe = n(5944),
                $e = n(2822),
                et = n(1640)
            function tt(e) {
                return a.createElement(
                    "svg",
                    (0, u.Z)({ viewBox: "0 0 24 24" }, e),
                    a.createElement("path", {
                        d: "M10 19v-5h4v5c0 .55.45 1 1 1h3c.55 0 1-.45 1-1v-7h1.7c.46 0 .68-.57.33-.87L12.67 3.6c-.38-.34-.96-.34-1.34 0l-8.36 7.53c-.34.3-.13.87.33.87H5v7c0 .55.45 1 1 1h3c.55 0 1-.45 1-1z",
                        fill: "currentColor"
                    })
                )
            }
            const nt = "breadcrumbHomeIcon__eSb"
            function at() {
                var e = (0, et.Z)("/")
                return a.createElement(
                    "li",
                    { className: "breadcrumbs__item" },
                    a.createElement(
                        f.Z,
                        {
                            "aria-label": (0, v.I)({
                                id: "theme.docs.breadcrumbs.home",
                                message: "Home page",
                                description:
                                    "The ARIA label for the home page in the breadcrumbs"
                            }),
                            className: "breadcrumbs__link",
                            href: e
                        },
                        a.createElement(tt, { className: nt })
                    )
                )
            }
            const rt = "breadcrumbsContainer_elql"
            function lt(e) {
                var t = e.children,
                    n = e.href,
                    r = "breadcrumbs__link"
                return e.isLast
                    ? a.createElement(
                          "span",
                          { className: r, itemProp: "name" },
                          t
                      )
                    : n
                    ? a.createElement(
                          f.Z,
                          { className: r, href: n, itemProp: "item" },
                          a.createElement("span", { itemProp: "name" }, t)
                      )
                    : a.createElement("span", { className: r }, t)
            }
            function it(e) {
                var t = e.children,
                    n = e.active,
                    r = e.index,
                    l = e.addMicrodata
                return a.createElement(
                    "li",
                    (0, u.Z)(
                        {},
                        l && {
                            itemScope: !0,
                            itemProp: "itemListElement",
                            itemType: "https://schema.org/ListItem"
                        },
                        {
                            className: (0, m.Z)("breadcrumbs__item", {
                                "breadcrumbs__item--active": n
                            })
                        }
                    ),
                    t,
                    a.createElement("meta", {
                        itemProp: "position",
                        content: String(r + 1)
                    })
                )
            }
            function ot() {
                var e = (0, Xe.s1)(),
                    t = (0, $e.Ns)()
                return e
                    ? a.createElement(
                          "nav",
                          {
                              className: (0, m.Z)(N.k.docs.docBreadcrumbs, rt),
                              "aria-label": (0, v.I)({
                                  id: "theme.docs.breadcrumbs.navAriaLabel",
                                  message: "Breadcrumbs",
                                  description:
                                      "The ARIA label for the breadcrumbs"
                              })
                          },
                          a.createElement(
                              "ul",
                              {
                                  className: "breadcrumbs",
                                  itemScope: !0,
                                  itemType: "https://schema.org/BreadcrumbList"
                              },
                              t && a.createElement(at, null),
                              e.map(function (t, n) {
                                  var r = n === e.length - 1
                                  return a.createElement(
                                      it,
                                      {
                                          key: n,
                                          active: r,
                                          index: n,
                                          addMicrodata: !!t.href
                                      },
                                      a.createElement(
                                          lt,
                                          { href: t.href, isLast: r },
                                          t.label
                                      )
                                  )
                              })
                          )
                      )
                    : null
            }
            const ct = "docItemContainer_Ngs0",
                st = "docItemCol_RYZb"
            function mt(e) {
                var t,
                    n,
                    r,
                    l,
                    i,
                    o,
                    s = e.children,
                    u =
                        ((t = c()),
                        (n = t.frontMatter),
                        (r = t.toc),
                        (l = (0, d.i)()),
                        (i = n.hide_table_of_contents),
                        (o = !i && r.length > 0),
                        {
                            hidden: i,
                            mobile: o ? a.createElement(he, null) : void 0,
                            desktop:
                                !o || ("desktop" !== l && "ssr" !== l)
                                    ? void 0
                                    : a.createElement(Ne, null)
                        })
                return a.createElement(
                    "div",
                    { className: "row" },
                    a.createElement(
                        "div",
                        { className: (0, m.Z)("col", !u.hidden && st) },
                        a.createElement(T, null),
                        a.createElement(
                            "div",
                            { className: ct },
                            a.createElement(
                                "article",
                                null,
                                a.createElement(ot, null),
                                a.createElement(x, null),
                                u.mobile,
                                a.createElement(Qe, null, s),
                                a.createElement(J, null)
                            ),
                            a.createElement(b, null)
                        )
                    ),
                    u.desktop &&
                        a.createElement(
                            "div",
                            { className: "col col--3" },
                            u.desktop
                        )
                )
            }
            function dt(e) {
                var t = "docs-doc-id-" + e.content.metadata.unversionedId,
                    n = e.content
                return a.createElement(
                    o,
                    { content: e.content },
                    a.createElement(
                        r.FG,
                        { className: t },
                        a.createElement(s, null),
                        a.createElement(mt, null, a.createElement(n, null))
                    )
                )
            }
        },
        2772: (e, t, n) => {
            n.d(t, { E: () => o, q: () => i })
            var a = n(9496),
                r = n(8798),
                l = a.createContext(null)
            function i(e) {
                var t = e.children,
                    n = e.version
                return a.createElement(l.Provider, { value: n }, t)
            }
            function o() {
                var e = (0, a.useContext)(l)
                if (null === e) throw new r.i6("DocsVersionProvider")
                return e
            }
        }
    }
])
