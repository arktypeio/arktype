"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [85],
    {
        335: (e, a, t) => {
            t.r(a), t.d(a, { default: () => d })
            var l = t(1672),
                n = t(4722),
                r = t(2350),
                i = t(6383),
                c = t(3314),
                s = t(5240),
                o = t(816)
            const m = "mdxPageWrapper_kkVe"
            const d = function (e) {
                const { content: a } = e,
                    {
                        metadata: {
                            title: t,
                            description: d,
                            permalink: f,
                            frontMatter: v
                        }
                    } = a,
                    { wrapperClassName: p, hide_table_of_contents: u } = v
                return l.createElement(
                    r.Z,
                    {
                        title: t,
                        description: d,
                        permalink: f,
                        wrapperClassName: null != p ? p : o.kM.wrapper.mdxPages,
                        pageClassName: o.kM.page.mdxPage
                    },
                    l.createElement(
                        "main",
                        {
                            className:
                                "container container--fluid margin-vert--lg"
                        },
                        l.createElement(
                            "div",
                            { className: (0, n.Z)("row", m) },
                            l.createElement(
                                "div",
                                { className: (0, n.Z)("col", !u && "col--8") },
                                l.createElement(
                                    i.Zo,
                                    { components: c.Z },
                                    l.createElement(a, null)
                                )
                            ),
                            !u &&
                                a.toc &&
                                l.createElement(
                                    "div",
                                    { className: "col col--2" },
                                    l.createElement(s.Z, {
                                        toc: a.toc,
                                        minHeadingLevel:
                                            v.toc_min_heading_level,
                                        maxHeadingLevel: v.toc_max_heading_level
                                    })
                                )
                        )
                    )
                )
            }
        },
        5240: (e, a, t) => {
            t.d(a, { Z: () => p })
            var l = t(1672),
                n = t(4722),
                r = t(5382)
            const i = "tableOfContents_AXys"
            var c = Object.defineProperty,
                s = Object.defineProperties,
                o = Object.getOwnPropertyDescriptors,
                m = Object.getOwnPropertySymbols,
                d = Object.prototype.hasOwnProperty,
                f = Object.prototype.propertyIsEnumerable,
                v = (e, a, t) =>
                    a in e
                        ? c(e, a, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: t
                          })
                        : (e[a] = t)
            const p = function (e) {
                var a,
                    t = e,
                    { className: c } = t,
                    p = ((e, a) => {
                        var t = {}
                        for (var l in e)
                            d.call(e, l) && a.indexOf(l) < 0 && (t[l] = e[l])
                        if (null != e && m)
                            for (var l of m(e))
                                a.indexOf(l) < 0 &&
                                    f.call(e, l) &&
                                    (t[l] = e[l])
                        return t
                    })(t, ["className"])
                return l.createElement(
                    "div",
                    { className: (0, n.Z)(i, "thin-scrollbar", c) },
                    l.createElement(
                        r.Z,
                        ((a = ((e, a) => {
                            for (var t in a || (a = {}))
                                d.call(a, t) && v(e, t, a[t])
                            if (m)
                                for (var t of m(a))
                                    f.call(a, t) && v(e, t, a[t])
                            return e
                        })({}, p)),
                        s(
                            a,
                            o({
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
        5382: (e, a, t) => {
            t.d(a, { Z: () => d })
            var l = t(1672),
                n = t(816),
                r = Object.defineProperty,
                i = Object.getOwnPropertySymbols,
                c = Object.prototype.hasOwnProperty,
                s = Object.prototype.propertyIsEnumerable,
                o = (e, a, t) =>
                    a in e
                        ? r(e, a, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: t
                          })
                        : (e[a] = t)
            function m({ toc: e, className: a, linkClassName: t, isChild: n }) {
                return e.length
                    ? l.createElement(
                          "ul",
                          { className: n ? void 0 : a },
                          e.map((e) =>
                              l.createElement(
                                  "li",
                                  { key: e.id },
                                  l.createElement("a", {
                                      href: `#${e.id}`,
                                      className: null != t ? t : void 0,
                                      dangerouslySetInnerHTML: {
                                          __html: e.value
                                      }
                                  }),
                                  l.createElement(m, {
                                      isChild: !0,
                                      toc: e.children,
                                      className: a,
                                      linkClassName: t
                                  })
                              )
                          )
                      )
                    : null
            }
            function d(e) {
                var a = e,
                    {
                        toc: t,
                        className:
                            r = "table-of-contents table-of-contents__left-border",
                        linkClassName: d = "table-of-contents__link",
                        linkActiveClassName: f,
                        minHeadingLevel: v,
                        maxHeadingLevel: p
                    } = a,
                    u = ((e, a) => {
                        var t = {}
                        for (var l in e)
                            c.call(e, l) && a.indexOf(l) < 0 && (t[l] = e[l])
                        if (null != e && i)
                            for (var l of i(e))
                                a.indexOf(l) < 0 &&
                                    s.call(e, l) &&
                                    (t[l] = e[l])
                        return t
                    })(a, [
                        "toc",
                        "className",
                        "linkClassName",
                        "linkActiveClassName",
                        "minHeadingLevel",
                        "maxHeadingLevel"
                    ])
                const b = (0, n.LU)(),
                    g = null != v ? v : b.tableOfContents.minHeadingLevel,
                    N = null != p ? p : b.tableOfContents.maxHeadingLevel,
                    k = (0, n.DA)({
                        toc: t,
                        minHeadingLevel: g,
                        maxHeadingLevel: N
                    }),
                    _ = (0, l.useMemo)(() => {
                        if (d && f)
                            return {
                                linkClassName: d,
                                linkActiveClassName: f,
                                minHeadingLevel: g,
                                maxHeadingLevel: N
                            }
                    }, [d, f, g, N])
                return (
                    (0, n.Si)(_),
                    l.createElement(
                        m,
                        ((e, a) => {
                            for (var t in a || (a = {}))
                                c.call(a, t) && o(e, t, a[t])
                            if (i)
                                for (var t of i(a))
                                    s.call(a, t) && o(e, t, a[t])
                            return e
                        })({ toc: k, className: r, linkClassName: d }, u)
                    )
                )
            }
        }
    }
])
