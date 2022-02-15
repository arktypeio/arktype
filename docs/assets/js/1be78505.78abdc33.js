"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [514, 489],
    {
        9813: (e, t, a) => {
            a.r(t), a.d(t, { default: () => pe })
            var n = a(1672),
                l = a(6383),
                o = a(5802),
                r = a(2350),
                c = a(4722),
                i = a(816),
                s = a(5410),
                d = Object.defineProperty,
                m = Object.getOwnPropertySymbols,
                u = Object.prototype.hasOwnProperty,
                b = Object.prototype.propertyIsEnumerable,
                p = (e, t, a) =>
                    t in e
                        ? d(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: a
                          })
                        : (e[t] = a)
            const f = function (e) {
                return n.createElement(
                    "svg",
                    ((e, t) => {
                        for (var a in t || (t = {}))
                            u.call(t, a) && p(e, a, t[a])
                        if (m) for (var a of m(t)) b.call(t, a) && p(e, a, t[a])
                        return e
                    })({ width: "20", height: "20", "aria-hidden": "true" }, e),
                    n.createElement(
                        "g",
                        { fill: "#7a7a7a" },
                        n.createElement("path", {
                            d: "M9.992 10.023c0 .2-.062.399-.172.547l-4.996 7.492a.982.982 0 01-.828.454H1c-.55 0-1-.453-1-1 0-.2.059-.403.168-.551l4.629-6.942L.168 3.078A.939.939 0 010 2.528c0-.548.45-.997 1-.997h2.996c.352 0 .649.18.828.45L9.82 9.472c.11.148.172.347.172.55zm0 0"
                        }),
                        n.createElement("path", {
                            d: "M19.98 10.023c0 .2-.058.399-.168.547l-4.996 7.492a.987.987 0 01-.828.454h-3c-.547 0-.996-.453-.996-1 0-.2.059-.403.168-.551l4.625-6.942-4.625-6.945a.939.939 0 01-.168-.55 1 1 0 01.996-.997h3c.348 0 .649.18.828.45l4.996 7.492c.11.148.168.347.168.55zm0 0"
                        })
                    )
                )
            }
            var h = a(6759),
                v = a(7989),
                E = a(9663),
                g = a(2043)
            const _ = "menuLinkText_Ylzl",
                k = "hasHref_DQvo"
            var y = a(5983),
                C = Object.defineProperty,
                S = Object.getOwnPropertySymbols,
                N = Object.prototype.hasOwnProperty,
                I = Object.prototype.propertyIsEnumerable,
                T = (e, t, a) =>
                    t in e
                        ? C(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: a
                          })
                        : (e[t] = a),
                w = (e, t) => {
                    for (var a in t || (t = {})) N.call(t, a) && T(e, a, t[a])
                    if (S) for (var a of S(t)) I.call(t, a) && T(e, a, t[a])
                    return e
                },
                O = (e, t) => {
                    var a = {}
                    for (var n in e)
                        N.call(e, n) && t.indexOf(n) < 0 && (a[n] = e[n])
                    if (null != e && S)
                        for (var n of S(e))
                            t.indexOf(n) < 0 && I.call(e, n) && (a[n] = e[n])
                    return a
                }
            function Z(e) {
                var t = e,
                    { item: a } = t,
                    l = O(t, ["item"])
                return "category" === a.type
                    ? 0 === a.items.length
                        ? null
                        : n.createElement(M, w({ item: a }, l))
                    : n.createElement(P, w({ item: a }, l))
            }
            function M(e) {
                var t = e,
                    {
                        item: a,
                        onItemClick: l,
                        activePath: o,
                        level: r,
                        index: s
                    } = t,
                    d = O(t, [
                        "item",
                        "onItemClick",
                        "activePath",
                        "level",
                        "index"
                    ])
                const {
                        items: m,
                        label: u,
                        collapsible: b,
                        className: p,
                        href: f
                    } = a,
                    E = (function (e) {
                        const t = (0, y.Z)()
                        return (0, n.useMemo)(
                            () =>
                                e.href
                                    ? e.href
                                    : !t && e.collapsible
                                    ? (0, i.Wl)(e)
                                    : void 0,
                            [e, t]
                        )
                    })(a),
                    g = (0, i._F)(a, o),
                    { collapsed: C, setCollapsed: S } = (0, i.uR)({
                        initialState: () => !!b && !g && a.collapsed
                    })
                !(function ({ isActive: e, collapsed: t, setCollapsed: a }) {
                    const l = (0, i.D9)(e)
                    ;(0, n.useEffect)(() => {
                        e && !l && t && a(!1)
                    }, [e, l, t, a])
                })({ isActive: g, collapsed: C, setCollapsed: S })
                const { expandedItem: N, setExpandedItem: I } = (0, i.fP)()
                function T(e = !C) {
                    I(e ? null : s), S(e)
                }
                const { autoCollapseSidebarCategories: Z } = (0, i.LU)()
                return (
                    (0, n.useEffect)(() => {
                        b && N && N !== s && Z && S(!0)
                    }, [b, N, s, S, Z]),
                    n.createElement(
                        "li",
                        {
                            className: (0, c.Z)(
                                i.kM.docs.docSidebarItemCategory,
                                i.kM.docs.docSidebarItemCategoryLevel(r),
                                "menu__list-item",
                                { "menu__list-item--collapsed": C },
                                p
                            )
                        },
                        n.createElement(
                            "div",
                            { className: "menu__list-item-collapsible" },
                            n.createElement(
                                v.Z,
                                w(
                                    {
                                        className: (0, c.Z)("menu__link", {
                                            "menu__link--sublist": b && !f,
                                            "menu__link--active": g,
                                            [_]: !b,
                                            [k]: !!E
                                        }),
                                        onClick: b
                                            ? (e) => {
                                                  null == l || l(a),
                                                      f
                                                          ? T(!1)
                                                          : (e.preventDefault(),
                                                            T())
                                              }
                                            : () => {
                                                  null == l || l(a)
                                              },
                                        "aria-current": g ? "page" : void 0,
                                        href: b ? (null != E ? E : "#") : E
                                    },
                                    d
                                ),
                                u
                            ),
                            f &&
                                b &&
                                n.createElement("button", {
                                    "aria-label": (0, h.I)(
                                        {
                                            id: "theme.DocSidebarItem.toggleCollapsedCategoryAriaLabel",
                                            message:
                                                "Toggle the collapsible sidebar category '{label}'",
                                            description:
                                                "The ARIA label to toggle the collapsible sidebar category"
                                        },
                                        { label: u }
                                    ),
                                    type: "button",
                                    className: "clean-btn menu__caret",
                                    onClick: (e) => {
                                        e.preventDefault(), T()
                                    }
                                })
                        ),
                        n.createElement(
                            i.zF,
                            {
                                lazy: !0,
                                as: "ul",
                                className: "menu__list",
                                collapsed: C
                            },
                            n.createElement(F, {
                                items: m,
                                tabIndex: C ? -1 : 0,
                                onItemClick: l,
                                activePath: o,
                                level: r + 1
                            })
                        )
                    )
                )
            }
            function P(e) {
                var t = e,
                    {
                        item: a,
                        onItemClick: l,
                        activePath: o,
                        level: r,
                        index: s
                    } = t,
                    d = O(t, [
                        "item",
                        "onItemClick",
                        "activePath",
                        "level",
                        "index"
                    ])
                const { href: m, label: u, className: b } = a,
                    p = (0, i._F)(a, o)
                return n.createElement(
                    "li",
                    {
                        className: (0, c.Z)(
                            i.kM.docs.docSidebarItemLink,
                            i.kM.docs.docSidebarItemLinkLevel(r),
                            "menu__list-item",
                            b
                        ),
                        key: u
                    },
                    n.createElement(
                        v.Z,
                        w(
                            w(
                                {
                                    className: (0, c.Z)("menu__link", {
                                        "menu__link--active": p
                                    }),
                                    "aria-current": p ? "page" : void 0,
                                    to: m
                                },
                                (0, E.Z)(m) && {
                                    onClick: l ? () => l(a) : void 0
                                }
                            ),
                            d
                        ),
                        (0, E.Z)(m)
                            ? u
                            : n.createElement(
                                  "span",
                                  null,
                                  u,
                                  n.createElement(g.Z, null)
                              )
                    )
                )
            }
            var x = Object.defineProperty,
                A = Object.getOwnPropertySymbols,
                L = Object.prototype.hasOwnProperty,
                j = Object.prototype.propertyIsEnumerable,
                B = (e, t, a) =>
                    t in e
                        ? x(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: a
                          })
                        : (e[t] = a)
            const F = (0, n.memo)(function (e) {
                    var t = e,
                        { items: a } = t,
                        l = ((e, t) => {
                            var a = {}
                            for (var n in e)
                                L.call(e, n) &&
                                    t.indexOf(n) < 0 &&
                                    (a[n] = e[n])
                            if (null != e && A)
                                for (var n of A(e))
                                    t.indexOf(n) < 0 &&
                                        j.call(e, n) &&
                                        (a[n] = e[n])
                            return a
                        })(t, ["items"])
                    return n.createElement(
                        i.D_,
                        null,
                        a.map((e, t) =>
                            n.createElement(
                                Z,
                                ((e, t) => {
                                    for (var a in t || (t = {}))
                                        L.call(t, a) && B(e, a, t[a])
                                    if (A)
                                        for (var a of A(t))
                                            j.call(t, a) && B(e, a, t[a])
                                    return e
                                })({ key: t, item: e, index: t }, l)
                            )
                        )
                    )
                }),
                H = "sidebar_wnCi",
                D = "sidebarWithHideableNavbar_n3lc",
                R = "sidebarHidden_MUor",
                W = "sidebarLogo_I1aP",
                z = "menu_STsK",
                Y = "menuWithAnnouncementBar_Mwv2",
                K = "collapseSidebarButton_OOwH",
                U = "collapseSidebarButtonIcon_NZdi"
            var q = Object.defineProperty,
                Q = Object.getOwnPropertySymbols,
                J = Object.prototype.hasOwnProperty,
                V = Object.prototype.propertyIsEnumerable,
                X = (e, t, a) =>
                    t in e
                        ? q(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: a
                          })
                        : (e[t] = a),
                G = (e, t) => {
                    for (var a in t || (t = {})) J.call(t, a) && X(e, a, t[a])
                    if (Q) for (var a of Q(t)) V.call(t, a) && X(e, a, t[a])
                    return e
                }
            function $({ onClick: e }) {
                return n.createElement(
                    "button",
                    {
                        type: "button",
                        title: (0, h.I)({
                            id: "theme.docs.sidebar.collapseButtonTitle",
                            message: "Collapse sidebar",
                            description:
                                "The title attribute for collapse button of doc sidebar"
                        }),
                        "aria-label": (0, h.I)({
                            id: "theme.docs.sidebar.collapseButtonAriaLabel",
                            message: "Collapse sidebar",
                            description:
                                "The title attribute for collapse button of doc sidebar"
                        }),
                        className: (0, c.Z)(
                            "button button--secondary button--outline",
                            K
                        ),
                        onClick: e
                    },
                    n.createElement(f, { className: U })
                )
            }
            const ee = ({ toggleSidebar: e, sidebar: t, path: a }) =>
                n.createElement(
                    "ul",
                    {
                        className: (0, c.Z)(
                            i.kM.docs.docSidebarMenu,
                            "menu__list"
                        )
                    },
                    n.createElement(F, {
                        items: t,
                        activePath: a,
                        onItemClick: (t) => {
                            "category" === t.type && t.href && e(),
                                "link" === t.type && e()
                        },
                        level: 1
                    })
                )
            const te = n.memo(function ({
                    path: e,
                    sidebar: t,
                    onCollapse: a,
                    isHidden: l
                }) {
                    const o = (function () {
                            const { isActive: e } = (0, i.nT)(),
                                [t, a] = (0, n.useState)(e)
                            return (
                                (0, i.RF)(
                                    ({ scrollY: t }) => {
                                        e && a(0 === t)
                                    },
                                    [e]
                                ),
                                e && t
                            )
                        })(),
                        {
                            navbar: { hideOnScroll: r },
                            hideableSidebar: d
                        } = (0, i.LU)()
                    return n.createElement(
                        "div",
                        { className: (0, c.Z)(H, { [D]: r, [R]: l }) },
                        r &&
                            n.createElement(s.Z, {
                                tabIndex: -1,
                                className: W
                            }),
                        n.createElement(
                            "nav",
                            {
                                className: (0, c.Z)("menu thin-scrollbar", z, {
                                    [Y]: o
                                })
                            },
                            n.createElement(
                                "ul",
                                {
                                    className: (0, c.Z)(
                                        i.kM.docs.docSidebarMenu,
                                        "menu__list"
                                    )
                                },
                                n.createElement(F, {
                                    items: t,
                                    activePath: e,
                                    level: 1
                                })
                            )
                        ),
                        d && n.createElement($, { onClick: a })
                    )
                }),
                ae = n.memo(function (e) {
                    return n.createElement(i.Cv, { component: ee, props: e })
                })
            function ne(e) {
                const t = (0, i.iP)(),
                    a = "desktop" === t || "ssr" === t,
                    l = "mobile" === t
                return n.createElement(
                    n.Fragment,
                    null,
                    a && n.createElement(te, G({}, e)),
                    l && n.createElement(ae, G({}, e))
                )
            }
            var le = a(3314),
                oe = a(6489)
            const re = "backToTopButton_uQAH",
                ce = "backToTopButtonShow_KL2r"
            function ie() {
                const e = (0, n.useRef)(null)
                return {
                    smoothScrollTop: function () {
                        e.current = (function () {
                            let e = null
                            return (
                                (function t() {
                                    const a = document.documentElement.scrollTop
                                    a > 0 &&
                                        ((e = requestAnimationFrame(t)),
                                        window.scrollTo(
                                            0,
                                            Math.floor(0.85 * a)
                                        ))
                                })(),
                                () => e && cancelAnimationFrame(e)
                            )
                        })()
                    },
                    cancelScrollToTop: () => {
                        var t
                        return null == (t = e.current) ? void 0 : t.call(e)
                    }
                }
            }
            const se = function () {
                const [e, t] = (0, n.useState)(!1),
                    a = (0, n.useRef)(!1),
                    { smoothScrollTop: l, cancelScrollToTop: o } = ie()
                return (
                    (0, i.RF)(({ scrollY: e }, n) => {
                        const l = null == n ? void 0 : n.scrollY
                        if (!l) return
                        if (a.current) return void (a.current = !1)
                        const r = e < l
                        if ((r || o(), e < 300)) t(!1)
                        else if (r) {
                            const a = document.documentElement.scrollHeight
                            e + window.innerHeight < a && t(!0)
                        } else t(!1)
                    }),
                    (0, i.SL)((e) => {
                        e.location.hash && ((a.current = !0), t(!1))
                    }),
                    n.createElement("button", {
                        "aria-label": (0, h.I)({
                            id: "theme.BackToTopButton.buttonAriaLabel",
                            message: "Scroll back to top",
                            description:
                                "The ARIA label for the back to top button"
                        }),
                        className: (0, c.Z)(
                            "clean-btn",
                            i.kM.common.backToTopButton,
                            re,
                            { [ce]: e }
                        ),
                        type: "button",
                        onClick: () => l()
                    })
                )
            }
            var de = a(5008)
            const me = {
                docPage: "docPage_NMiw",
                docMainContainer: "docMainContainer_n1H2",
                docSidebarContainer: "docSidebarContainer_crTN",
                docMainContainerEnhanced: "docMainContainerEnhanced__lyJ",
                docSidebarContainerHidden: "docSidebarContainerHidden_Ek93",
                collapsedDocSidebar: "collapsedDocSidebar_KSdS",
                expandSidebarButtonIcon: "expandSidebarButtonIcon_fYZj",
                docItemWrapperEnhanced: "docItemWrapperEnhanced_IQo3"
            }
            var ue = a(8849)
            function be({
                currentDocRoute: e,
                versionMetadata: t,
                children: a,
                sidebarName: o
            }) {
                const s = (0, i.Vq)(),
                    { pluginId: d, version: m } = t,
                    [u, b] = (0, n.useState)(!1),
                    [p, v] = (0, n.useState)(!1),
                    E = (0, n.useCallback)(() => {
                        p && v(!1), b((e) => !e)
                    }, [p])
                return n.createElement(
                    r.Z,
                    {
                        wrapperClassName: i.kM.wrapper.docsPages,
                        pageClassName: i.kM.page.docsDocPage,
                        searchMetadata: { version: m, tag: (0, i.os)(d, m) }
                    },
                    n.createElement(
                        "div",
                        { className: me.docPage },
                        n.createElement(se, null),
                        s &&
                            n.createElement(
                                "aside",
                                {
                                    className: (0, c.Z)(
                                        i.kM.docs.docSidebarContainer,
                                        me.docSidebarContainer,
                                        { [me.docSidebarContainerHidden]: u }
                                    ),
                                    onTransitionEnd: (e) => {
                                        e.currentTarget.classList.contains(
                                            me.docSidebarContainer
                                        ) &&
                                            u &&
                                            v(!0)
                                    }
                                },
                                n.createElement(ne, {
                                    key: o,
                                    sidebar: s,
                                    path: e.path,
                                    onCollapse: E,
                                    isHidden: p
                                }),
                                p &&
                                    n.createElement(
                                        "div",
                                        {
                                            className: me.collapsedDocSidebar,
                                            title: (0, h.I)({
                                                id: "theme.docs.sidebar.expandButtonTitle",
                                                message: "Expand sidebar",
                                                description:
                                                    "The ARIA label and title attribute for expand button of doc sidebar"
                                            }),
                                            "aria-label": (0, h.I)({
                                                id: "theme.docs.sidebar.expandButtonAriaLabel",
                                                message: "Expand sidebar",
                                                description:
                                                    "The ARIA label and title attribute for expand button of doc sidebar"
                                            }),
                                            tabIndex: 0,
                                            role: "button",
                                            onKeyDown: E,
                                            onClick: E
                                        },
                                        n.createElement(f, {
                                            className:
                                                me.expandSidebarButtonIcon
                                        })
                                    )
                            ),
                        n.createElement(
                            "main",
                            {
                                className: (0, c.Z)(me.docMainContainer, {
                                    [me.docMainContainerEnhanced]: u || !s
                                })
                            },
                            n.createElement(
                                "div",
                                {
                                    className: (0, c.Z)(
                                        "container padding-top--md padding-bottom--lg",
                                        me.docItemWrapper,
                                        { [me.docItemWrapperEnhanced]: u }
                                    )
                                },
                                n.createElement(l.Zo, { components: le.Z }, a)
                            )
                        )
                    )
                )
            }
            const pe = function (e) {
                const {
                        route: { routes: t },
                        versionMetadata: a,
                        location: l
                    } = e,
                    r = t.find((e) => (0, de.LX)(l.pathname, e))
                if (!r) return n.createElement(oe.default, null)
                const c = r.sidebar,
                    s = c ? a.docsSidebars[c] : null
                return n.createElement(
                    n.Fragment,
                    null,
                    n.createElement(
                        ue.Z,
                        null,
                        n.createElement("html", { className: a.className })
                    ),
                    n.createElement(
                        i.qu,
                        { version: a },
                        n.createElement(
                            i.bT,
                            { sidebar: s },
                            n.createElement(
                                be,
                                {
                                    currentDocRoute: r,
                                    versionMetadata: a,
                                    sidebarName: c
                                },
                                (0, o.Z)(t, { versionMetadata: a })
                            )
                        )
                    )
                )
            }
        },
        6489: (e, t, a) => {
            a.r(t), a.d(t, { default: () => r })
            var n = a(1672),
                l = a(2350),
                o = a(6759)
            const r = function () {
                return n.createElement(
                    l.Z,
                    {
                        title: (0, o.I)({
                            id: "theme.NotFound.title",
                            message: "Page Not Found"
                        })
                    },
                    n.createElement(
                        "main",
                        { className: "container margin-vert--xl" },
                        n.createElement(
                            "div",
                            { className: "row" },
                            n.createElement(
                                "div",
                                { className: "col col--6 col--offset-3" },
                                n.createElement(
                                    "h1",
                                    { className: "hero__title" },
                                    n.createElement(
                                        o.Z,
                                        {
                                            id: "theme.NotFound.title",
                                            description:
                                                "The title of the 404 page"
                                        },
                                        "Page Not Found"
                                    )
                                ),
                                n.createElement(
                                    "p",
                                    null,
                                    n.createElement(
                                        o.Z,
                                        {
                                            id: "theme.NotFound.p1",
                                            description:
                                                "The first paragraph of the 404 page"
                                        },
                                        "We could not find what you were looking for."
                                    )
                                ),
                                n.createElement(
                                    "p",
                                    null,
                                    n.createElement(
                                        o.Z,
                                        {
                                            id: "theme.NotFound.p2",
                                            description:
                                                "The 2nd paragraph of the 404 page"
                                        },
                                        "Please contact the owner of the site that linked you to the original URL and let them know their link is broken."
                                    )
                                )
                            )
                        )
                    )
                )
            }
        }
    }
])
