;(self.webpackChunkredo_dev = self.webpackChunkredo_dev || []).push([
    [918],
    {
        7965: (e, t, r) => {
            "use strict"
            r.d(t, { Zo: () => u, kt: () => d })
            var n = r(3889)
            function a(e, t, r) {
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
            function l(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var r = null != arguments[t] ? arguments[t] : {}
                    t % 2
                        ? o(Object(r), !0).forEach(function (t) {
                              a(e, t, r[t])
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
            function c(e, t) {
                if (null == e) return {}
                var r,
                    n,
                    a = (function (e, t) {
                        if (null == e) return {}
                        var r,
                            n,
                            a = {},
                            o = Object.keys(e)
                        for (n = 0; n < o.length; n++)
                            (r = o[n]), t.indexOf(r) >= 0 || (a[r] = e[r])
                        return a
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var o = Object.getOwnPropertySymbols(e)
                    for (n = 0; n < o.length; n++)
                        (r = o[n]),
                            t.indexOf(r) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    r
                                ) &&
                                    (a[r] = e[r]))
                }
                return a
            }
            var i = n.createContext({}),
                s = function (e) {
                    var t = n.useContext(i),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : l(l({}, t), e)),
                        r
                    )
                },
                u = function (e) {
                    var t = s(e.components)
                    return n.createElement(i.Provider, { value: t }, e.children)
                },
                m = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return n.createElement(n.Fragment, {}, t)
                    }
                },
                p = n.forwardRef(function (e, t) {
                    var r = e.components,
                        a = e.mdxType,
                        o = e.originalType,
                        i = e.parentName,
                        u = c(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        p = s(r),
                        d = a,
                        b = p["".concat(i, ".").concat(d)] || p[d] || m[d] || o
                    return r
                        ? n.createElement(
                              b,
                              l(l({ ref: t }, u), {}, { components: r })
                          )
                        : n.createElement(b, l({ ref: t }, u))
                })
            function d(e, t) {
                var r = arguments,
                    a = t && t.mdxType
                if ("string" == typeof e || a) {
                    var o = r.length,
                        l = new Array(o)
                    l[0] = p
                    var c = {}
                    for (var i in t) hasOwnProperty.call(t, i) && (c[i] = t[i])
                    ;(c.originalType = e),
                        (c.mdxType = "string" == typeof e ? e : a),
                        (l[1] = c)
                    for (var s = 2; s < o; s++) l[s] = r[s]
                    return n.createElement.apply(null, l)
                }
                return n.createElement.apply(null, r)
            }
            p.displayName = "MDXCreateElement"
        },
        1641: (e, t, r) => {
            "use strict"
            r.r(t), r.d(t, { default: () => Ca })
            var n = r(3889),
                a = r(1626),
                o = r(8110),
                l = r(9649),
                c = r(7833),
                i = r(8456),
                s = r(9533)
            function u(e) {
                const { permalink: t, title: r, subLabel: o, isNext: l } = e
                return n.createElement(
                    s.Z,
                    {
                        className: (0, a.Z)(
                            "pagination-nav__link",
                            l
                                ? "pagination-nav__link--next"
                                : "pagination-nav__link--prev"
                        ),
                        to: t
                    },
                    o &&
                        n.createElement(
                            "div",
                            { className: "pagination-nav__sublabel" },
                            o
                        ),
                    n.createElement(
                        "div",
                        { className: "pagination-nav__label" },
                        r
                    )
                )
            }
            var m = Object.defineProperty,
                p = Object.defineProperties,
                d = Object.getOwnPropertyDescriptors,
                b = Object.getOwnPropertySymbols,
                f = Object.prototype.hasOwnProperty,
                v = Object.prototype.propertyIsEnumerable,
                y = (e, t, r) =>
                    t in e
                        ? m(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                g = (e, t) => {
                    for (var r in t || (t = {})) f.call(t, r) && y(e, r, t[r])
                    if (b) for (var r of b(t)) v.call(t, r) && y(e, r, t[r])
                    return e
                },
                h = (e, t) => p(e, d(t))
            function O(e) {
                const { previous: t, next: r } = e
                return n.createElement(
                    "nav",
                    {
                        className: "pagination-nav docusaurus-mt-lg",
                        "aria-label": (0, i.I)({
                            id: "theme.docs.paginator.navAriaLabel",
                            message: "Docs pages navigation",
                            description:
                                "The ARIA label for the docs pagination"
                        })
                    },
                    t &&
                        n.createElement(
                            u,
                            h(g({}, t), {
                                subLabel: n.createElement(
                                    i.Z,
                                    {
                                        id: "theme.docs.paginator.previous",
                                        description:
                                            "The label used to navigate to the previous doc"
                                    },
                                    "Previous"
                                )
                            })
                        ),
                    r &&
                        n.createElement(
                            u,
                            h(g({}, r), {
                                subLabel: n.createElement(
                                    i.Z,
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
            var E = r(3552),
                j = r(8077),
                k = r(2848),
                w = r(3112),
                P = Object.defineProperty,
                N = Object.getOwnPropertySymbols,
                L = Object.prototype.hasOwnProperty,
                x = Object.prototype.propertyIsEnumerable,
                C = (e, t, r) =>
                    t in e
                        ? P(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            const _ = {
                unreleased: function ({ siteTitle: e, versionMetadata: t }) {
                    return n.createElement(
                        i.Z,
                        {
                            id: "theme.docs.versions.unreleasedVersionLabel",
                            description:
                                "The label used to tell the user that he's browsing an unreleased doc version",
                            values: {
                                siteTitle: e,
                                versionLabel: n.createElement(
                                    "b",
                                    null,
                                    t.label
                                )
                            }
                        },
                        "This is unreleased documentation for {siteTitle} {versionLabel} version."
                    )
                },
                unmaintained: function ({ siteTitle: e, versionMetadata: t }) {
                    return n.createElement(
                        i.Z,
                        {
                            id: "theme.docs.versions.unmaintainedVersionLabel",
                            description:
                                "The label used to tell the user that he's browsing an unmaintained doc version",
                            values: {
                                siteTitle: e,
                                versionLabel: n.createElement(
                                    "b",
                                    null,
                                    t.label
                                )
                            }
                        },
                        "This is documentation for {siteTitle} {versionLabel}, which is no longer actively maintained."
                    )
                }
            }
            function T(e) {
                const t = _[e.versionMetadata.banner]
                return n.createElement(
                    t,
                    ((e, t) => {
                        for (var r in t || (t = {}))
                            L.call(t, r) && C(e, r, t[r])
                        if (N) for (var r of N(t)) x.call(t, r) && C(e, r, t[r])
                        return e
                    })({}, e)
                )
            }
            function B({ versionLabel: e, to: t, onClick: r }) {
                return n.createElement(
                    i.Z,
                    {
                        id: "theme.docs.versions.latestVersionSuggestionLabel",
                        description:
                            "The label used to tell the user to check the latest version",
                        values: {
                            versionLabel: e,
                            latestVersionLink: n.createElement(
                                "b",
                                null,
                                n.createElement(
                                    s.Z,
                                    { to: t, onClick: r },
                                    n.createElement(
                                        i.Z,
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
            function I({ className: e, versionMetadata: t }) {
                const {
                        siteConfig: { title: r }
                    } = (0, E.Z)(),
                    { pluginId: o } = (0, j.gA)({ failfast: !0 }),
                    { savePreferredVersionName: l } = (0, k.J)(o),
                    { latestDocSuggestion: i, latestVersionSuggestion: s } = (0,
                    j.Jo)(o),
                    u =
                        null != i
                            ? i
                            : (m = s).docs.find((e) => e.id === m.mainDocId)
                var m
                return n.createElement(
                    "div",
                    {
                        className: (0, a.Z)(
                            e,
                            c.k.docs.docVersionBanner,
                            "alert alert--warning margin-bottom--md"
                        ),
                        role: "alert"
                    },
                    n.createElement(
                        "div",
                        null,
                        n.createElement(T, { siteTitle: r, versionMetadata: t })
                    ),
                    n.createElement(
                        "div",
                        { className: "margin-top--md" },
                        n.createElement(B, {
                            versionLabel: s.label,
                            to: u.path,
                            onClick: () => l(s.name)
                        })
                    )
                )
            }
            function S({ className: e }) {
                const t = (0, w.E)()
                return t.banner
                    ? n.createElement(I, { className: e, versionMetadata: t })
                    : null
            }
            function Z({ className: e }) {
                const t = (0, w.E)()
                return t.badge
                    ? n.createElement(
                          "span",
                          {
                              className: (0, a.Z)(
                                  e,
                                  c.k.docs.docVersionBadge,
                                  "badge badge--secondary"
                              )
                          },
                          n.createElement(
                              i.Z,
                              {
                                  id: "theme.docs.versionBadge.label",
                                  values: { versionLabel: t.label }
                              },
                              "Version: {versionLabel}"
                          )
                      )
                    : null
            }
            function A({ lastUpdatedAt: e, formattedLastUpdatedAt: t }) {
                return n.createElement(
                    i.Z,
                    {
                        id: "theme.lastUpdated.atDate",
                        description:
                            "The words used to describe on which date a page has been last updated",
                        values: {
                            date: n.createElement(
                                "b",
                                null,
                                n.createElement(
                                    "time",
                                    {
                                        dateTime: new Date(
                                            1e3 * e
                                        ).toISOString()
                                    },
                                    t
                                )
                            )
                        }
                    },
                    " on {date}"
                )
            }
            function H({ lastUpdatedBy: e }) {
                return n.createElement(
                    i.Z,
                    {
                        id: "theme.lastUpdated.byUser",
                        description:
                            "The words used to describe by who the page has been last updated",
                        values: { user: n.createElement("b", null, e) }
                    },
                    " by {user}"
                )
            }
            function D({
                lastUpdatedAt: e,
                formattedLastUpdatedAt: t,
                lastUpdatedBy: r
            }) {
                return n.createElement(
                    "span",
                    { className: c.k.common.lastUpdated },
                    n.createElement(
                        i.Z,
                        {
                            id: "theme.lastUpdated.lastUpdatedAtBy",
                            description:
                                "The sentence used to display when a page has been last updated, and by who",
                            values: {
                                atDate:
                                    e && t
                                        ? n.createElement(A, {
                                              lastUpdatedAt: e,
                                              formattedLastUpdatedAt: t
                                          })
                                        : "",
                                byUser: r
                                    ? n.createElement(H, { lastUpdatedBy: r })
                                    : ""
                            }
                        },
                        "Last updated{atDate}{byUser}"
                    ),
                    !1
                )
            }
            const U = "iconEdit_p_yb"
            var M = Object.defineProperty,
                R = Object.getOwnPropertySymbols,
                V = Object.prototype.hasOwnProperty,
                z = Object.prototype.propertyIsEnumerable,
                $ = (e, t, r) =>
                    t in e
                        ? M(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            function F(e) {
                var t = e,
                    { className: r } = t,
                    o = ((e, t) => {
                        var r = {}
                        for (var n in e)
                            V.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n])
                        if (null != e && R)
                            for (var n of R(e))
                                t.indexOf(n) < 0 &&
                                    z.call(e, n) &&
                                    (r[n] = e[n])
                        return r
                    })(t, ["className"])
                return n.createElement(
                    "svg",
                    ((e, t) => {
                        for (var r in t || (t = {}))
                            V.call(t, r) && $(e, r, t[r])
                        if (R) for (var r of R(t)) z.call(t, r) && $(e, r, t[r])
                        return e
                    })(
                        {
                            fill: "currentColor",
                            height: "20",
                            width: "20",
                            viewBox: "0 0 40 40",
                            className: (0, a.Z)(U, r),
                            "aria-hidden": "true"
                        },
                        o
                    ),
                    n.createElement(
                        "g",
                        null,
                        n.createElement("path", {
                            d: "m34.5 11.7l-3 3.1-6.3-6.3 3.1-3q0.5-0.5 1.2-0.5t1.1 0.5l3.9 3.9q0.5 0.4 0.5 1.1t-0.5 1.2z m-29.5 17.1l18.4-18.5 6.3 6.3-18.4 18.4h-6.3v-6.2z"
                        })
                    )
                )
            }
            function W({ editUrl: e }) {
                return n.createElement(
                    "a",
                    {
                        href: e,
                        target: "_blank",
                        rel: "noreferrer noopener",
                        className: c.k.common.editThisPage
                    },
                    n.createElement(F, null),
                    n.createElement(
                        i.Z,
                        {
                            id: "theme.common.editThisPage",
                            description:
                                "The link label to edit the current page"
                        },
                        "Edit this page"
                    )
                )
            }
            const q = "tag_OmHv",
                K = "tagRegular_KOBz",
                G = "tagWithCount_dPf3"
            function Q({ permalink: e, label: t, count: r }) {
                return n.createElement(
                    s.Z,
                    { href: e, className: (0, a.Z)(q, r ? G : K) },
                    t,
                    r && n.createElement("span", null, r)
                )
            }
            const J = "tags_KNvr",
                X = "tag_Mh7x"
            function Y({ tags: e }) {
                return n.createElement(
                    n.Fragment,
                    null,
                    n.createElement(
                        "b",
                        null,
                        n.createElement(
                            i.Z,
                            {
                                id: "theme.tags.tagsListLabel",
                                description: "The label alongside a tag list"
                            },
                            "Tags:"
                        )
                    ),
                    n.createElement(
                        "ul",
                        {
                            className: (0, a.Z)(
                                J,
                                "padding--none",
                                "margin-left--sm"
                            )
                        },
                        e.map(({ label: e, permalink: t }) =>
                            n.createElement(
                                "li",
                                { key: t, className: X },
                                n.createElement(Q, { label: e, permalink: t })
                            )
                        )
                    )
                )
            }
            const ee = "lastUpdated__8yt"
            var te = Object.defineProperty,
                re = Object.getOwnPropertySymbols,
                ne = Object.prototype.hasOwnProperty,
                ae = Object.prototype.propertyIsEnumerable,
                oe = (e, t, r) =>
                    t in e
                        ? te(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            function le(e) {
                return n.createElement(
                    "div",
                    {
                        className: (0, a.Z)(
                            c.k.docs.docFooterTagsRow,
                            "row margin-bottom--sm"
                        )
                    },
                    n.createElement(
                        "div",
                        { className: "col" },
                        n.createElement(
                            Y,
                            ((e, t) => {
                                for (var r in t || (t = {}))
                                    ne.call(t, r) && oe(e, r, t[r])
                                if (re)
                                    for (var r of re(t))
                                        ae.call(t, r) && oe(e, r, t[r])
                                return e
                            })({}, e)
                        )
                    )
                )
            }
            function ce({
                editUrl: e,
                lastUpdatedAt: t,
                lastUpdatedBy: r,
                formattedLastUpdatedAt: o
            }) {
                return n.createElement(
                    "div",
                    {
                        className: (0, a.Z)(
                            c.k.docs.docFooterEditMetaRow,
                            "row"
                        )
                    },
                    n.createElement(
                        "div",
                        { className: "col" },
                        e && n.createElement(W, { editUrl: e })
                    ),
                    n.createElement(
                        "div",
                        { className: (0, a.Z)("col", ee) },
                        (t || r) &&
                            n.createElement(D, {
                                lastUpdatedAt: t,
                                formattedLastUpdatedAt: o,
                                lastUpdatedBy: r
                            })
                    )
                )
            }
            function ie(e) {
                const { content: t } = e,
                    { metadata: r } = t,
                    {
                        editUrl: o,
                        lastUpdatedAt: l,
                        formattedLastUpdatedAt: i,
                        lastUpdatedBy: s,
                        tags: u
                    } = r,
                    m = u.length > 0,
                    p = !!(o || l || s)
                return m || p
                    ? n.createElement(
                          "footer",
                          {
                              className: (0, a.Z)(
                                  c.k.docs.docFooter,
                                  "docusaurus-mt-lg"
                              )
                          },
                          m && n.createElement(le, { tags: u }),
                          p &&
                              n.createElement(ce, {
                                  editUrl: o,
                                  lastUpdatedAt: l,
                                  lastUpdatedBy: s,
                                  formattedLastUpdatedAt: i
                              })
                      )
                    : null
            }
            var se = r(9681),
                ue = Object.defineProperty,
                me = Object.defineProperties,
                pe = Object.getOwnPropertyDescriptors,
                de = Object.getOwnPropertySymbols,
                be = Object.prototype.hasOwnProperty,
                fe = Object.prototype.propertyIsEnumerable,
                ve = (e, t, r) =>
                    t in e
                        ? ue(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                ye = (e, t) => {
                    for (var r in t || (t = {})) be.call(t, r) && ve(e, r, t[r])
                    if (de) for (var r of de(t)) fe.call(t, r) && ve(e, r, t[r])
                    return e
                },
                ge = (e, t) => me(e, pe(t))
            function he(e) {
                const t = e.map((e) =>
                        ge(ye({}, e), { parentIndex: -1, children: [] })
                    ),
                    r = Array(7).fill(-1)
                t.forEach((e, t) => {
                    const n = r.slice(2, e.level)
                    ;(e.parentIndex = Math.max(...n)), (r[e.level] = t)
                })
                const n = []
                return (
                    t.forEach((e) => {
                        const r = e,
                            { parentIndex: a } = r,
                            o = ((e, t) => {
                                var r = {}
                                for (var n in e)
                                    be.call(e, n) &&
                                        t.indexOf(n) < 0 &&
                                        (r[n] = e[n])
                                if (null != e && de)
                                    for (var n of de(e))
                                        t.indexOf(n) < 0 &&
                                            fe.call(e, n) &&
                                            (r[n] = e[n])
                                return r
                            })(r, ["parentIndex"])
                        a >= 0 ? t[a].children.push(o) : n.push(o)
                    }),
                    n
                )
            }
            function Oe({ toc: e, minHeadingLevel: t, maxHeadingLevel: r }) {
                return e.flatMap((e) => {
                    const n = Oe({
                        toc: e.children,
                        minHeadingLevel: t,
                        maxHeadingLevel: r
                    })
                    return (function (e) {
                        return e.level >= t && e.level <= r
                    })(e)
                        ? [ge(ye({}, e), { children: n })]
                        : n
                })
            }
            function Ee(e) {
                const t = e.getBoundingClientRect()
                return t.top === t.bottom ? Ee(e.parentNode) : t
            }
            function je(e, { anchorTopOffset: t }) {
                var r, n
                const a = e.find((e) => Ee(e).top >= t)
                if (a) {
                    return (function (e) {
                        return e.top > 0 && e.bottom < window.innerHeight / 2
                    })(Ee(a))
                        ? a
                        : null != (r = e[e.indexOf(a) - 1])
                        ? r
                        : null
                }
                return null != (n = e[e.length - 1]) ? n : null
            }
            function ke() {
                const e = (0, n.useRef)(0),
                    {
                        navbar: { hideOnScroll: t }
                    } = (0, se.L)()
                return (
                    (0, n.useEffect)(() => {
                        e.current = t
                            ? 0
                            : document.querySelector(".navbar").clientHeight
                    }, [t]),
                    e
                )
            }
            function we(e) {
                const t = (0, n.useRef)(void 0),
                    r = ke()
                ;(0, n.useEffect)(() => {
                    if (!e) return () => {}
                    const {
                        linkClassName: n,
                        linkActiveClassName: a,
                        minHeadingLevel: o,
                        maxHeadingLevel: l
                    } = e
                    function c() {
                        const e = (function (e) {
                                return Array.from(
                                    document.getElementsByClassName(e)
                                )
                            })(n),
                            c = (function ({
                                minHeadingLevel: e,
                                maxHeadingLevel: t
                            }) {
                                const r = []
                                for (let n = e; n <= t; n += 1)
                                    r.push(`h${n}.anchor`)
                                return Array.from(
                                    document.querySelectorAll(r.join())
                                )
                            })({ minHeadingLevel: o, maxHeadingLevel: l }),
                            i = je(c, { anchorTopOffset: r.current }),
                            s = e.find(
                                (e) =>
                                    i &&
                                    i.id ===
                                        (function (e) {
                                            return decodeURIComponent(
                                                e.href.substring(
                                                    e.href.indexOf("#") + 1
                                                )
                                            )
                                        })(e)
                            )
                        e.forEach((e) => {
                            !(function (e, r) {
                                r
                                    ? (t.current &&
                                          t.current !== e &&
                                          t.current.classList.remove(a),
                                      e.classList.add(a),
                                      (t.current = e))
                                    : e.classList.remove(a)
                            })(e, e === s)
                        })
                    }
                    return (
                        document.addEventListener("scroll", c),
                        document.addEventListener("resize", c),
                        c(),
                        () => {
                            document.removeEventListener("scroll", c),
                                document.removeEventListener("resize", c)
                        }
                    )
                }, [e, r])
            }
            const Pe = n.memo(function e({
                toc: t,
                className: r,
                linkClassName: a,
                isChild: o
            }) {
                return t.length
                    ? n.createElement(
                          "ul",
                          { className: o ? void 0 : r },
                          t.map((t) =>
                              n.createElement(
                                  "li",
                                  { key: t.id },
                                  n.createElement("a", {
                                      href: `#${t.id}`,
                                      className: null != a ? a : void 0,
                                      dangerouslySetInnerHTML: {
                                          __html: t.value
                                      }
                                  }),
                                  n.createElement(e, {
                                      isChild: !0,
                                      toc: t.children,
                                      className: r,
                                      linkClassName: a
                                  })
                              )
                          )
                      )
                    : null
            })
            var Ne = Object.defineProperty,
                Le = Object.getOwnPropertySymbols,
                xe = Object.prototype.hasOwnProperty,
                Ce = Object.prototype.propertyIsEnumerable,
                _e = (e, t, r) =>
                    t in e
                        ? Ne(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            function Te(e) {
                var t = e,
                    {
                        toc: r,
                        className:
                            a = "table-of-contents table-of-contents__left-border",
                        linkClassName: o = "table-of-contents__link",
                        linkActiveClassName: l,
                        minHeadingLevel: c,
                        maxHeadingLevel: i
                    } = t,
                    s = ((e, t) => {
                        var r = {}
                        for (var n in e)
                            xe.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n])
                        if (null != e && Le)
                            for (var n of Le(e))
                                t.indexOf(n) < 0 &&
                                    Ce.call(e, n) &&
                                    (r[n] = e[n])
                        return r
                    })(t, [
                        "toc",
                        "className",
                        "linkClassName",
                        "linkActiveClassName",
                        "minHeadingLevel",
                        "maxHeadingLevel"
                    ])
                const u = (0, se.L)(),
                    m = null != c ? c : u.tableOfContents.minHeadingLevel,
                    p = null != i ? i : u.tableOfContents.maxHeadingLevel,
                    d = (function ({
                        toc: e,
                        minHeadingLevel: t,
                        maxHeadingLevel: r
                    }) {
                        return (0, n.useMemo)(
                            () =>
                                Oe({
                                    toc: he(e),
                                    minHeadingLevel: t,
                                    maxHeadingLevel: r
                                }),
                            [e, t, r]
                        )
                    })({ toc: r, minHeadingLevel: m, maxHeadingLevel: p })
                return (
                    we(
                        (0, n.useMemo)(() => {
                            if (o && l)
                                return {
                                    linkClassName: o,
                                    linkActiveClassName: l,
                                    minHeadingLevel: m,
                                    maxHeadingLevel: p
                                }
                        }, [o, l, m, p])
                    ),
                    n.createElement(
                        Pe,
                        ((e, t) => {
                            for (var r in t || (t = {}))
                                xe.call(t, r) && _e(e, r, t[r])
                            if (Le)
                                for (var r of Le(t))
                                    Ce.call(t, r) && _e(e, r, t[r])
                            return e
                        })({ toc: d, className: a, linkClassName: o }, s)
                    )
                )
            }
            const Be = "tableOfContents_tQTn"
            var Ie = Object.defineProperty,
                Se = Object.defineProperties,
                Ze = Object.getOwnPropertyDescriptors,
                Ae = Object.getOwnPropertySymbols,
                He = Object.prototype.hasOwnProperty,
                De = Object.prototype.propertyIsEnumerable,
                Ue = (e, t, r) =>
                    t in e
                        ? Ie(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            function Me(e) {
                var t,
                    r = e,
                    { className: o } = r,
                    l = ((e, t) => {
                        var r = {}
                        for (var n in e)
                            He.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n])
                        if (null != e && Ae)
                            for (var n of Ae(e))
                                t.indexOf(n) < 0 &&
                                    De.call(e, n) &&
                                    (r[n] = e[n])
                        return r
                    })(r, ["className"])
                return n.createElement(
                    "div",
                    { className: (0, a.Z)(Be, "thin-scrollbar", o) },
                    n.createElement(
                        Te,
                        ((t = ((e, t) => {
                            for (var r in t || (t = {}))
                                He.call(t, r) && Ue(e, r, t[r])
                            if (Ae)
                                for (var r of Ae(t))
                                    De.call(t, r) && Ue(e, r, t[r])
                            return e
                        })({}, l)),
                        Se(
                            t,
                            Ze({
                                linkClassName:
                                    "table-of-contents__link toc-highlight",
                                linkActiveClassName:
                                    "table-of-contents__link--active"
                            })
                        ))
                    )
                )
            }
            var Re = r(968)
            const Ve = "tocCollapsibleButton_UkVg",
                ze = "tocCollapsibleButtonExpanded_D6qg"
            var $e = Object.defineProperty,
                Fe = Object.defineProperties,
                We = Object.getOwnPropertyDescriptors,
                qe = Object.getOwnPropertySymbols,
                Ke = Object.prototype.hasOwnProperty,
                Ge = Object.prototype.propertyIsEnumerable,
                Qe = (e, t, r) =>
                    t in e
                        ? $e(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            function Je(e) {
                var t,
                    r,
                    o = e,
                    { collapsed: l } = o,
                    c = ((e, t) => {
                        var r = {}
                        for (var n in e)
                            Ke.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n])
                        if (null != e && qe)
                            for (var n of qe(e))
                                t.indexOf(n) < 0 &&
                                    Ge.call(e, n) &&
                                    (r[n] = e[n])
                        return r
                    })(o, ["collapsed"])
                return n.createElement(
                    "button",
                    ((t = ((e, t) => {
                        for (var r in t || (t = {}))
                            Ke.call(t, r) && Qe(e, r, t[r])
                        if (qe)
                            for (var r of qe(t)) Ge.call(t, r) && Qe(e, r, t[r])
                        return e
                    })({ type: "button" }, c)),
                    (r = {
                        className: (0, a.Z)(
                            "clean-btn",
                            Ve,
                            !l && ze,
                            c.className
                        )
                    }),
                    Fe(t, We(r))),
                    n.createElement(
                        i.Z,
                        {
                            id: "theme.TOCCollapsible.toggleButtonLabel",
                            description:
                                "The label used by the button on the collapsible TOC component"
                        },
                        "On this page"
                    )
                )
            }
            const Xe = "tocCollapsible_bKvJ",
                Ye = "tocCollapsibleContent_vfKp",
                et = "tocCollapsibleExpanded_KtBU"
            function tt({
                toc: e,
                className: t,
                minHeadingLevel: r,
                maxHeadingLevel: o
            }) {
                const { collapsed: l, toggleCollapsed: c } = (0, Re.u)({
                    initialState: !0
                })
                return n.createElement(
                    "div",
                    { className: (0, a.Z)(Xe, !l && et, t) },
                    n.createElement(Je, { collapsed: l, onClick: c }),
                    n.createElement(
                        Re.z,
                        { lazy: !0, className: Ye, collapsed: l },
                        n.createElement(Te, {
                            toc: e,
                            minHeadingLevel: r,
                            maxHeadingLevel: o
                        })
                    )
                )
            }
            const rt = "anchorWithStickyNavbar_wkof",
                nt = "anchorWithHideOnScrollNavbar_qQm8"
            var at = Object.defineProperty,
                ot = Object.defineProperties,
                lt = Object.getOwnPropertyDescriptors,
                ct = Object.getOwnPropertySymbols,
                it = Object.prototype.hasOwnProperty,
                st = Object.prototype.propertyIsEnumerable,
                ut = (e, t, r) =>
                    t in e
                        ? at(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                mt = (e, t) => {
                    for (var r in t || (t = {})) it.call(t, r) && ut(e, r, t[r])
                    if (ct) for (var r of ct(t)) st.call(t, r) && ut(e, r, t[r])
                    return e
                },
                pt = (e, t) => ot(e, lt(t))
            function dt(e) {
                var t = e,
                    { as: r, id: o } = t,
                    l = ((e, t) => {
                        var r = {}
                        for (var n in e)
                            it.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n])
                        if (null != e && ct)
                            for (var n of ct(e))
                                t.indexOf(n) < 0 &&
                                    st.call(e, n) &&
                                    (r[n] = e[n])
                        return r
                    })(t, ["as", "id"])
                const {
                    navbar: { hideOnScroll: c }
                } = (0, se.L)()
                return "h1" !== r && o
                    ? n.createElement(
                          r,
                          pt(mt({}, l), {
                              className: (0, a.Z)("anchor", c ? nt : rt),
                              id: o
                          }),
                          l.children,
                          n.createElement(
                              "a",
                              {
                                  className: "hash-link",
                                  href: `#${o}`,
                                  title: (0, i.I)({
                                      id: "theme.common.headingLinkTitle",
                                      message: "Direct link to heading",
                                      description: "Title for link to heading"
                                  })
                              },
                              "\u200b"
                          )
                      )
                    : n.createElement(r, pt(mt({}, l), { id: void 0 }))
            }
            var bt = r(3224),
                ft = r(7826),
                vt = r(2008),
                yt = Object.defineProperty,
                gt = Object.getOwnPropertySymbols,
                ht = Object.prototype.hasOwnProperty,
                Ot = Object.prototype.propertyIsEnumerable,
                Et = (e, t, r) =>
                    t in e
                        ? yt(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            function jt(e) {
                return n.createElement(
                    "svg",
                    ((e, t) => {
                        for (var r in t || (t = {}))
                            ht.call(t, r) && Et(e, r, t[r])
                        if (gt)
                            for (var r of gt(t)) Ot.call(t, r) && Et(e, r, t[r])
                        return e
                    })({ viewBox: "0 0 24 24" }, e),
                    n.createElement("path", {
                        d: "M10 19v-5h4v5c0 .55.45 1 1 1h3c.55 0 1-.45 1-1v-7h1.7c.46 0 .68-.57.33-.87L12.67 3.6c-.38-.34-.96-.34-1.34 0l-8.36 7.53c-.34.3-.13.87.33.87H5v7c0 .55.45 1 1 1h3c.55 0 1-.45 1-1z",
                        fill: "currentColor"
                    })
                )
            }
            const kt = {
                breadcrumbsContainer: "breadcrumbsContainer_PHPI",
                breadcrumbHomeIcon: "breadcrumbHomeIcon_OKOP"
            }
            var wt = Object.defineProperty,
                Pt = Object.defineProperties,
                Nt = Object.getOwnPropertyDescriptors,
                Lt = Object.getOwnPropertySymbols,
                xt = Object.prototype.hasOwnProperty,
                Ct = Object.prototype.propertyIsEnumerable,
                _t = (e, t, r) =>
                    t in e
                        ? wt(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            function Tt({ children: e, href: t, isLast: r }) {
                const a = "breadcrumbs__link"
                return r
                    ? n.createElement(
                          "span",
                          { className: a, itemProp: "name" },
                          e
                      )
                    : t
                    ? n.createElement(
                          s.Z,
                          { className: a, href: t, itemProp: "item" },
                          n.createElement("span", { itemProp: "name" }, e)
                      )
                    : n.createElement("span", { className: a }, e)
            }
            function Bt({ children: e, active: t, index: r, addMicrodata: o }) {
                return n.createElement(
                    "li",
                    ((l = ((e, t) => {
                        for (var r in t || (t = {}))
                            xt.call(t, r) && _t(e, r, t[r])
                        if (Lt)
                            for (var r of Lt(t)) Ct.call(t, r) && _t(e, r, t[r])
                        return e
                    })(
                        {},
                        o && {
                            itemScope: !0,
                            itemProp: "itemListElement",
                            itemType: "https://schema.org/ListItem"
                        }
                    )),
                    (c = {
                        className: (0, a.Z)("breadcrumbs__item", {
                            "breadcrumbs__item--active": t
                        })
                    }),
                    Pt(l, Nt(c))),
                    e,
                    n.createElement("meta", {
                        itemProp: "position",
                        content: String(r + 1)
                    })
                )
                var l, c
            }
            function It() {
                const e = (0, vt.Z)("/")
                return n.createElement(
                    "li",
                    { className: "breadcrumbs__item" },
                    n.createElement(
                        s.Z,
                        {
                            "aria-label": (0, i.I)({
                                id: "theme.docs.breadcrumbs.home",
                                message: "Home page",
                                description:
                                    "The ARIA label for the home page in the breadcrumbs"
                            }),
                            className: (0, a.Z)(
                                "breadcrumbs__link",
                                kt.breadcrumbsItemLink
                            ),
                            href: e
                        },
                        n.createElement(jt, {
                            className: kt.breadcrumbHomeIcon
                        })
                    )
                )
            }
            function St() {
                const e = (0, bt.s1)(),
                    t = (0, ft.Ns)()
                return e
                    ? n.createElement(
                          "nav",
                          {
                              className: (0, a.Z)(
                                  c.k.docs.docBreadcrumbs,
                                  kt.breadcrumbsContainer
                              ),
                              "aria-label": (0, i.I)({
                                  id: "theme.docs.breadcrumbs.navAriaLabel",
                                  message: "Breadcrumbs",
                                  description:
                                      "The ARIA label for the breadcrumbs"
                              })
                          },
                          n.createElement(
                              "ul",
                              {
                                  className: "breadcrumbs",
                                  itemScope: !0,
                                  itemType: "https://schema.org/BreadcrumbList"
                              },
                              t && n.createElement(It, null),
                              e.map((t, r) => {
                                  const a = r === e.length - 1
                                  return n.createElement(
                                      Bt,
                                      {
                                          key: r,
                                          active: a,
                                          index: r,
                                          addMicrodata: !!t.href
                                      },
                                      n.createElement(
                                          Tt,
                                          { href: t.href, isLast: a },
                                          t.label
                                      )
                                  )
                              })
                          )
                      )
                    : null
            }
            var Zt = r(7965),
                At = r(4207),
                Ht = Object.defineProperty,
                Dt = Object.getOwnPropertySymbols,
                Ut = Object.prototype.hasOwnProperty,
                Mt = Object.prototype.propertyIsEnumerable,
                Rt = (e, t, r) =>
                    t in e
                        ? Ht(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            function Vt(e) {
                var t
                if (
                    (null == (t = e.props) ? void 0 : t.mdxType) &&
                    e.props.originalType
                ) {
                    const t = e.props,
                        { mdxType: r, originalType: a } = t,
                        o = ((e, t) => {
                            var r = {}
                            for (var n in e)
                                Ut.call(e, n) &&
                                    t.indexOf(n) < 0 &&
                                    (r[n] = e[n])
                            if (null != e && Dt)
                                for (var n of Dt(e))
                                    t.indexOf(n) < 0 &&
                                        Mt.call(e, n) &&
                                        (r[n] = e[n])
                            return r
                        })(t, ["mdxType", "originalType"])
                    return n.createElement(e.props.originalType, o)
                }
                return e
            }
            var zt = r(2178),
                $t = r(6664)
            function Ft() {
                const { prism: e } = (0, se.L)(),
                    { colorMode: t } = (0, $t.I)(),
                    r = e.theme,
                    n = e.darkTheme || r
                return "dark" === t ? n : r
            }
            var Wt = r(7226),
                qt = r.n(Wt)
            const Kt = new RegExp("title=(?<quote>[\"'])(?<title>.*?)\\1"),
                Gt = new RegExp("\\{(?<range>[\\d,-]+)\\}"),
                Qt = {
                    js: { start: "\\/\\/", end: "" },
                    jsBlock: { start: "\\/\\*", end: "\\*\\/" },
                    jsx: { start: "\\{\\s*\\/\\*", end: "\\*\\/\\s*\\}" },
                    bash: { start: "#", end: "" },
                    html: { start: "\x3c!--", end: "--\x3e" }
                }
            function Jt(e, t) {
                const r = e
                    .map((e) => {
                        const { start: r, end: n } = Qt[e]
                        return `(?:${r}\\s*(${t
                            .flatMap((e) => {
                                var t, r
                                return [
                                    e.line,
                                    null == (t = e.block) ? void 0 : t.start,
                                    null == (r = e.block) ? void 0 : r.end
                                ].filter(Boolean)
                            })
                            .join("|")})\\s*${n})`
                    })
                    .join("|")
                return new RegExp(`^\\s*(?:${r})\\s*$`)
            }
            function Xt(e, t) {
                let r = e.replace(/\n$/, "")
                const { language: n, magicComments: a, metastring: o } = t
                if (o && Gt.test(o)) {
                    const e = o.match(Gt).groups.range
                    if (0 === a.length)
                        throw new Error(
                            `A highlight range has been given in code block's metastring (\`\`\` ${o}), but no magic comment config is available. Docusaurus applies the first magic comment entry's className for metastring ranges.`
                        )
                    const t = a[0].className,
                        n = qt()(e)
                            .filter((e) => e > 0)
                            .map((e) => [e - 1, [t]])
                    return { lineClassNames: Object.fromEntries(n), code: r }
                }
                if (void 0 === n) return { lineClassNames: {}, code: r }
                const l = (function (e, t) {
                        switch (e) {
                            case "js":
                            case "javascript":
                            case "ts":
                            case "typescript":
                                return Jt(["js", "jsBlock"], t)
                            case "jsx":
                            case "tsx":
                                return Jt(["js", "jsBlock", "jsx"], t)
                            case "html":
                                return Jt(["js", "jsBlock", "html"], t)
                            case "python":
                            case "py":
                            case "bash":
                                return Jt(["bash"], t)
                            case "markdown":
                            case "md":
                                return Jt(["html", "jsx", "bash"], t)
                            default:
                                return Jt(Object.keys(Qt), t)
                        }
                    })(n, a),
                    c = r.split("\n"),
                    i = Object.fromEntries(
                        a.map((e) => [e.className, { start: 0, range: "" }])
                    ),
                    s = Object.fromEntries(
                        a
                            .filter((e) => e.line)
                            .map(({ className: e, line: t }) => [t, e])
                    ),
                    u = Object.fromEntries(
                        a
                            .filter((e) => e.block)
                            .map(({ className: e, block: t }) => [t.start, e])
                    ),
                    m = Object.fromEntries(
                        a
                            .filter((e) => e.block)
                            .map(({ className: e, block: t }) => [t.end, e])
                    )
                for (let d = 0; d < c.length; ) {
                    const e = c[d].match(l)
                    if (!e) {
                        d += 1
                        continue
                    }
                    const t = e.slice(1).find((e) => void 0 !== e)
                    s[t]
                        ? (i[s[t]].range += `${d},`)
                        : u[t]
                        ? (i[u[t]].start = d)
                        : m[t] &&
                          (i[m[t]].range += `${i[m[t]].start}-${d - 1},`),
                        c.splice(d, 1)
                }
                r = c.join("\n")
                const p = {}
                return (
                    Object.entries(i).forEach(([e, { range: t }]) => {
                        qt()(t).forEach((t) => {
                            null != p[t] || (p[t] = []), p[t].push(e)
                        })
                    }),
                    { lineClassNames: p, code: r }
                )
            }
            const Yt = "codeBlockContainer_gu10"
            var er = Object.defineProperty,
                tr = Object.defineProperties,
                rr = Object.getOwnPropertyDescriptors,
                nr = Object.getOwnPropertySymbols,
                ar = Object.prototype.hasOwnProperty,
                or = Object.prototype.propertyIsEnumerable,
                lr = (e, t, r) =>
                    t in e
                        ? er(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            function cr(e) {
                var t = e,
                    { as: r } = t,
                    o = ((e, t) => {
                        var r = {}
                        for (var n in e)
                            ar.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n])
                        if (null != e && nr)
                            for (var n of nr(e))
                                t.indexOf(n) < 0 &&
                                    or.call(e, n) &&
                                    (r[n] = e[n])
                        return r
                    })(t, ["as"])
                const l = (function (e) {
                    const t = {
                            color: "--prism-color",
                            backgroundColor: "--prism-background-color"
                        },
                        r = {}
                    return (
                        Object.entries(e.plain).forEach(([e, n]) => {
                            const a = t[e]
                            a && "string" == typeof n && (r[a] = n)
                        }),
                        r
                    )
                })(Ft())
                return n.createElement(
                    r,
                    ((i = ((e, t) => {
                        for (var r in t || (t = {}))
                            ar.call(t, r) && lr(e, r, t[r])
                        if (nr)
                            for (var r of nr(t)) or.call(t, r) && lr(e, r, t[r])
                        return e
                    })({}, o)),
                    (s = {
                        style: l,
                        className: (0, a.Z)(
                            o.className,
                            Yt,
                            c.k.common.codeBlock
                        )
                    }),
                    tr(i, rr(s)))
                )
                var i, s
            }
            const ir = {
                codeBlockContent: "codeBlockContent_lan4",
                codeBlockTitle: "codeBlockTitle_b1TN",
                codeBlock: "codeBlock_hmUP",
                codeBlockStandalone: "codeBlockStandalone_yAIi",
                codeBlockLines: "codeBlockLines_Qb6Z",
                codeBlockLinesWithNumbering: "codeBlockLinesWithNumbering_Aega",
                buttonGroup: "buttonGroup_mnCh"
            }
            function sr({ children: e, className: t }) {
                return n.createElement(
                    cr,
                    {
                        as: "pre",
                        tabIndex: 0,
                        className: (0, a.Z)(
                            ir.codeBlockStandalone,
                            "thin-scrollbar",
                            t
                        )
                    },
                    n.createElement("code", { className: ir.codeBlockLines }, e)
                )
            }
            const ur = {
                plain: { backgroundColor: "#2a2734", color: "#9a86fd" },
                styles: [
                    {
                        types: [
                            "comment",
                            "prolog",
                            "doctype",
                            "cdata",
                            "punctuation"
                        ],
                        style: { color: "#6c6783" }
                    },
                    { types: ["namespace"], style: { opacity: 0.7 } },
                    {
                        types: ["tag", "operator", "number"],
                        style: { color: "#e09142" }
                    },
                    {
                        types: ["property", "function"],
                        style: { color: "#9a86fd" }
                    },
                    {
                        types: ["tag-id", "selector", "atrule-id"],
                        style: { color: "#eeebff" }
                    },
                    { types: ["attr-name"], style: { color: "#c4b9fe" } },
                    {
                        types: [
                            "boolean",
                            "string",
                            "entity",
                            "url",
                            "attr-value",
                            "keyword",
                            "control",
                            "directive",
                            "unit",
                            "statement",
                            "regex",
                            "at-rule",
                            "placeholder",
                            "variable"
                        ],
                        style: { color: "#ffcc99" }
                    },
                    {
                        types: ["deleted"],
                        style: { textDecorationLine: "line-through" }
                    },
                    {
                        types: ["inserted"],
                        style: { textDecorationLine: "underline" }
                    },
                    { types: ["italic"], style: { fontStyle: "italic" } },
                    {
                        types: ["important", "bold"],
                        style: { fontWeight: "bold" }
                    },
                    { types: ["important"], style: { color: "#c4b9fe" } }
                ]
            }
            var mr = { Prism: r(447).Z, theme: ur }
            function pr(e, t, r) {
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
            function dr() {
                return (
                    (dr =
                        Object.assign ||
                        function (e) {
                            for (var t = 1; t < arguments.length; t++) {
                                var r = arguments[t]
                                for (var n in r)
                                    Object.prototype.hasOwnProperty.call(
                                        r,
                                        n
                                    ) && (e[n] = r[n])
                            }
                            return e
                        }),
                    dr.apply(this, arguments)
                )
            }
            var br = /\r\n|\r|\n/,
                fr = function (e) {
                    0 === e.length
                        ? e.push({ types: ["plain"], content: "\n", empty: !0 })
                        : 1 === e.length &&
                          "" === e[0].content &&
                          ((e[0].content = "\n"), (e[0].empty = !0))
                },
                vr = function (e, t) {
                    var r = e.length
                    return r > 0 && e[r - 1] === t ? e : e.concat(t)
                },
                yr = function (e, t) {
                    var r = e.plain,
                        n = Object.create(null),
                        a = e.styles.reduce(function (e, r) {
                            var n = r.languages,
                                a = r.style
                            return (
                                (n && !n.includes(t)) ||
                                    r.types.forEach(function (t) {
                                        var r = dr({}, e[t], a)
                                        e[t] = r
                                    }),
                                e
                            )
                        }, n)
                    return (
                        (a.root = r),
                        (a.plain = dr({}, r, { backgroundColor: null })),
                        a
                    )
                }
            function gr(e, t) {
                var r = {}
                for (var n in e)
                    Object.prototype.hasOwnProperty.call(e, n) &&
                        -1 === t.indexOf(n) &&
                        (r[n] = e[n])
                return r
            }
            const hr = (function (e) {
                    function t() {
                        for (var t = this, r = [], n = arguments.length; n--; )
                            r[n] = arguments[n]
                        e.apply(this, r),
                            pr(this, "getThemeDict", function (e) {
                                if (
                                    void 0 !== t.themeDict &&
                                    e.theme === t.prevTheme &&
                                    e.language === t.prevLanguage
                                )
                                    return t.themeDict
                                ;(t.prevTheme = e.theme),
                                    (t.prevLanguage = e.language)
                                var r = e.theme
                                    ? yr(e.theme, e.language)
                                    : void 0
                                return (t.themeDict = r)
                            }),
                            pr(this, "getLineProps", function (e) {
                                var r = e.key,
                                    n = e.className,
                                    a = e.style,
                                    o = dr(
                                        {},
                                        gr(e, [
                                            "key",
                                            "className",
                                            "style",
                                            "line"
                                        ]),
                                        {
                                            className: "token-line",
                                            style: void 0,
                                            key: void 0
                                        }
                                    ),
                                    l = t.getThemeDict(t.props)
                                return (
                                    void 0 !== l && (o.style = l.plain),
                                    void 0 !== a &&
                                        (o.style =
                                            void 0 !== o.style
                                                ? dr({}, o.style, a)
                                                : a),
                                    void 0 !== r && (o.key = r),
                                    n && (o.className += " " + n),
                                    o
                                )
                            }),
                            pr(this, "getStyleForToken", function (e) {
                                var r = e.types,
                                    n = e.empty,
                                    a = r.length,
                                    o = t.getThemeDict(t.props)
                                if (void 0 !== o) {
                                    if (1 === a && "plain" === r[0])
                                        return n
                                            ? { display: "inline-block" }
                                            : void 0
                                    if (1 === a && !n) return o[r[0]]
                                    var l = n
                                            ? { display: "inline-block" }
                                            : {},
                                        c = r.map(function (e) {
                                            return o[e]
                                        })
                                    return Object.assign.apply(
                                        Object,
                                        [l].concat(c)
                                    )
                                }
                            }),
                            pr(this, "getTokenProps", function (e) {
                                var r = e.key,
                                    n = e.className,
                                    a = e.style,
                                    o = e.token,
                                    l = dr(
                                        {},
                                        gr(e, [
                                            "key",
                                            "className",
                                            "style",
                                            "token"
                                        ]),
                                        {
                                            className:
                                                "token " + o.types.join(" "),
                                            children: o.content,
                                            style: t.getStyleForToken(o),
                                            key: void 0
                                        }
                                    )
                                return (
                                    void 0 !== a &&
                                        (l.style =
                                            void 0 !== l.style
                                                ? dr({}, l.style, a)
                                                : a),
                                    void 0 !== r && (l.key = r),
                                    n && (l.className += " " + n),
                                    l
                                )
                            }),
                            pr(this, "tokenize", function (e, t, r, n) {
                                var a = {
                                    code: t,
                                    grammar: r,
                                    language: n,
                                    tokens: []
                                }
                                e.hooks.run("before-tokenize", a)
                                var o = (a.tokens = e.tokenize(
                                    a.code,
                                    a.grammar,
                                    a.language
                                ))
                                return e.hooks.run("after-tokenize", a), o
                            })
                    }
                    return (
                        e && (t.__proto__ = e),
                        (t.prototype = Object.create(e && e.prototype)),
                        (t.prototype.constructor = t),
                        (t.prototype.render = function () {
                            var e = this.props,
                                t = e.Prism,
                                r = e.language,
                                n = e.code,
                                a = e.children,
                                o = this.getThemeDict(this.props),
                                l = t.languages[r]
                            return a({
                                tokens: (function (e) {
                                    for (
                                        var t = [[]],
                                            r = [e],
                                            n = [0],
                                            a = [e.length],
                                            o = 0,
                                            l = 0,
                                            c = [],
                                            i = [c];
                                        l > -1;

                                    ) {
                                        for (; (o = n[l]++) < a[l]; ) {
                                            var s = void 0,
                                                u = t[l],
                                                m = r[l][o]
                                            if (
                                                ("string" == typeof m
                                                    ? ((u =
                                                          l > 0
                                                              ? u
                                                              : ["plain"]),
                                                      (s = m))
                                                    : ((u = vr(u, m.type)),
                                                      m.alias &&
                                                          (u = vr(u, m.alias)),
                                                      (s = m.content)),
                                                "string" == typeof s)
                                            ) {
                                                var p = s.split(br),
                                                    d = p.length
                                                c.push({
                                                    types: u,
                                                    content: p[0]
                                                })
                                                for (var b = 1; b < d; b++)
                                                    fr(c),
                                                        i.push((c = [])),
                                                        c.push({
                                                            types: u,
                                                            content: p[b]
                                                        })
                                            } else
                                                l++,
                                                    t.push(u),
                                                    r.push(s),
                                                    n.push(0),
                                                    a.push(s.length)
                                        }
                                        l--, t.pop(), r.pop(), n.pop(), a.pop()
                                    }
                                    return fr(c), i
                                })(
                                    void 0 !== l
                                        ? this.tokenize(t, n, l, r)
                                        : [n]
                                ),
                                className: "prism-code language-" + r,
                                style: void 0 !== o ? o.root : {},
                                getLineProps: this.getLineProps,
                                getTokenProps: this.getTokenProps
                            })
                        }),
                        t
                    )
                })(n.Component),
                Or = "codeLine_PlIa",
                Er = "codeLineNumber_P6td",
                jr = "codeLineContent__xl_"
            var kr = Object.defineProperty,
                wr = Object.getOwnPropertySymbols,
                Pr = Object.prototype.hasOwnProperty,
                Nr = Object.prototype.propertyIsEnumerable,
                Lr = (e, t, r) =>
                    t in e
                        ? kr(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                xr = (e, t) => {
                    for (var r in t || (t = {})) Pr.call(t, r) && Lr(e, r, t[r])
                    if (wr) for (var r of wr(t)) Nr.call(t, r) && Lr(e, r, t[r])
                    return e
                }
            function Cr({
                line: e,
                classNames: t,
                showLineNumbers: r,
                getLineProps: o,
                getTokenProps: l
            }) {
                1 === e.length && "\n" === e[0].content && (e[0].content = "")
                const c = o({ line: e, className: (0, a.Z)(t, r && Or) }),
                    i = e.map((e, t) =>
                        n.createElement(
                            "span",
                            xr({ key: t }, l({ token: e, key: t }))
                        )
                    )
                return n.createElement(
                    "span",
                    xr({}, c),
                    r
                        ? n.createElement(
                              n.Fragment,
                              null,
                              n.createElement("span", { className: Er }),
                              n.createElement("span", { className: jr }, i)
                          )
                        : n.createElement(
                              n.Fragment,
                              null,
                              i,
                              n.createElement("br", null)
                          )
                )
            }
            const _r = {
                copyButtonCopied: "copyButtonCopied_jTjp",
                copyButtonIcons: "copyButtonIcons_g9Ap",
                copyButtonIcon: "copyButtonIcon_kqE8",
                copyButtonSuccessIcon: "copyButtonSuccessIcon_X0Tk"
            }
            function Tr({ code: e, className: t }) {
                const [r, o] = (0, n.useState)(!1),
                    l = (0, n.useRef)(void 0),
                    c = (0, n.useCallback)(() => {
                        !(function (e, { target: t = document.body } = {}) {
                            const r = document.createElement("textarea"),
                                n = document.activeElement
                            ;(r.value = e),
                                r.setAttribute("readonly", ""),
                                (r.style.contain = "strict"),
                                (r.style.position = "absolute"),
                                (r.style.left = "-9999px"),
                                (r.style.fontSize = "12pt")
                            const a = document.getSelection()
                            let o = !1
                            a.rangeCount > 0 && (o = a.getRangeAt(0)),
                                t.append(r),
                                r.select(),
                                (r.selectionStart = 0),
                                (r.selectionEnd = e.length)
                            let l = !1
                            try {
                                l = document.execCommand("copy")
                            } catch (c) {}
                            r.remove(),
                                o && (a.removeAllRanges(), a.addRange(o)),
                                n && n.focus()
                        })(e),
                            o(!0),
                            (l.current = window.setTimeout(() => {
                                o(!1)
                            }, 1e3))
                    }, [e])
                return (
                    (0, n.useEffect)(
                        () => () => window.clearTimeout(l.current),
                        []
                    ),
                    n.createElement(
                        "button",
                        {
                            type: "button",
                            "aria-label": r
                                ? (0, i.I)({
                                      id: "theme.CodeBlock.copied",
                                      message: "Copied",
                                      description:
                                          "The copied button label on code blocks"
                                  })
                                : (0, i.I)({
                                      id: "theme.CodeBlock.copyButtonAriaLabel",
                                      message: "Copy code to clipboard",
                                      description:
                                          "The ARIA label for copy code blocks button"
                                  }),
                            title: (0, i.I)({
                                id: "theme.CodeBlock.copy",
                                message: "Copy",
                                description:
                                    "The copy button label on code blocks"
                            }),
                            className: (0, a.Z)(
                                "clean-btn",
                                t,
                                _r.copyButton,
                                r && _r.copyButtonCopied
                            ),
                            onClick: c
                        },
                        n.createElement(
                            "span",
                            {
                                className: _r.copyButtonIcons,
                                "aria-hidden": "true"
                            },
                            n.createElement(
                                "svg",
                                {
                                    className: _r.copyButtonIcon,
                                    viewBox: "0 0 24 24"
                                },
                                n.createElement("path", {
                                    d: "M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"
                                })
                            ),
                            n.createElement(
                                "svg",
                                {
                                    className: _r.copyButtonSuccessIcon,
                                    viewBox: "0 0 24 24"
                                },
                                n.createElement("path", {
                                    d: "M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"
                                })
                            )
                        )
                    )
                )
            }
            const Br = "wordWrapButtonIcon_grsw",
                Ir = "wordWrapButtonEnabled_leAs"
            function Sr({ className: e, onClick: t, isEnabled: r }) {
                const o = (0, i.I)({
                    id: "theme.CodeBlock.wordWrapToggle",
                    message: "Toggle word wrap",
                    description:
                        "The title attribute for toggle word wrapping button of code block lines"
                })
                return n.createElement(
                    "button",
                    {
                        type: "button",
                        onClick: t,
                        className: (0, a.Z)("clean-btn", e, r && Ir),
                        "aria-label": o,
                        title: o
                    },
                    n.createElement(
                        "svg",
                        {
                            className: Br,
                            viewBox: "0 0 24 24",
                            "aria-hidden": "true"
                        },
                        n.createElement("path", {
                            fill: "currentColor",
                            d: "M4 19h6v-2H4v2zM20 5H4v2h16V5zm-3 6H4v2h13.25c1.1 0 2 .9 2 2s-.9 2-2 2H15v-2l-3 3l3 3v-2h2c2.21 0 4-1.79 4-4s-1.79-4-4-4z"
                        })
                    )
                )
            }
            var Zr = Object.defineProperty,
                Ar = Object.defineProperties,
                Hr = Object.getOwnPropertyDescriptors,
                Dr = Object.getOwnPropertySymbols,
                Ur = Object.prototype.hasOwnProperty,
                Mr = Object.prototype.propertyIsEnumerable,
                Rr = (e, t, r) =>
                    t in e
                        ? Zr(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            function Vr({
                children: e,
                className: t = "",
                metastring: r,
                title: o,
                showLineNumbers: l,
                language: c
            }) {
                var i
                const {
                        prism: { defaultLanguage: s, magicComments: u }
                    } = (0, se.L)(),
                    m =
                        null !=
                        (i =
                            null != c
                                ? c
                                : (function (e) {
                                      const t = e
                                          .split(" ")
                                          .find((e) =>
                                              e.startsWith("language-")
                                          )
                                      return null == t
                                          ? void 0
                                          : t.replace(/language-/, "")
                                  })(t))
                            ? i
                            : s,
                    p = Ft(),
                    d = (function () {
                        const [e, t] = (0, n.useState)(!1),
                            [r, a] = (0, n.useState)(!1),
                            o = (0, n.useRef)(null),
                            l = (0, n.useCallback)(() => {
                                const r = o.current.querySelector("code")
                                e
                                    ? r.removeAttribute("style")
                                    : (r.style.whiteSpace = "pre-wrap"),
                                    t((e) => !e)
                            }, [o, e]),
                            c = (0, n.useCallback)(() => {
                                const { scrollWidth: e, clientWidth: t } =
                                        o.current,
                                    r =
                                        e > t ||
                                        o.current
                                            .querySelector("code")
                                            .hasAttribute("style")
                                a(r)
                            }, [o])
                        return (
                            (0, n.useEffect)(() => {
                                c()
                            }, [e, c]),
                            (0, n.useEffect)(
                                () => (
                                    window.addEventListener("resize", c, {
                                        passive: !0
                                    }),
                                    () => {
                                        window.removeEventListener("resize", c)
                                    }
                                ),
                                [c]
                            ),
                            {
                                codeBlockRef: o,
                                isEnabled: e,
                                isCodeScrollable: r,
                                toggle: l
                            }
                        )
                    })(),
                    b =
                        (function (e) {
                            var t, r
                            return null !=
                                (r =
                                    null ==
                                    (t = null == e ? void 0 : e.match(Kt))
                                        ? void 0
                                        : t.groups.title)
                                ? r
                                : ""
                        })(r) || o,
                    { lineClassNames: f, code: v } = Xt(e, {
                        metastring: r,
                        language: m,
                        magicComments: u
                    }),
                    y =
                        null != l
                            ? l
                            : (function (e) {
                                  return Boolean(
                                      null == e
                                          ? void 0
                                          : e.includes("showLineNumbers")
                                  )
                              })(r)
                return n.createElement(
                    cr,
                    {
                        as: "div",
                        className: (0, a.Z)(
                            t,
                            m && !t.includes(`language-${m}`) && `language-${m}`
                        )
                    },
                    b &&
                        n.createElement(
                            "div",
                            { className: ir.codeBlockTitle },
                            b
                        ),
                    n.createElement(
                        "div",
                        { className: ir.codeBlockContent },
                        n.createElement(
                            hr,
                            ((g = ((e, t) => {
                                for (var r in t || (t = {}))
                                    Ur.call(t, r) && Rr(e, r, t[r])
                                if (Dr)
                                    for (var r of Dr(t))
                                        Mr.call(t, r) && Rr(e, r, t[r])
                                return e
                            })({}, mr)),
                            Ar(
                                g,
                                Hr({
                                    theme: p,
                                    code: v,
                                    language: null != m ? m : "text"
                                })
                            )),
                            ({
                                className: e,
                                tokens: t,
                                getLineProps: r,
                                getTokenProps: o
                            }) =>
                                n.createElement(
                                    "pre",
                                    {
                                        tabIndex: 0,
                                        ref: d.codeBlockRef,
                                        className: (0, a.Z)(
                                            e,
                                            ir.codeBlock,
                                            "thin-scrollbar"
                                        )
                                    },
                                    n.createElement(
                                        "code",
                                        {
                                            className: (0, a.Z)(
                                                ir.codeBlockLines,
                                                y &&
                                                    ir.codeBlockLinesWithNumbering
                                            )
                                        },
                                        t.map((e, t) =>
                                            n.createElement(Cr, {
                                                key: t,
                                                line: e,
                                                getLineProps: r,
                                                getTokenProps: o,
                                                classNames: f[t],
                                                showLineNumbers: y
                                            })
                                        )
                                    )
                                )
                        ),
                        n.createElement(
                            "div",
                            { className: ir.buttonGroup },
                            (d.isEnabled || d.isCodeScrollable) &&
                                n.createElement(Sr, {
                                    className: ir.codeButton,
                                    onClick: () => d.toggle(),
                                    isEnabled: d.isEnabled
                                }),
                            n.createElement(Tr, {
                                className: ir.codeButton,
                                code: v
                            })
                        )
                    )
                )
                var g
            }
            var zr = Object.defineProperty,
                $r = Object.getOwnPropertySymbols,
                Fr = Object.prototype.hasOwnProperty,
                Wr = Object.prototype.propertyIsEnumerable,
                qr = (e, t, r) =>
                    t in e
                        ? zr(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            function Kr(e) {
                var t = e,
                    { children: r } = t,
                    a = ((e, t) => {
                        var r = {}
                        for (var n in e)
                            Fr.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n])
                        if (null != e && $r)
                            for (var n of $r(e))
                                t.indexOf(n) < 0 &&
                                    Wr.call(e, n) &&
                                    (r[n] = e[n])
                        return r
                    })(t, ["children"])
                const o = (0, zt.Z)(),
                    l = (function (e) {
                        return n.Children.toArray(e).some((e) =>
                            (0, n.isValidElement)(e)
                        )
                            ? e
                            : Array.isArray(e)
                            ? e.join("")
                            : e
                    })(r),
                    c = "string" == typeof l ? Vr : sr
                return n.createElement(
                    c,
                    ((e, t) => {
                        for (var r in t || (t = {}))
                            Fr.call(t, r) && qr(e, r, t[r])
                        if ($r)
                            for (var r of $r(t)) Wr.call(t, r) && qr(e, r, t[r])
                        return e
                    })({ key: String(o) }, a),
                    l
                )
            }
            var Gr = Object.defineProperty,
                Qr = Object.getOwnPropertySymbols,
                Jr = Object.prototype.hasOwnProperty,
                Xr = Object.prototype.propertyIsEnumerable,
                Yr = (e, t, r) =>
                    t in e
                        ? Gr(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                en = (e, t) => {
                    for (var r in t || (t = {})) Jr.call(t, r) && Yr(e, r, t[r])
                    if (Qr) for (var r of Qr(t)) Xr.call(t, r) && Yr(e, r, t[r])
                    return e
                }
            var tn = Object.defineProperty,
                rn = Object.getOwnPropertySymbols,
                nn = Object.prototype.hasOwnProperty,
                an = Object.prototype.propertyIsEnumerable,
                on = (e, t, r) =>
                    t in e
                        ? tn(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            var ln = Object.defineProperty,
                cn = Object.getOwnPropertySymbols,
                sn = Object.prototype.hasOwnProperty,
                un = Object.prototype.propertyIsEnumerable,
                mn = (e, t, r) =>
                    t in e
                        ? ln(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                pn = (e, t) => {
                    for (var r in t || (t = {})) sn.call(t, r) && mn(e, r, t[r])
                    if (cn) for (var r of cn(t)) un.call(t, r) && mn(e, r, t[r])
                    return e
                }
            const dn = "details_Gmva",
                bn = "isBrowser_7F1n",
                fn = "collapsibleContent_cTEb"
            var vn = Object.defineProperty,
                yn = Object.defineProperties,
                gn = Object.getOwnPropertyDescriptors,
                hn = Object.getOwnPropertySymbols,
                On = Object.prototype.hasOwnProperty,
                En = Object.prototype.propertyIsEnumerable,
                jn = (e, t, r) =>
                    t in e
                        ? vn(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            function kn(e) {
                return !!e && ("SUMMARY" === e.tagName || kn(e.parentElement))
            }
            function wn(e, t) {
                return !!e && (e === t || wn(e.parentElement, t))
            }
            function Pn(e) {
                var t = e,
                    { summary: r, children: o } = t,
                    l = ((e, t) => {
                        var r = {}
                        for (var n in e)
                            On.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n])
                        if (null != e && hn)
                            for (var n of hn(e))
                                t.indexOf(n) < 0 &&
                                    En.call(e, n) &&
                                    (r[n] = e[n])
                        return r
                    })(t, ["summary", "children"])
                const c = (0, zt.Z)(),
                    i = (0, n.useRef)(null),
                    { collapsed: s, setCollapsed: u } = (0, Re.u)({
                        initialState: !l.open
                    }),
                    [m, p] = (0, n.useState)(l.open)
                return n.createElement(
                    "details",
                    ((d = ((e, t) => {
                        for (var r in t || (t = {}))
                            On.call(t, r) && jn(e, r, t[r])
                        if (hn)
                            for (var r of hn(t)) En.call(t, r) && jn(e, r, t[r])
                        return e
                    })({}, l)),
                    (b = {
                        ref: i,
                        open: m,
                        "data-collapsed": s,
                        className: (0, a.Z)(dn, c && bn, l.className),
                        onMouseDown: (e) => {
                            kn(e.target) && e.detail > 1 && e.preventDefault()
                        },
                        onClick: (e) => {
                            e.stopPropagation()
                            const t = e.target
                            kn(t) &&
                                wn(t, i.current) &&
                                (e.preventDefault(), s ? (u(!1), p(!0)) : u(!0))
                        }
                    }),
                    yn(d, gn(b))),
                    null != r ? r : n.createElement("summary", null, "Details"),
                    n.createElement(
                        Re.z,
                        {
                            lazy: !1,
                            collapsed: s,
                            disableSSRStyle: !0,
                            onCollapseTransitionEnd: (e) => {
                                u(e), p(!e)
                            }
                        },
                        n.createElement("div", { className: fn }, o)
                    )
                )
                var d, b
            }
            const Nn = "details_kQDS"
            var Ln = Object.defineProperty,
                xn = Object.defineProperties,
                Cn = Object.getOwnPropertyDescriptors,
                _n = Object.getOwnPropertySymbols,
                Tn = Object.prototype.hasOwnProperty,
                Bn = Object.prototype.propertyIsEnumerable,
                In = (e, t, r) =>
                    t in e
                        ? Ln(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            function Sn(e) {
                var t,
                    r,
                    o = ((e, t) => {
                        var r = {}
                        for (var n in e)
                            Tn.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n])
                        if (null != e && _n)
                            for (var n of _n(e))
                                t.indexOf(n) < 0 &&
                                    Bn.call(e, n) &&
                                    (r[n] = e[n])
                        return r
                    })(e, [])
                return n.createElement(
                    Pn,
                    ((t = ((e, t) => {
                        for (var r in t || (t = {}))
                            Tn.call(t, r) && In(e, r, t[r])
                        if (_n)
                            for (var r of _n(t)) Bn.call(t, r) && In(e, r, t[r])
                        return e
                    })({}, o)),
                    (r = {
                        className: (0, a.Z)(
                            "alert alert--info",
                            Nn,
                            o.className
                        )
                    }),
                    xn(t, Cn(r)))
                )
            }
            var Zn = Object.defineProperty,
                An = Object.defineProperties,
                Hn = Object.getOwnPropertyDescriptors,
                Dn = Object.getOwnPropertySymbols,
                Un = Object.prototype.hasOwnProperty,
                Mn = Object.prototype.propertyIsEnumerable,
                Rn = (e, t, r) =>
                    t in e
                        ? Zn(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            var Vn = Object.defineProperty,
                zn = Object.getOwnPropertySymbols,
                $n = Object.prototype.hasOwnProperty,
                Fn = Object.prototype.propertyIsEnumerable,
                Wn = (e, t, r) =>
                    t in e
                        ? Vn(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            function qn(e) {
                return n.createElement(
                    dt,
                    ((e, t) => {
                        for (var r in t || (t = {}))
                            $n.call(t, r) && Wn(e, r, t[r])
                        if (zn)
                            for (var r of zn(t)) Fn.call(t, r) && Wn(e, r, t[r])
                        return e
                    })({}, e)
                )
            }
            const Kn = "containsTaskList_Zz0N"
            var Gn = Object.defineProperty,
                Qn = Object.defineProperties,
                Jn = Object.getOwnPropertyDescriptors,
                Xn = Object.getOwnPropertySymbols,
                Yn = Object.prototype.hasOwnProperty,
                ea = Object.prototype.propertyIsEnumerable,
                ta = (e, t, r) =>
                    t in e
                        ? Gn(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            const ra = "img_ZyQI"
            var na = Object.defineProperty,
                aa = Object.defineProperties,
                oa = Object.getOwnPropertyDescriptors,
                la = Object.getOwnPropertySymbols,
                ca = Object.prototype.hasOwnProperty,
                ia = Object.prototype.propertyIsEnumerable,
                sa = (e, t, r) =>
                    t in e
                        ? na(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r)
            var ua = Object.defineProperty,
                ma = Object.getOwnPropertySymbols,
                pa = Object.prototype.hasOwnProperty,
                da = Object.prototype.propertyIsEnumerable,
                ba = (e, t, r) =>
                    t in e
                        ? ua(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                fa = (e, t) => {
                    for (var r in t || (t = {})) pa.call(t, r) && ba(e, r, t[r])
                    if (ma) for (var r of ma(t)) da.call(t, r) && ba(e, r, t[r])
                    return e
                }
            const va = {
                head: function (e) {
                    const t = n.Children.map(e.children, (e) =>
                        n.isValidElement(e) ? Vt(e) : e
                    )
                    return n.createElement(
                        At.Z,
                        ((e, t) => {
                            for (var r in t || (t = {}))
                                Ut.call(t, r) && Rt(e, r, t[r])
                            if (Dt)
                                for (var r of Dt(t))
                                    Mt.call(t, r) && Rt(e, r, t[r])
                            return e
                        })({}, e),
                        t
                    )
                },
                code: function (e) {
                    const t = [
                        "a",
                        "b",
                        "big",
                        "i",
                        "span",
                        "em",
                        "strong",
                        "sup",
                        "sub",
                        "small"
                    ]
                    return n.Children.toArray(e.children).every(
                        (e) =>
                            ("string" == typeof e && !e.includes("\n")) ||
                            ((0, n.isValidElement)(e) &&
                                t.includes(e.props.mdxType))
                    )
                        ? n.createElement("code", en({}, e))
                        : n.createElement(Kr, en({}, e))
                },
                a: function (e) {
                    return n.createElement(
                        s.Z,
                        ((e, t) => {
                            for (var r in t || (t = {}))
                                nn.call(t, r) && on(e, r, t[r])
                            if (rn)
                                for (var r of rn(t))
                                    an.call(t, r) && on(e, r, t[r])
                            return e
                        })({}, e)
                    )
                },
                pre: function (e) {
                    var t
                    return n.createElement(
                        Kr,
                        pn(
                            {},
                            (0, n.isValidElement)(e.children) &&
                                "code" ===
                                    (null == (t = e.children.props)
                                        ? void 0
                                        : t.originalType)
                                ? e.children.props
                                : pn({}, e)
                        )
                    )
                },
                details: function (e) {
                    const t = n.Children.toArray(e.children),
                        r = t.find((e) => {
                            var t
                            return (
                                n.isValidElement(e) &&
                                "summary" ===
                                    (null == (t = e.props) ? void 0 : t.mdxType)
                            )
                        }),
                        a = n.createElement(
                            n.Fragment,
                            null,
                            t.filter((e) => e !== r)
                        )
                    return n.createElement(
                        Sn,
                        ((o = ((e, t) => {
                            for (var r in t || (t = {}))
                                Un.call(t, r) && Rn(e, r, t[r])
                            if (Dn)
                                for (var r of Dn(t))
                                    Mn.call(t, r) && Rn(e, r, t[r])
                            return e
                        })({}, e)),
                        An(o, Hn({ summary: r }))),
                        a
                    )
                    var o
                },
                ul: function (e) {
                    return n.createElement(
                        "ul",
                        ((t = ((e, t) => {
                            for (var r in t || (t = {}))
                                Yn.call(t, r) && ta(e, r, t[r])
                            if (Xn)
                                for (var r of Xn(t))
                                    ea.call(t, r) && ta(e, r, t[r])
                            return e
                        })({}, e)),
                        (r = {
                            className:
                                ((o = e.className),
                                (0, a.Z)(
                                    o,
                                    (null == o
                                        ? void 0
                                        : o.includes("contains-task-list")) &&
                                        Kn
                                ))
                        }),
                        Qn(t, Jn(r)))
                    )
                    var t, r, o
                },
                img: function (e) {
                    return n.createElement(
                        "img",
                        ((t = ((e, t) => {
                            for (var r in t || (t = {}))
                                ca.call(t, r) && sa(e, r, t[r])
                            if (la)
                                for (var r of la(t))
                                    ia.call(t, r) && sa(e, r, t[r])
                            return e
                        })({ loading: "lazy" }, e)),
                        (r = {
                            className: ((o = e.className), (0, a.Z)(o, ra))
                        }),
                        aa(t, oa(r)))
                    )
                    var t, r, o
                },
                h1: (e) => n.createElement(qn, fa({ as: "h1" }, e)),
                h2: (e) => n.createElement(qn, fa({ as: "h2" }, e)),
                h3: (e) => n.createElement(qn, fa({ as: "h3" }, e)),
                h4: (e) => n.createElement(qn, fa({ as: "h4" }, e)),
                h5: (e) => n.createElement(qn, fa({ as: "h5" }, e)),
                h6: (e) => n.createElement(qn, fa({ as: "h6" }, e))
            }
            function ya({ children: e }) {
                return n.createElement(Zt.Zo, { components: va }, e)
            }
            const ga = "docItemContainer_aEmb",
                ha = "docItemCol_sk5F",
                Oa = "tocMobile_DWaT"
            var Ea = Object.defineProperty,
                ja = Object.getOwnPropertySymbols,
                ka = Object.prototype.hasOwnProperty,
                wa = Object.prototype.propertyIsEnumerable,
                Pa = (e, t, r) =>
                    t in e
                        ? Ea(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: r
                          })
                        : (e[t] = r),
                Na = (e, t) => {
                    for (var r in t || (t = {})) ka.call(t, r) && Pa(e, r, t[r])
                    if (ja) for (var r of ja(t)) wa.call(t, r) && Pa(e, r, t[r])
                    return e
                }
            function La(e) {
                var t
                const { content: r } = e,
                    { metadata: a, frontMatter: l, assets: c } = r,
                    { keywords: i } = l,
                    { description: s, title: u } = a,
                    m = null != (t = c.image) ? t : l.image
                return n.createElement(
                    o.d,
                    Na({}, { title: u, description: s, keywords: i, image: m })
                )
            }
            function xa(e) {
                const { content: t } = e,
                    { metadata: r, frontMatter: o } = t,
                    {
                        hide_title: i,
                        hide_table_of_contents: s,
                        toc_min_heading_level: u,
                        toc_max_heading_level: m
                    } = o,
                    { title: p } = r,
                    d = !i && void 0 === t.contentTitle,
                    b = (0, l.i)(),
                    f = !s && t.toc && t.toc.length > 0,
                    v = f && ("desktop" === b || "ssr" === b)
                return n.createElement(
                    "div",
                    { className: "row" },
                    n.createElement(
                        "div",
                        { className: (0, a.Z)("col", !s && ha) },
                        n.createElement(S, null),
                        n.createElement(
                            "div",
                            { className: ga },
                            n.createElement(
                                "article",
                                null,
                                n.createElement(St, null),
                                n.createElement(Z, null),
                                f &&
                                    n.createElement(tt, {
                                        toc: t.toc,
                                        minHeadingLevel: u,
                                        maxHeadingLevel: m,
                                        className: (0, a.Z)(
                                            c.k.docs.docTocMobile,
                                            Oa
                                        )
                                    }),
                                n.createElement(
                                    "div",
                                    {
                                        className: (0, a.Z)(
                                            c.k.docs.docMarkdown,
                                            "markdown"
                                        )
                                    },
                                    d &&
                                        n.createElement(
                                            "header",
                                            null,
                                            n.createElement(dt, { as: "h1" }, p)
                                        ),
                                    n.createElement(
                                        ya,
                                        null,
                                        n.createElement(t, null)
                                    )
                                ),
                                n.createElement(ie, Na({}, e))
                            ),
                            n.createElement(O, {
                                previous: r.previous,
                                next: r.next
                            })
                        )
                    ),
                    v &&
                        n.createElement(
                            "div",
                            { className: "col col--3" },
                            n.createElement(Me, {
                                toc: t.toc,
                                minHeadingLevel: u,
                                maxHeadingLevel: m,
                                className: c.k.docs.docTocDesktop
                            })
                        )
                )
            }
            function Ca(e) {
                const t = `docs-doc-id-${e.content.metadata.unversionedId}`
                return n.createElement(
                    o.FG,
                    { className: t },
                    n.createElement(La, Na({}, e)),
                    n.createElement(xa, Na({}, e))
                )
            }
        },
        3112: (e, t, r) => {
            "use strict"
            r.d(t, { E: () => c, q: () => l })
            var n = r(3889),
                a = r(4046)
            const o = n.createContext(null)
            function l({ children: e, version: t }) {
                return n.createElement(o.Provider, { value: t }, e)
            }
            function c() {
                const e = (0, n.useContext)(o)
                if (null === e) throw new a.i6("DocsVersionProvider")
                return e
            }
        },
        7226: (e, t) => {
            function r(e) {
                let t,
                    r = []
                for (let n of e.split(",").map((e) => e.trim()))
                    if (/^-?\d+$/.test(n)) r.push(parseInt(n, 10))
                    else if (
                        (t = n.match(
                            /^(-?\d+)(-|\.\.\.?|\u2025|\u2026|\u22EF)(-?\d+)$/
                        ))
                    ) {
                        let [e, n, a, o] = t
                        if (n && o) {
                            ;(n = parseInt(n)), (o = parseInt(o))
                            const e = n < o ? 1 : -1
                            ;("-" !== a && ".." !== a && "\u2025" !== a) ||
                                (o += e)
                            for (let t = n; t !== o; t += e) r.push(t)
                        }
                    }
                return r
            }
            ;(t.default = r), (e.exports = r)
        }
    }
])
