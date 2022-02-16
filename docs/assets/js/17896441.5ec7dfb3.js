"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [918],
    {
        3312: (e, t, a) => {
            a.r(t), a.d(t, { default: () => ke })
            var n = a(1672),
                l = a(4722),
                r = a(6759),
                o = a(7989)
            const i = function (e) {
                const { permalink: t, title: a, subLabel: l } = e
                return n.createElement(
                    o.Z,
                    { className: "pagination-nav__link", to: t },
                    l &&
                        n.createElement(
                            "div",
                            { className: "pagination-nav__sublabel" },
                            l
                        ),
                    n.createElement(
                        "div",
                        { className: "pagination-nav__label" },
                        a
                    )
                )
            }
            var s = Object.defineProperty,
                c = Object.defineProperties,
                d = Object.getOwnPropertyDescriptors,
                m = Object.getOwnPropertySymbols,
                u = Object.prototype.hasOwnProperty,
                p = Object.prototype.propertyIsEnumerable,
                b = (e, t, a) =>
                    t in e
                        ? s(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: a
                          })
                        : (e[t] = a),
                v = (e, t) => {
                    for (var a in t || (t = {})) u.call(t, a) && b(e, a, t[a])
                    if (m) for (var a of m(t)) p.call(t, a) && b(e, a, t[a])
                    return e
                },
                f = (e, t) => c(e, d(t))
            const g = function (e) {
                const { previous: t, next: a } = e
                return n.createElement(
                    "nav",
                    {
                        className: "pagination-nav docusaurus-mt-lg",
                        "aria-label": (0, r.I)({
                            id: "theme.docs.paginator.navAriaLabel",
                            message: "Docs pages navigation",
                            description:
                                "The ARIA label for the docs pagination"
                        })
                    },
                    n.createElement(
                        "div",
                        { className: "pagination-nav__item" },
                        t &&
                            n.createElement(
                                i,
                                f(v({}, t), {
                                    subLabel: n.createElement(
                                        r.Z,
                                        {
                                            id: "theme.docs.paginator.previous",
                                            description:
                                                "The label used to navigate to the previous doc"
                                        },
                                        "Previous"
                                    )
                                })
                            )
                    ),
                    n.createElement(
                        "div",
                        {
                            className:
                                "pagination-nav__item pagination-nav__item--next"
                        },
                        a &&
                            n.createElement(
                                i,
                                f(v({}, a), {
                                    subLabel: n.createElement(
                                        r.Z,
                                        {
                                            id: "theme.docs.paginator.next",
                                            description:
                                                "The label used to navigate to the next doc"
                                        },
                                        "Next"
                                    )
                                })
                            )
                    )
                )
            }
            var h = a(8270),
                E = a(4040),
                y = a(816),
                O = Object.defineProperty,
                N = Object.getOwnPropertySymbols,
                k = Object.prototype.hasOwnProperty,
                _ = Object.prototype.propertyIsEnumerable,
                L = (e, t, a) =>
                    t in e
                        ? O(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: a
                          })
                        : (e[t] = a)
            const w = {
                unreleased: function ({ siteTitle: e, versionMetadata: t }) {
                    return n.createElement(
                        r.Z,
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
                        r.Z,
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
            function Z(e) {
                const t = w[e.versionMetadata.banner]
                return n.createElement(
                    t,
                    ((e, t) => {
                        for (var a in t || (t = {}))
                            k.call(t, a) && L(e, a, t[a])
                        if (N) for (var a of N(t)) _.call(t, a) && L(e, a, t[a])
                        return e
                    })({}, e)
                )
            }
            function j({ versionLabel: e, to: t, onClick: a }) {
                return n.createElement(
                    r.Z,
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
                                    o.Z,
                                    { to: t, onClick: a },
                                    n.createElement(
                                        r.Z,
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
            function U({ className: e, versionMetadata: t }) {
                const {
                        siteConfig: { title: a }
                    } = (0, h.Z)(),
                    { pluginId: r } = (0, E.useActivePlugin)({ failfast: !0 }),
                    { savePreferredVersionName: o } = (0, y.J)(r),
                    { latestDocSuggestion: i, latestVersionSuggestion: s } = (0,
                    E.useDocVersionSuggestions)(r),
                    c =
                        null != i
                            ? i
                            : (d = s).docs.find((e) => e.id === d.mainDocId)
                var d
                return n.createElement(
                    "div",
                    {
                        className: (0, l.Z)(
                            e,
                            y.kM.docs.docVersionBanner,
                            "alert alert--warning margin-bottom--md"
                        ),
                        role: "alert"
                    },
                    n.createElement(
                        "div",
                        null,
                        n.createElement(Z, { siteTitle: a, versionMetadata: t })
                    ),
                    n.createElement(
                        "div",
                        { className: "margin-top--md" },
                        n.createElement(j, {
                            versionLabel: s.label,
                            to: c.path,
                            onClick: () => o(s.name)
                        })
                    )
                )
            }
            function P({ className: e }) {
                const t = (0, y.E6)()
                return t.banner
                    ? n.createElement(U, { className: e, versionMetadata: t })
                    : null
            }
            function C({ className: e }) {
                const t = (0, y.E6)()
                return t.badge
                    ? n.createElement(
                          "span",
                          {
                              className: (0, l.Z)(
                                  e,
                                  y.kM.docs.docVersionBadge,
                                  "badge badge--secondary"
                              )
                          },
                          "Version: ",
                          t.label
                      )
                    : null
            }
            var T = a(7647)
            function x({ lastUpdatedAt: e, formattedLastUpdatedAt: t }) {
                return n.createElement(
                    r.Z,
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
            function A({ lastUpdatedBy: e }) {
                return n.createElement(
                    r.Z,
                    {
                        id: "theme.lastUpdated.byUser",
                        description:
                            "The words used to describe by who the page has been last updated",
                        values: { user: n.createElement("b", null, e) }
                    },
                    " by {user}"
                )
            }
            function M({
                lastUpdatedAt: e,
                formattedLastUpdatedAt: t,
                lastUpdatedBy: a
            }) {
                return n.createElement(
                    "span",
                    { className: y.kM.common.lastUpdated },
                    n.createElement(
                        r.Z,
                        {
                            id: "theme.lastUpdated.lastUpdatedAtBy",
                            description:
                                "The sentence used to display when a page has been last updated, and by who",
                            values: {
                                atDate:
                                    e && t
                                        ? n.createElement(x, {
                                              lastUpdatedAt: e,
                                              formattedLastUpdatedAt: t
                                          })
                                        : "",
                                byUser: a
                                    ? n.createElement(A, { lastUpdatedBy: a })
                                    : ""
                            }
                        },
                        "Last updated{atDate}{byUser}"
                    ),
                    !1
                )
            }
            const S = "iconEdit_mx6_"
            var H = Object.defineProperty,
                I = Object.getOwnPropertySymbols,
                B = Object.prototype.hasOwnProperty,
                D = Object.prototype.propertyIsEnumerable,
                V = (e, t, a) =>
                    t in e
                        ? H(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: a
                          })
                        : (e[t] = a)
            const F = function (e) {
                var t = e,
                    { className: a } = t,
                    r = ((e, t) => {
                        var a = {}
                        for (var n in e)
                            B.call(e, n) && t.indexOf(n) < 0 && (a[n] = e[n])
                        if (null != e && I)
                            for (var n of I(e))
                                t.indexOf(n) < 0 &&
                                    D.call(e, n) &&
                                    (a[n] = e[n])
                        return a
                    })(t, ["className"])
                return n.createElement(
                    "svg",
                    ((e, t) => {
                        for (var a in t || (t = {}))
                            B.call(t, a) && V(e, a, t[a])
                        if (I) for (var a of I(t)) D.call(t, a) && V(e, a, t[a])
                        return e
                    })(
                        {
                            fill: "currentColor",
                            height: "20",
                            width: "20",
                            viewBox: "0 0 40 40",
                            className: (0, l.Z)(S, a),
                            "aria-hidden": "true"
                        },
                        r
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
            function R({ editUrl: e }) {
                return n.createElement(
                    "a",
                    {
                        href: e,
                        target: "_blank",
                        rel: "noreferrer noopener",
                        className: y.kM.common.editThisPage
                    },
                    n.createElement(F, null),
                    n.createElement(
                        r.Z,
                        {
                            id: "theme.common.editThisPage",
                            description:
                                "The link label to edit the current page"
                        },
                        "Edit this page"
                    )
                )
            }
            const W = "tag_m1nx",
                z = "tagRegular_lD68",
                q = "tagWithCount_dgSn"
            const J = function (e) {
                    const { permalink: t, name: a, count: r } = e
                    return n.createElement(
                        o.Z,
                        {
                            href: t,
                            className: (0, l.Z)(W, { [z]: !r, [q]: r })
                        },
                        a,
                        r && n.createElement("span", null, r)
                    )
                },
                K = "tags_WXoh",
                Q = "tag_Jjqw"
            function X({ tags: e }) {
                return n.createElement(
                    n.Fragment,
                    null,
                    n.createElement(
                        "b",
                        null,
                        n.createElement(
                            r.Z,
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
                            className: (0, l.Z)(
                                K,
                                "padding--none",
                                "margin-left--sm"
                            )
                        },
                        e.map(({ label: e, permalink: t }) =>
                            n.createElement(
                                "li",
                                { key: t, className: Q },
                                n.createElement(J, { name: e, permalink: t })
                            )
                        )
                    )
                )
            }
            const $ = "lastUpdated_hKPy"
            var Y = Object.defineProperty,
                G = Object.getOwnPropertySymbols,
                ee = Object.prototype.hasOwnProperty,
                te = Object.prototype.propertyIsEnumerable,
                ae = (e, t, a) =>
                    t in e
                        ? Y(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: a
                          })
                        : (e[t] = a)
            function ne(e) {
                return n.createElement(
                    "div",
                    {
                        className: (0, l.Z)(
                            y.kM.docs.docFooterTagsRow,
                            "row margin-bottom--sm"
                        )
                    },
                    n.createElement(
                        "div",
                        { className: "col" },
                        n.createElement(
                            X,
                            ((e, t) => {
                                for (var a in t || (t = {}))
                                    ee.call(t, a) && ae(e, a, t[a])
                                if (G)
                                    for (var a of G(t))
                                        te.call(t, a) && ae(e, a, t[a])
                                return e
                            })({}, e)
                        )
                    )
                )
            }
            function le({
                editUrl: e,
                lastUpdatedAt: t,
                lastUpdatedBy: a,
                formattedLastUpdatedAt: r
            }) {
                return n.createElement(
                    "div",
                    {
                        className: (0, l.Z)(
                            y.kM.docs.docFooterEditMetaRow,
                            "row"
                        )
                    },
                    n.createElement(
                        "div",
                        { className: "col" },
                        e && n.createElement(R, { editUrl: e })
                    ),
                    n.createElement(
                        "div",
                        { className: (0, l.Z)("col", $) },
                        (t || a) &&
                            n.createElement(M, {
                                lastUpdatedAt: t,
                                formattedLastUpdatedAt: r,
                                lastUpdatedBy: a
                            })
                    )
                )
            }
            function re(e) {
                const { content: t } = e,
                    { metadata: a } = t,
                    {
                        editUrl: r,
                        lastUpdatedAt: o,
                        formattedLastUpdatedAt: i,
                        lastUpdatedBy: s,
                        tags: c
                    } = a,
                    d = c.length > 0,
                    m = !!(r || o || s)
                return d || m
                    ? n.createElement(
                          "footer",
                          {
                              className: (0, l.Z)(
                                  y.kM.docs.docFooter,
                                  "docusaurus-mt-lg"
                              )
                          },
                          d && n.createElement(ne, { tags: c }),
                          m &&
                              n.createElement(le, {
                                  editUrl: r,
                                  lastUpdatedAt: o,
                                  lastUpdatedBy: s,
                                  formattedLastUpdatedAt: i
                              })
                      )
                    : null
            }
            var oe = a(5240)
            const ie = "tocCollapsible_hQEa",
                se = "tocCollapsibleButton_pTlW",
                ce = "tocCollapsibleContent_BFUd",
                de = "tocCollapsibleExpanded_LNBo"
            var me = a(5382)
            function ue({
                toc: e,
                className: t,
                minHeadingLevel: a,
                maxHeadingLevel: o
            }) {
                const { collapsed: i, toggleCollapsed: s } = (0, y.uR)({
                    initialState: !0
                })
                return n.createElement(
                    "div",
                    { className: (0, l.Z)(ie, { [de]: !i }, t) },
                    n.createElement(
                        "button",
                        {
                            type: "button",
                            className: (0, l.Z)("clean-btn", se),
                            onClick: s
                        },
                        n.createElement(
                            r.Z,
                            {
                                id: "theme.TOCCollapsible.toggleButtonLabel",
                                description:
                                    "The label used by the button on the collapsible TOC component"
                            },
                            "On this page"
                        )
                    ),
                    n.createElement(
                        y.zF,
                        { lazy: !0, className: ce, collapsed: i },
                        n.createElement(me.Z, {
                            toc: e,
                            minHeadingLevel: a,
                            maxHeadingLevel: o
                        })
                    )
                )
            }
            var pe = a(1495)
            const be = "docItemContainer_tvp3",
                ve = "docItemCol_o5Nb",
                fe = "tocMobile_PKYU"
            var ge = Object.defineProperty,
                he = Object.getOwnPropertySymbols,
                Ee = Object.prototype.hasOwnProperty,
                ye = Object.prototype.propertyIsEnumerable,
                Oe = (e, t, a) =>
                    t in e
                        ? ge(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: a
                          })
                        : (e[t] = a),
                Ne = (e, t) => {
                    for (var a in t || (t = {})) Ee.call(t, a) && Oe(e, a, t[a])
                    if (he) for (var a of he(t)) ye.call(t, a) && Oe(e, a, t[a])
                    return e
                }
            function ke(e) {
                const { content: t } = e,
                    { metadata: a, frontMatter: r } = t,
                    {
                        image: o,
                        keywords: i,
                        hide_title: s,
                        hide_table_of_contents: c,
                        toc_min_heading_level: d,
                        toc_max_heading_level: m
                    } = r,
                    { description: u, title: p } = a,
                    b = !s && void 0 === t.contentTitle,
                    v = (0, y.iP)(),
                    f = !c && t.toc && t.toc.length > 0,
                    h = f && ("desktop" === v || "ssr" === v)
                return n.createElement(
                    n.Fragment,
                    null,
                    n.createElement(
                        T.Z,
                        Ne(
                            {},
                            { title: p, description: u, keywords: i, image: o }
                        )
                    ),
                    n.createElement(
                        "div",
                        { className: "row" },
                        n.createElement(
                            "div",
                            { className: (0, l.Z)("col", { [ve]: !c }) },
                            n.createElement(P, null),
                            n.createElement(
                                "div",
                                { className: be },
                                n.createElement(
                                    "article",
                                    null,
                                    n.createElement(C, null),
                                    f &&
                                        n.createElement(ue, {
                                            toc: t.toc,
                                            minHeadingLevel: d,
                                            maxHeadingLevel: m,
                                            className: (0, l.Z)(
                                                y.kM.docs.docTocMobile,
                                                fe
                                            )
                                        }),
                                    n.createElement(
                                        "div",
                                        {
                                            className: (0, l.Z)(
                                                y.kM.docs.docMarkdown,
                                                "markdown"
                                            )
                                        },
                                        b &&
                                            n.createElement(
                                                "header",
                                                null,
                                                n.createElement(
                                                    pe.Z,
                                                    { as: "h1" },
                                                    p
                                                )
                                            ),
                                        n.createElement(t, null)
                                    ),
                                    n.createElement(re, Ne({}, e))
                                ),
                                n.createElement(g, {
                                    previous: a.previous,
                                    next: a.next
                                })
                            )
                        ),
                        h &&
                            n.createElement(
                                "div",
                                { className: "col col--3" },
                                n.createElement(oe.Z, {
                                    toc: t.toc,
                                    minHeadingLevel: d,
                                    maxHeadingLevel: m,
                                    className: y.kM.docs.docTocDesktop
                                })
                            )
                    )
                )
            }
        },
        1495: (e, t, a) => {
            a.d(t, { Z: () => y })
            var n = a(1672),
                l = a(4722),
                r = a(6759),
                o = a(816)
            const i = "anchorWithStickyNavbar_Sk3O",
                s = "anchorWithHideOnScrollNavbar_fQkV"
            var c = Object.defineProperty,
                d = Object.defineProperties,
                m = Object.getOwnPropertyDescriptors,
                u = Object.getOwnPropertySymbols,
                p = Object.prototype.hasOwnProperty,
                b = Object.prototype.propertyIsEnumerable,
                v = (e, t, a) =>
                    t in e
                        ? c(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: a
                          })
                        : (e[t] = a),
                f = (e, t) => {
                    for (var a in t || (t = {})) p.call(t, a) && v(e, a, t[a])
                    if (u) for (var a of u(t)) b.call(t, a) && v(e, a, t[a])
                    return e
                },
                g = (e, t) => d(e, m(t)),
                h = (e, t) => {
                    var a = {}
                    for (var n in e)
                        p.call(e, n) && t.indexOf(n) < 0 && (a[n] = e[n])
                    if (null != e && u)
                        for (var n of u(e))
                            t.indexOf(n) < 0 && b.call(e, n) && (a[n] = e[n])
                    return a
                }
            function E(e) {
                var t = e,
                    { as: a, id: c } = t,
                    d = h(t, ["as", "id"])
                const {
                    navbar: { hideOnScroll: m }
                } = (0, o.LU)()
                return c
                    ? n.createElement(
                          a,
                          g(f({}, d), {
                              className: (0, l.Z)("anchor", {
                                  [s]: m,
                                  [i]: !m
                              }),
                              id: c
                          }),
                          d.children,
                          n.createElement(
                              "a",
                              {
                                  className: "hash-link",
                                  href: `#${c}`,
                                  title: (0, r.I)({
                                      id: "theme.common.headingLinkTitle",
                                      message: "Direct link to heading",
                                      description: "Title for link to heading"
                                  })
                              },
                              "\u200b"
                          )
                      )
                    : n.createElement(a, f({}, d))
            }
            function y(e) {
                var t = e,
                    { as: a } = t,
                    l = h(t, ["as"])
                return "h1" === a
                    ? n.createElement(
                          "h1",
                          g(f({}, l), { id: void 0 }),
                          l.children
                      )
                    : n.createElement(E, f({ as: a }, l))
            }
        },
        5240: (e, t, a) => {
            a.d(t, { Z: () => b })
            var n = a(1672),
                l = a(4722),
                r = a(5382)
            const o = "tableOfContents_AXys"
            var i = Object.defineProperty,
                s = Object.defineProperties,
                c = Object.getOwnPropertyDescriptors,
                d = Object.getOwnPropertySymbols,
                m = Object.prototype.hasOwnProperty,
                u = Object.prototype.propertyIsEnumerable,
                p = (e, t, a) =>
                    t in e
                        ? i(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: a
                          })
                        : (e[t] = a)
            const b = function (e) {
                var t,
                    a = e,
                    { className: i } = a,
                    b = ((e, t) => {
                        var a = {}
                        for (var n in e)
                            m.call(e, n) && t.indexOf(n) < 0 && (a[n] = e[n])
                        if (null != e && d)
                            for (var n of d(e))
                                t.indexOf(n) < 0 &&
                                    u.call(e, n) &&
                                    (a[n] = e[n])
                        return a
                    })(a, ["className"])
                return n.createElement(
                    "div",
                    { className: (0, l.Z)(o, "thin-scrollbar", i) },
                    n.createElement(
                        r.Z,
                        ((t = ((e, t) => {
                            for (var a in t || (t = {}))
                                m.call(t, a) && p(e, a, t[a])
                            if (d)
                                for (var a of d(t))
                                    u.call(t, a) && p(e, a, t[a])
                            return e
                        })({}, b)),
                        s(
                            t,
                            c({
                                linkClassName:
                                    "table-of-contents__link toc-highlight",
                                linkActiveClassName:
                                    "table-of-contents__link--active"
                            })
                        ))
                    )
                )
            }
        },
        5382: (e, t, a) => {
            a.d(t, { Z: () => m })
            var n = a(1672),
                l = a(816),
                r = Object.defineProperty,
                o = Object.getOwnPropertySymbols,
                i = Object.prototype.hasOwnProperty,
                s = Object.prototype.propertyIsEnumerable,
                c = (e, t, a) =>
                    t in e
                        ? r(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: a
                          })
                        : (e[t] = a)
            function d({ toc: e, className: t, linkClassName: a, isChild: l }) {
                return e.length
                    ? n.createElement(
                          "ul",
                          { className: l ? void 0 : t },
                          e.map((e) =>
                              n.createElement(
                                  "li",
                                  { key: e.id },
                                  n.createElement("a", {
                                      href: `#${e.id}`,
                                      className: null != a ? a : void 0,
                                      dangerouslySetInnerHTML: {
                                          __html: e.value
                                      }
                                  }),
                                  n.createElement(d, {
                                      isChild: !0,
                                      toc: e.children,
                                      className: t,
                                      linkClassName: a
                                  })
                              )
                          )
                      )
                    : null
            }
            function m(e) {
                var t = e,
                    {
                        toc: a,
                        className:
                            r = "table-of-contents table-of-contents__left-border",
                        linkClassName: m = "table-of-contents__link",
                        linkActiveClassName: u,
                        minHeadingLevel: p,
                        maxHeadingLevel: b
                    } = t,
                    v = ((e, t) => {
                        var a = {}
                        for (var n in e)
                            i.call(e, n) && t.indexOf(n) < 0 && (a[n] = e[n])
                        if (null != e && o)
                            for (var n of o(e))
                                t.indexOf(n) < 0 &&
                                    s.call(e, n) &&
                                    (a[n] = e[n])
                        return a
                    })(t, [
                        "toc",
                        "className",
                        "linkClassName",
                        "linkActiveClassName",
                        "minHeadingLevel",
                        "maxHeadingLevel"
                    ])
                const f = (0, l.LU)(),
                    g = null != p ? p : f.tableOfContents.minHeadingLevel,
                    h = null != b ? b : f.tableOfContents.maxHeadingLevel,
                    E = (0, l.DA)({
                        toc: a,
                        minHeadingLevel: g,
                        maxHeadingLevel: h
                    }),
                    y = (0, n.useMemo)(() => {
                        if (m && u)
                            return {
                                linkClassName: m,
                                linkActiveClassName: u,
                                minHeadingLevel: g,
                                maxHeadingLevel: h
                            }
                    }, [m, u, g, h])
                return (
                    (0, l.Si)(y),
                    n.createElement(
                        d,
                        ((e, t) => {
                            for (var a in t || (t = {}))
                                i.call(t, a) && c(e, a, t[a])
                            if (o)
                                for (var a of o(t))
                                    s.call(t, a) && c(e, a, t[a])
                            return e
                        })({ toc: E, className: r, linkClassName: m }, v)
                    )
                )
            }
        }
    }
])
