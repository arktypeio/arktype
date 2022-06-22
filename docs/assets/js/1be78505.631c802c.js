"use strict"
;(self.webpackChunkredo_dev = self.webpackChunkredo_dev || []).push([
    [514, 59],
    {
        6198: (e, t, n) => {
            n.r(t), n.d(t, { default: () => Xe })
            var a = n(3889),
                r = n(1626),
                l = n(3224),
                o = n(8794),
                c = n(8110),
                i = n(7833),
                s = n(3112),
                d = n(4021),
                m = n(9047),
                u = n(8456),
                b = n(6274),
                p = n(7302)
            const f = "backToTopButton_U0lR",
                h = "backToTopButtonShow_KUvj"
            function v() {
                const { shown: e, scrollToTop: t } = (function ({
                    threshold: e
                }) {
                    const [t, n] = (0, a.useState)(!1),
                        r = (0, a.useRef)(!1),
                        { startScroll: l, cancelScroll: o } = (0, b.Ct)()
                    return (
                        (0, b.RF)(({ scrollY: t }, a) => {
                            const l = null == a ? void 0 : a.scrollY
                            l &&
                                (r.current
                                    ? (r.current = !1)
                                    : t >= l
                                    ? (o(), n(!1))
                                    : t < e
                                    ? n(!1)
                                    : t + window.innerHeight <
                                          document.documentElement
                                              .scrollHeight && n(!0))
                        }),
                        (0, p.S)((e) => {
                            e.location.hash && ((r.current = !0), n(!1))
                        }),
                        { shown: t, scrollToTop: () => l(0) }
                    )
                })({ threshold: 300 })
                return a.createElement("button", {
                    "aria-label": (0, u.I)({
                        id: "theme.BackToTopButton.buttonAriaLabel",
                        message: "Scroll back to top",
                        description: "The ARIA label for the back to top button"
                    }),
                    className: (0, r.Z)(
                        "clean-btn",
                        i.k.common.backToTopButton,
                        f,
                        e && h
                    ),
                    type: "button",
                    onClick: t
                })
            }
            var E = n(5049),
                g = n(9649),
                y = n(9681),
                k = n(6290),
                _ = Object.defineProperty,
                C = Object.getOwnPropertySymbols,
                I = Object.prototype.hasOwnProperty,
                O = Object.prototype.propertyIsEnumerable,
                S = (e, t, n) =>
                    t in e
                        ? _(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: n
                          })
                        : (e[t] = n)
            function w(e) {
                return a.createElement(
                    "svg",
                    ((e, t) => {
                        for (var n in t || (t = {}))
                            I.call(t, n) && S(e, n, t[n])
                        if (C) for (var n of C(t)) O.call(t, n) && S(e, n, t[n])
                        return e
                    })({ width: "20", height: "20", "aria-hidden": "true" }, e),
                    a.createElement(
                        "g",
                        { fill: "#7a7a7a" },
                        a.createElement("path", {
                            d: "M9.992 10.023c0 .2-.062.399-.172.547l-4.996 7.492a.982.982 0 01-.828.454H1c-.55 0-1-.453-1-1 0-.2.059-.403.168-.551l4.629-6.942L.168 3.078A.939.939 0 010 2.528c0-.548.45-.997 1-.997h2.996c.352 0 .649.18.828.45L9.82 9.472c.11.148.172.347.172.55zm0 0"
                        }),
                        a.createElement("path", {
                            d: "M19.98 10.023c0 .2-.058.399-.168.547l-4.996 7.492a.987.987 0 01-.828.454h-3c-.547 0-.996-.453-.996-1 0-.2.059-.403.168-.551l4.625-6.942-4.625-6.945a.939.939 0 01-.168-.55 1 1 0 01.996-.997h3c.348 0 .649.18.828.45l4.996 7.492c.11.148.168.347.168.55zm0 0"
                        })
                    )
                )
            }
            const N = "collapseSidebarButton_G0sx",
                x = "collapseSidebarButtonIcon_xIE7"
            function P({ onClick: e }) {
                return a.createElement(
                    "button",
                    {
                        type: "button",
                        title: (0, u.I)({
                            id: "theme.docs.sidebar.collapseButtonTitle",
                            message: "Collapse sidebar",
                            description:
                                "The title attribute for collapse button of doc sidebar"
                        }),
                        "aria-label": (0, u.I)({
                            id: "theme.docs.sidebar.collapseButtonAriaLabel",
                            message: "Collapse sidebar",
                            description:
                                "The title attribute for collapse button of doc sidebar"
                        }),
                        className: (0, r.Z)(
                            "button button--secondary button--outline",
                            N
                        ),
                        onClick: e
                    },
                    a.createElement(w, { className: x })
                )
            }
            var T = n(1528),
                Z = n(4046)
            const j = Symbol("EmptyContext"),
                L = a.createContext(j)
            function A({ children: e }) {
                const [t, n] = (0, a.useState)(null),
                    r = (0, a.useMemo)(
                        () => ({ expandedItem: t, setExpandedItem: n }),
                        [t]
                    )
                return a.createElement(L.Provider, { value: r }, e)
            }
            var F = n(7826),
                M = n(968),
                B = n(9533),
                H = n(2178),
                R = Object.defineProperty,
                W = Object.getOwnPropertySymbols,
                D = Object.prototype.hasOwnProperty,
                V = Object.prototype.propertyIsEnumerable,
                q = (e, t, n) =>
                    t in e
                        ? R(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: n
                          })
                        : (e[t] = n)
            function z({ categoryLabel: e, onClick: t }) {
                return a.createElement("button", {
                    "aria-label": (0, u.I)(
                        {
                            id: "theme.DocSidebarItem.toggleCollapsedCategoryAriaLabel",
                            message:
                                "Toggle the collapsible sidebar category '{label}'",
                            description:
                                "The ARIA label to toggle the collapsible sidebar category"
                        },
                        { label: e }
                    ),
                    type: "button",
                    className: "clean-btn menu__caret",
                    onClick: t
                })
            }
            function U(e) {
                var t = e,
                    {
                        item: n,
                        onItemClick: o,
                        activePath: c,
                        level: s,
                        index: d
                    } = t,
                    m = ((e, t) => {
                        var n = {}
                        for (var a in e)
                            D.call(e, a) && t.indexOf(a) < 0 && (n[a] = e[a])
                        if (null != e && W)
                            for (var a of W(e))
                                t.indexOf(a) < 0 &&
                                    V.call(e, a) &&
                                    (n[a] = e[a])
                        return n
                    })(t, [
                        "item",
                        "onItemClick",
                        "activePath",
                        "level",
                        "index"
                    ])
                const {
                        items: u,
                        label: b,
                        collapsible: p,
                        className: f,
                        href: h
                    } = n,
                    {
                        docs: {
                            sidebar: { autoCollapseCategories: v }
                        }
                    } = (0, y.L)(),
                    E = (function (e) {
                        const t = (0, H.Z)()
                        return (0, a.useMemo)(
                            () =>
                                e.href
                                    ? e.href
                                    : !t && e.collapsible
                                    ? (0, l.Wl)(e)
                                    : void 0,
                            [e, t]
                        )
                    })(n),
                    g = (0, l._F)(n, c),
                    k = (0, F.Mg)(h, c),
                    { collapsed: _, setCollapsed: C } = (0, M.u)({
                        initialState: () => !!p && !g && n.collapsed
                    }),
                    { expandedItem: I, setExpandedItem: O } = (function () {
                        const e = (0, a.useContext)(L)
                        if (e === j)
                            throw new Z.i6(
                                "DocSidebarItemsExpandedStateProvider"
                            )
                        return e
                    })(),
                    S = (e = !_) => {
                        O(e ? null : d), C(e)
                    }
                return (
                    (function ({
                        isActive: e,
                        collapsed: t,
                        updateCollapsed: n
                    }) {
                        const r = (0, Z.D9)(e)
                        ;(0, a.useEffect)(() => {
                            e && !r && t && n(!1)
                        }, [e, r, t, n])
                    })({ isActive: g, collapsed: _, updateCollapsed: S }),
                    (0, a.useEffect)(() => {
                        p && I && I !== d && v && C(!0)
                    }, [p, I, d, C, v]),
                    a.createElement(
                        "li",
                        {
                            className: (0, r.Z)(
                                i.k.docs.docSidebarItemCategory,
                                i.k.docs.docSidebarItemCategoryLevel(s),
                                "menu__list-item",
                                { "menu__list-item--collapsed": _ },
                                f
                            )
                        },
                        a.createElement(
                            "div",
                            {
                                className: (0, r.Z)(
                                    "menu__list-item-collapsible",
                                    { "menu__list-item-collapsible--active": k }
                                )
                            },
                            a.createElement(
                                B.Z,
                                ((e, t) => {
                                    for (var n in t || (t = {}))
                                        D.call(t, n) && q(e, n, t[n])
                                    if (W)
                                        for (var n of W(t))
                                            V.call(t, n) && q(e, n, t[n])
                                    return e
                                })(
                                    {
                                        className: (0, r.Z)("menu__link", {
                                            "menu__link--sublist": p,
                                            "menu__link--sublist-caret":
                                                !h && p,
                                            "menu__link--active": g
                                        }),
                                        onClick: p
                                            ? (e) => {
                                                  null == o || o(n),
                                                      h
                                                          ? S(!1)
                                                          : (e.preventDefault(),
                                                            S())
                                              }
                                            : () => {
                                                  null == o || o(n)
                                              },
                                        "aria-current": k ? "page" : void 0,
                                        "aria-expanded": p ? !_ : void 0,
                                        href: p ? (null != E ? E : "#") : E
                                    },
                                    m
                                ),
                                b
                            ),
                            h &&
                                p &&
                                a.createElement(z, {
                                    categoryLabel: b,
                                    onClick: (e) => {
                                        e.preventDefault(), S()
                                    }
                                })
                        ),
                        a.createElement(
                            M.z,
                            {
                                lazy: !0,
                                as: "ul",
                                className: "menu__list",
                                collapsed: _
                            },
                            a.createElement(ve, {
                                items: u,
                                tabIndex: _ ? -1 : 0,
                                onItemClick: o,
                                activePath: c,
                                level: s + 1
                            })
                        )
                    )
                )
            }
            var Y = n(8206),
                G = n(5162)
            const K = "menuExternalLink_dV_i"
            var Q = Object.defineProperty,
                X = Object.getOwnPropertySymbols,
                J = Object.prototype.hasOwnProperty,
                $ = Object.prototype.propertyIsEnumerable,
                ee = (e, t, n) =>
                    t in e
                        ? Q(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: n
                          })
                        : (e[t] = n),
                te = (e, t) => {
                    for (var n in t || (t = {})) J.call(t, n) && ee(e, n, t[n])
                    if (X) for (var n of X(t)) $.call(t, n) && ee(e, n, t[n])
                    return e
                }
            function ne(e) {
                var t = e,
                    {
                        item: n,
                        onItemClick: o,
                        activePath: c,
                        level: s,
                        index: d
                    } = t,
                    m = ((e, t) => {
                        var n = {}
                        for (var a in e)
                            J.call(e, a) && t.indexOf(a) < 0 && (n[a] = e[a])
                        if (null != e && X)
                            for (var a of X(e))
                                t.indexOf(a) < 0 &&
                                    $.call(e, a) &&
                                    (n[a] = e[a])
                        return n
                    })(t, [
                        "item",
                        "onItemClick",
                        "activePath",
                        "level",
                        "index"
                    ])
                const { href: u, label: b, className: p } = n,
                    f = (0, l._F)(n, c),
                    h = (0, Y.Z)(u)
                return a.createElement(
                    "li",
                    {
                        className: (0, r.Z)(
                            i.k.docs.docSidebarItemLink,
                            i.k.docs.docSidebarItemLinkLevel(s),
                            "menu__list-item",
                            p
                        ),
                        key: b
                    },
                    a.createElement(
                        B.Z,
                        te(
                            te(
                                {
                                    className: (0, r.Z)("menu__link", !h && K, {
                                        "menu__link--active": f
                                    }),
                                    "aria-current": f ? "page" : void 0,
                                    to: u
                                },
                                h && { onClick: o ? () => o(n) : void 0 }
                            ),
                            m
                        ),
                        b,
                        !h && a.createElement(G.Z, null)
                    )
                )
            }
            const ae = "menuHtmlItem_fccV"
            function re({ item: e, level: t, index: n }) {
                const { value: l, defaultStyle: o, className: c } = e
                return a.createElement("li", {
                    className: (0, r.Z)(
                        i.k.docs.docSidebarItemLink,
                        i.k.docs.docSidebarItemLinkLevel(t),
                        o && [ae, "menu__list-item"],
                        c
                    ),
                    key: n,
                    dangerouslySetInnerHTML: { __html: l }
                })
            }
            var le = Object.defineProperty,
                oe = Object.getOwnPropertySymbols,
                ce = Object.prototype.hasOwnProperty,
                ie = Object.prototype.propertyIsEnumerable,
                se = (e, t, n) =>
                    t in e
                        ? le(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: n
                          })
                        : (e[t] = n),
                de = (e, t) => {
                    for (var n in t || (t = {})) ce.call(t, n) && se(e, n, t[n])
                    if (oe) for (var n of oe(t)) ie.call(t, n) && se(e, n, t[n])
                    return e
                }
            function me(e) {
                var t = e,
                    { item: n } = t,
                    r = ((e, t) => {
                        var n = {}
                        for (var a in e)
                            ce.call(e, a) && t.indexOf(a) < 0 && (n[a] = e[a])
                        if (null != e && oe)
                            for (var a of oe(e))
                                t.indexOf(a) < 0 &&
                                    ie.call(e, a) &&
                                    (n[a] = e[a])
                        return n
                    })(t, ["item"])
                switch (n.type) {
                    case "category":
                        return a.createElement(U, de({ item: n }, r))
                    case "html":
                        return a.createElement(re, de({ item: n }, r))
                    default:
                        return a.createElement(ne, de({ item: n }, r))
                }
            }
            var ue = Object.defineProperty,
                be = Object.getOwnPropertySymbols,
                pe = Object.prototype.hasOwnProperty,
                fe = Object.prototype.propertyIsEnumerable,
                he = (e, t, n) =>
                    t in e
                        ? ue(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: n
                          })
                        : (e[t] = n)
            const ve = (0, a.memo)(function (e) {
                    var t = e,
                        { items: n } = t,
                        r = ((e, t) => {
                            var n = {}
                            for (var a in e)
                                pe.call(e, a) &&
                                    t.indexOf(a) < 0 &&
                                    (n[a] = e[a])
                            if (null != e && be)
                                for (var a of be(e))
                                    t.indexOf(a) < 0 &&
                                        fe.call(e, a) &&
                                        (n[a] = e[a])
                            return n
                        })(t, ["items"])
                    return a.createElement(
                        A,
                        null,
                        n.map((e, t) =>
                            a.createElement(
                                me,
                                ((e, t) => {
                                    for (var n in t || (t = {}))
                                        pe.call(t, n) && he(e, n, t[n])
                                    if (be)
                                        for (var n of be(t))
                                            fe.call(t, n) && he(e, n, t[n])
                                    return e
                                })({ key: t, item: e, index: t }, r)
                            )
                        )
                    )
                }),
                Ee = "menu_rX2W",
                ge = "menuWithAnnouncementBar_Sr59"
            function ye({ path: e, sidebar: t, className: n }) {
                const l = (function () {
                    const { isActive: e } = (0, T.nT)(),
                        [t, n] = (0, a.useState)(e)
                    return (
                        (0, b.RF)(
                            ({ scrollY: t }) => {
                                e && n(0 === t)
                            },
                            [e]
                        ),
                        e && t
                    )
                })()
                return a.createElement(
                    "nav",
                    {
                        className: (0, r.Z)(
                            "menu thin-scrollbar",
                            Ee,
                            l && ge,
                            n
                        )
                    },
                    a.createElement(
                        "ul",
                        {
                            className: (0, r.Z)(
                                i.k.docs.docSidebarMenu,
                                "menu__list"
                            )
                        },
                        a.createElement(ve, {
                            items: t,
                            activePath: e,
                            level: 1
                        })
                    )
                )
            }
            const ke = "sidebar_VOFR",
                _e = "sidebarWithHideableNavbar_iqCF",
                Ce = "sidebarHidden_amwI",
                Ie = "sidebarLogo_p3hw"
            const Oe = a.memo(function ({
                path: e,
                sidebar: t,
                onCollapse: n,
                isHidden: l
            }) {
                const {
                    navbar: { hideOnScroll: o },
                    docs: {
                        sidebar: { hideable: c }
                    }
                } = (0, y.L)()
                return a.createElement(
                    "div",
                    { className: (0, r.Z)(ke, o && _e, l && Ce) },
                    o && a.createElement(k.Z, { tabIndex: -1, className: Ie }),
                    a.createElement(ye, { path: e, sidebar: t }),
                    c && a.createElement(P, { onClick: n })
                )
            })
            var Se = n(4012),
                we = n(9028)
            const Ne = ({ sidebar: e, path: t }) => {
                const n = (0, Se.e)()
                return a.createElement(
                    "ul",
                    {
                        className: (0, r.Z)(
                            i.k.docs.docSidebarMenu,
                            "menu__list"
                        )
                    },
                    a.createElement(ve, {
                        items: e,
                        activePath: t,
                        onItemClick: (e) => {
                            "category" === e.type && e.href && n.toggle(),
                                "link" === e.type && n.toggle()
                        },
                        level: 1
                    })
                )
            }
            const xe = a.memo(function (e) {
                return a.createElement(we.Zo, { component: Ne, props: e })
            })
            var Pe = Object.defineProperty,
                Te = Object.getOwnPropertySymbols,
                Ze = Object.prototype.hasOwnProperty,
                je = Object.prototype.propertyIsEnumerable,
                Le = (e, t, n) =>
                    t in e
                        ? Pe(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: n
                          })
                        : (e[t] = n),
                Ae = (e, t) => {
                    for (var n in t || (t = {})) Ze.call(t, n) && Le(e, n, t[n])
                    if (Te) for (var n of Te(t)) je.call(t, n) && Le(e, n, t[n])
                    return e
                }
            function Fe(e) {
                const t = (0, g.i)(),
                    n = "desktop" === t || "ssr" === t,
                    r = "mobile" === t
                return a.createElement(
                    a.Fragment,
                    null,
                    n && a.createElement(Oe, Ae({}, e)),
                    r && a.createElement(xe, Ae({}, e))
                )
            }
            const Me = "expandButton_o8bU",
                Be = "expandButtonIcon_wIIO"
            function He({ toggleSidebar: e }) {
                return a.createElement(
                    "div",
                    {
                        className: Me,
                        title: (0, u.I)({
                            id: "theme.docs.sidebar.expandButtonTitle",
                            message: "Expand sidebar",
                            description:
                                "The ARIA label and title attribute for expand button of doc sidebar"
                        }),
                        "aria-label": (0, u.I)({
                            id: "theme.docs.sidebar.expandButtonAriaLabel",
                            message: "Expand sidebar",
                            description:
                                "The ARIA label and title attribute for expand button of doc sidebar"
                        }),
                        tabIndex: 0,
                        role: "button",
                        onKeyDown: e,
                        onClick: e
                    },
                    a.createElement(w, { className: Be })
                )
            }
            const Re = "docSidebarContainer_H84R",
                We = "docSidebarContainerHidden_qWQa"
            function De({ children: e }) {
                var t
                const n = (0, d.V)()
                return a.createElement(
                    a.Fragment,
                    {
                        key:
                            null != (t = null == n ? void 0 : n.name)
                                ? t
                                : "noSidebar"
                    },
                    e
                )
            }
            function Ve({
                sidebar: e,
                hiddenSidebarContainer: t,
                setHiddenSidebarContainer: n
            }) {
                const { pathname: l } = (0, E.TH)(),
                    [o, c] = (0, a.useState)(!1),
                    s = (0, a.useCallback)(() => {
                        o && c(!1), n((e) => !e)
                    }, [n, o])
                return a.createElement(
                    "aside",
                    {
                        className: (0, r.Z)(
                            i.k.docs.docSidebarContainer,
                            Re,
                            t && We
                        ),
                        onTransitionEnd: (e) => {
                            e.currentTarget.classList.contains(Re) && t && c(!0)
                        }
                    },
                    a.createElement(
                        De,
                        null,
                        a.createElement(Fe, {
                            sidebar: e,
                            path: l,
                            onCollapse: s,
                            isHidden: o
                        })
                    ),
                    o && a.createElement(He, { toggleSidebar: s })
                )
            }
            const qe = {
                docMainContainer: "docMainContainer_QDer",
                docMainContainerEnhanced: "docMainContainerEnhanced_aqYr",
                docItemWrapperEnhanced: "docItemWrapperEnhanced_RmR4"
            }
            function ze({ hiddenSidebarContainer: e, children: t }) {
                const n = (0, d.V)()
                return a.createElement(
                    "main",
                    {
                        className: (0, r.Z)(
                            qe.docMainContainer,
                            (e || !n) && qe.docMainContainerEnhanced
                        )
                    },
                    a.createElement(
                        "div",
                        {
                            className: (0, r.Z)(
                                "container padding-top--md padding-bottom--lg",
                                qe.docItemWrapper,
                                e && qe.docItemWrapperEnhanced
                            )
                        },
                        t
                    )
                )
            }
            const Ue = "docPage_qck4",
                Ye = "docsWrapper_DV16"
            function Ge({ children: e }) {
                const t = (0, d.V)(),
                    [n, r] = (0, a.useState)(!1)
                return a.createElement(
                    m.Z,
                    { wrapperClassName: Ye },
                    a.createElement(v, null),
                    a.createElement(
                        "div",
                        { className: Ue },
                        t &&
                            a.createElement(Ve, {
                                sidebar: t.items,
                                hiddenSidebarContainer: n,
                                setHiddenSidebarContainer: r
                            }),
                        a.createElement(ze, { hiddenSidebarContainer: n }, e)
                    )
                )
            }
            var Ke = n(7777),
                Qe = n(5434)
            function Xe(e) {
                const { versionMetadata: t } = e,
                    n = (0, l.hI)(e)
                if (!n) return a.createElement(Ke.default, null)
                const { docElement: m, sidebarName: u, sidebarItems: b } = n
                return a.createElement(
                    a.Fragment,
                    null,
                    a.createElement(Qe.Z, {
                        version: t.version,
                        tag: (0, o.os)(t.pluginId, t.version)
                    }),
                    a.createElement(
                        c.FG,
                        {
                            className: (0, r.Z)(
                                i.k.wrapper.docsPages,
                                i.k.page.docsDocPage,
                                e.versionMetadata.className
                            )
                        },
                        a.createElement(
                            s.q,
                            { version: t },
                            a.createElement(
                                d.b,
                                { name: u, items: b },
                                a.createElement(Ge, null, m)
                            )
                        )
                    )
                )
            }
        },
        7777: (e, t, n) => {
            n.r(t), n.d(t, { default: () => c })
            var a = n(3889),
                r = n(8456),
                l = n(8110),
                o = n(9047)
            function c() {
                return a.createElement(
                    a.Fragment,
                    null,
                    a.createElement(l.d, {
                        title: (0, r.I)({
                            id: "theme.NotFound.title",
                            message: "Page Not Found"
                        })
                    }),
                    a.createElement(
                        o.Z,
                        null,
                        a.createElement(
                            "main",
                            { className: "container margin-vert--xl" },
                            a.createElement(
                                "div",
                                { className: "row" },
                                a.createElement(
                                    "div",
                                    { className: "col col--6 col--offset-3" },
                                    a.createElement(
                                        "h1",
                                        { className: "hero__title" },
                                        a.createElement(
                                            r.Z,
                                            {
                                                id: "theme.NotFound.title",
                                                description:
                                                    "The title of the 404 page"
                                            },
                                            "Page Not Found"
                                        )
                                    ),
                                    a.createElement(
                                        "p",
                                        null,
                                        a.createElement(
                                            r.Z,
                                            {
                                                id: "theme.NotFound.p1",
                                                description:
                                                    "The first paragraph of the 404 page"
                                            },
                                            "We could not find what you were looking for."
                                        )
                                    ),
                                    a.createElement(
                                        "p",
                                        null,
                                        a.createElement(
                                            r.Z,
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
                )
            }
        },
        3112: (e, t, n) => {
            n.d(t, { E: () => c, q: () => o })
            var a = n(3889),
                r = n(4046)
            const l = a.createContext(null)
            function o({ children: e, version: t }) {
                return a.createElement(l.Provider, { value: t }, e)
            }
            function c() {
                const e = (0, a.useContext)(l)
                if (null === e) throw new r.i6("DocsVersionProvider")
                return e
            }
        }
    }
])
