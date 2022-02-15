"use strict"
;(self.webpackChunk_re_docs = self.webpackChunk_re_docs || []).push([
    [237],
    {
        7206: (e, t, n) => {
            n.r(t), n.d(t, { default: () => N })
            var a = n(1672),
                r = n(4722),
                l = n(2350),
                i = n(7989),
                s = n(8270)
            const c = "heroBanner_qdFl",
                o = "buttons_AeoN",
                m = "features_xdhU",
                u = "featureSvg__8YW"
            var d = Object.defineProperty,
                g = Object.getOwnPropertySymbols,
                p = Object.prototype.hasOwnProperty,
                E = Object.prototype.propertyIsEnumerable,
                f = (e, t, n) =>
                    t in e
                        ? d(e, t, {
                              enumerable: !0,
                              configurable: !0,
                              writable: !0,
                              value: n
                          })
                        : (e[t] = n)
            const b = [
                {
                    title: "O(damn) fast",
                    image: "/img/fast.svg",
                    description: a.createElement(
                        a.Fragment,
                        null,
                        "Automate your first test in minutes. Run it in seconds."
                    )
                },
                {
                    title: 'JS/TS integrations "just work"',
                    image: "/img/integrations.svg",
                    description: a.createElement(
                        a.Fragment,
                        null,
                        "Integrates seamlessly with the tools you're already using."
                    )
                },
                {
                    title: "100% open source",
                    image: "/img/openSource.svg",
                    description: a.createElement(
                        a.Fragment,
                        null,
                        "Stop in any time and star our GitHub repo \ud83d\ude09"
                    )
                }
            ]
            function h({ title: e, image: t, description: n }) {
                return a.createElement(
                    "div",
                    { className: (0, r.Z)("col col--4") },
                    a.createElement(
                        "div",
                        { className: "text--center" },
                        a.createElement("img", { className: u, alt: e, src: t })
                    ),
                    a.createElement(
                        "div",
                        { className: "text--center padding-horiz--md" },
                        a.createElement("h3", null, e),
                        a.createElement("p", null, n)
                    )
                )
            }
            function v() {
                return a.createElement(
                    "section",
                    { className: m },
                    a.createElement(
                        "div",
                        { className: "container" },
                        a.createElement(
                            "div",
                            { className: "row" },
                            b.map((e, t) =>
                                a.createElement(
                                    h,
                                    ((e, t) => {
                                        for (var n in t || (t = {}))
                                            p.call(t, n) && f(e, n, t[n])
                                        if (g)
                                            for (var n of g(t))
                                                E.call(t, n) && f(e, n, t[n])
                                        return e
                                    })({ key: t }, e)
                                )
                            )
                        )
                    )
                )
            }
            function y() {
                const { siteConfig: e } = (0, s.Z)()
                return a.createElement(
                    "header",
                    { className: (0, r.Z)("hero hero--primary", c) },
                    a.createElement(
                        "div",
                        { className: "container" },
                        a.createElement(
                            "h1",
                            { className: "hero__title" },
                            e.title
                        ),
                        a.createElement(
                            "p",
                            { className: "hero__subtitle" },
                            e.tagline
                        ),
                        a.createElement(
                            "div",
                            { className: o },
                            a.createElement(
                                i.Z,
                                {
                                    className:
                                        "button button--secondary button--lg",
                                    to: "/docs/model/intro"
                                },
                                "Tutorial - 5min \u23f1\ufe0f"
                            )
                        )
                    )
                )
            }
            function N() {
                const { siteConfig: e } = (0, s.Z)()
                return a.createElement(
                    l.Z,
                    {
                        title: `Hello from ${e.title}`,
                        description:
                            "Description will go into a meta tag in <head />"
                    },
                    a.createElement(y, null),
                    a.createElement("main", null, a.createElement(v, null))
                )
            }
        }
    }
])
