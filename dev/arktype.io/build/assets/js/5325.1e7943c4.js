;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [5325],
    {
        1401: (t, e, n) => {
            "use strict"
            var r = n(8772)
            e.Z = void 0
            var o = r(n(5147)),
                i = n(4637),
                a = (0, o.default)(
                    (0, i.jsx)("path", {
                        d: "m12 8-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"
                    }),
                    "ExpandLess"
                )
            e.Z = a
        },
        8352: (t, e, n) => {
            "use strict"
            var r = n(8772)
            e.Z = void 0
            var o = r(n(5147)),
                i = n(4637),
                a = (0, o.default)(
                    (0, i.jsx)("path", {
                        d: "M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z"
                    }),
                    "ExpandMore"
                )
            e.Z = a
        },
        5147: (t, e, n) => {
            "use strict"
            Object.defineProperty(e, "__esModule", { value: !0 }),
                Object.defineProperty(e, "default", {
                    enumerable: !0,
                    get: function () {
                        return r.createSvgIcon
                    }
                })
            var r = n(1623)
        },
        2920: (t, e, n) => {
            "use strict"
            n.d(e, { ZP: () => $ })
            var r = n(574),
                o = n(1163)
            var i = n(7995),
                a = n(8164),
                s = n(8658)
            const u = { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
                l = {
                    keys: ["xs", "sm", "md", "lg", "xl"],
                    up: (t) => `@media (min-width:${u[t]}px)`
                }
            function c(t, e, n) {
                const r = t.theme || {}
                if (Array.isArray(e)) {
                    const t = r.breakpoints || l
                    return e.reduce(
                        (r, o, i) => ((r[t.up(t.keys[i])] = n(e[i])), r),
                        {}
                    )
                }
                if ("object" == typeof e) {
                    const t = r.breakpoints || l
                    return Object.keys(e).reduce((r, o) => {
                        if (-1 !== Object.keys(t.values || u).indexOf(o)) {
                            r[t.up(o)] = n(e[o], o)
                        } else {
                            const t = o
                            r[t] = e[t]
                        }
                        return r
                    }, {})
                }
                return n(e)
            }
            function d({ values: t, breakpoints: e, base: n }) {
                const r =
                        n ||
                        (function (t, e) {
                            if ("object" != typeof t) return {}
                            const n = {},
                                r = Object.keys(e)
                            return (
                                Array.isArray(t)
                                    ? r.forEach((e, r) => {
                                          r < t.length && (n[e] = !0)
                                      })
                                    : r.forEach((e) => {
                                          null != t[e] && (n[e] = !0)
                                      }),
                                n
                            )
                        })(t, e),
                    o = Object.keys(r)
                if (0 === o.length) return t
                let i
                return o.reduce(
                    (e, n, r) => (
                        Array.isArray(t)
                            ? ((e[n] = null != t[r] ? t[r] : t[i]), (i = r))
                            : "object" == typeof t
                            ? ((e[n] = null != t[n] ? t[n] : t[i]), (i = n))
                            : (e[n] = t),
                        e
                    ),
                    {}
                )
            }
            function p(t, e, n = !0) {
                if (!e || "string" != typeof e) return null
                if (t && t.vars && n) {
                    const n = `vars.${e}`
                        .split(".")
                        .reduce((t, e) => (t && t[e] ? t[e] : null), t)
                    if (null != n) return n
                }
                return e
                    .split(".")
                    .reduce((t, e) => (t && null != t[e] ? t[e] : null), t)
            }
            function f(t) {
                return (
                    null !== t &&
                    "object" == typeof t &&
                    t.constructor === Object
                )
            }
            function v(t) {
                if (!f(t)) return t
                const e = {}
                return (
                    Object.keys(t).forEach((n) => {
                        e[n] = v(t[n])
                    }),
                    e
                )
            }
            function h(t, e, n = { clone: !0 }) {
                const r = n.clone ? (0, o.Z)({}, t) : t
                return (
                    f(t) &&
                        f(e) &&
                        Object.keys(e).forEach((o) => {
                            "__proto__" !== o &&
                                (f(e[o]) && o in t && f(t[o])
                                    ? (r[o] = h(t[o], e[o], n))
                                    : n.clone
                                    ? (r[o] = f(e[o]) ? v(e[o]) : e[o])
                                    : (r[o] = e[o]))
                        }),
                    r
                )
            }
            const m = function (t, e) {
                return e ? h(t, e, { clone: !1 }) : t
            }
            const g = { m: "margin", p: "padding" },
                y = {
                    t: "Top",
                    r: "Right",
                    b: "Bottom",
                    l: "Left",
                    x: ["Left", "Right"],
                    y: ["Top", "Bottom"]
                },
                x = {
                    marginX: "mx",
                    marginY: "my",
                    paddingX: "px",
                    paddingY: "py"
                },
                b = (function (t) {
                    const e = {}
                    return (n) => (void 0 === e[n] && (e[n] = t(n)), e[n])
                })((t) => {
                    if (t.length > 2) {
                        if (!x[t]) return [t]
                        t = x[t]
                    }
                    const [e, n] = t.split(""),
                        r = g[e],
                        o = y[n] || ""
                    return Array.isArray(o) ? o.map((t) => r + t) : [r + o]
                }),
                w = [
                    "m",
                    "mt",
                    "mr",
                    "mb",
                    "ml",
                    "mx",
                    "my",
                    "margin",
                    "marginTop",
                    "marginRight",
                    "marginBottom",
                    "marginLeft",
                    "marginX",
                    "marginY",
                    "marginInline",
                    "marginInlineStart",
                    "marginInlineEnd",
                    "marginBlock",
                    "marginBlockStart",
                    "marginBlockEnd"
                ],
                S = [
                    "p",
                    "pt",
                    "pr",
                    "pb",
                    "pl",
                    "px",
                    "py",
                    "padding",
                    "paddingTop",
                    "paddingRight",
                    "paddingBottom",
                    "paddingLeft",
                    "paddingX",
                    "paddingY",
                    "paddingInline",
                    "paddingInlineStart",
                    "paddingInlineEnd",
                    "paddingBlock",
                    "paddingBlockStart",
                    "paddingBlockEnd"
                ],
                E = [...w, ...S]
            function C(t) {
                return (function (t, e, n, r) {
                    var o
                    const i = null != (o = p(t, e, !1)) ? o : n
                    return "number" == typeof i
                        ? (t) => ("string" == typeof t ? t : i * t)
                        : Array.isArray(i)
                        ? (t) => ("string" == typeof t ? t : i[t])
                        : "function" == typeof i
                        ? i
                        : () => {}
                })(t, "spacing", 8)
            }
            function P(t, e) {
                if ("string" == typeof e || null == e) return e
                const n = t(Math.abs(e))
                return e >= 0 ? n : "number" == typeof n ? -n : `-${n}`
            }
            function T(t, e, n, r) {
                if (-1 === e.indexOf(n)) return null
                const o = (function (t, e) {
                    return (n) => t.reduce((t, r) => ((t[r] = P(e, n)), t), {})
                })(b(n), r)
                return c(t, t[n], o)
            }
            function R(t, e) {
                const n = C(t.theme)
                return Object.keys(t)
                    .map((r) => T(t, e, r, n))
                    .reduce(m, {})
            }
            function A(t) {
                return R(t, w)
            }
            function M(t) {
                return R(t, S)
            }
            function V(t) {
                return R(t, E)
            }
            ;(A.propTypes = {}),
                (A.filterProps = w),
                (M.propTypes = {}),
                (M.filterProps = S),
                (V.propTypes = {}),
                (V.filterProps = E)
            var k = n(9496)
            var L = n(5924),
                Z = n(9989)
            function j(t) {
                return (0, Z.Z)("MuiMasonry", t)
            }
            ;(0, n(1481).Z)("MuiMasonry", ["root"])
            var O = n(4637)
            const D = [
                    "children",
                    "className",
                    "component",
                    "columns",
                    "spacing",
                    "defaultColumns",
                    "defaultHeight",
                    "defaultSpacing"
                ],
                B = (t) => Number(t.replace("px", "")),
                I = { flexBasis: "100%", width: 0, margin: 0, padding: 0 },
                F = (t) => {
                    const { classes: e } = t
                    return (function (t, e, n) {
                        const r = {}
                        return (
                            Object.keys(t).forEach((o) => {
                                r[o] = t[o]
                                    .reduce(
                                        (t, r) => (
                                            r &&
                                                (t.push(e(r)),
                                                n && n[r] && t.push(n[r])),
                                            t
                                        ),
                                        []
                                    )
                                    .join(" ")
                            }),
                            r
                        )
                    })({ root: ["root"] }, j, e)
                },
                z = (0, a.ZP)("div", {
                    name: "MuiMasonry",
                    slot: "Root",
                    overridesResolver: (t, e) => [e.root]
                })(({ ownerState: t, theme: e }) => {
                    let n = {
                        width: "100%",
                        display: "flex",
                        flexFlow: "column wrap",
                        alignContent: "flex-start",
                        boxSizing: "border-box",
                        "& > *": { boxSizing: "border-box" }
                    }
                    const r = {}
                    if (t.isSSR) {
                        const i = {},
                            a = B(e.spacing(t.defaultSpacing))
                        for (let e = 1; e <= t.defaultColumns; e += 1)
                            i[
                                `&:nth-of-type(${t.defaultColumns}n+${
                                    e % t.defaultColumns
                                })`
                            ] = { order: e }
                        return (
                            (r.height = t.defaultHeight),
                            (r.margin = -a / 2),
                            (r["& > *"] = (0, o.Z)({}, n["& > *"], i, {
                                margin: a / 2,
                                width: `calc(${(100 / t.defaultColumns).toFixed(
                                    2
                                )}% - ${a}px)`
                            })),
                            (0, o.Z)({}, n, r)
                        )
                    }
                    const i = d({
                            values: t.spacing,
                            breakpoints: e.breakpoints.values
                        }),
                        a = C(e)
                    n = h(
                        n,
                        c({ theme: e }, i, (e) => {
                            let n
                            if (
                                ("string" == typeof e &&
                                    !Number.isNaN(Number(e))) ||
                                "number" == typeof e
                            ) {
                                const t = Number(e)
                                n = P(a, t)
                            } else n = e
                            return (0, o.Z)(
                                {
                                    margin: `calc(0px - (${n} / 2))`,
                                    "& > *": { margin: `calc(${n} / 2)` }
                                },
                                t.maxColumnHeight && {
                                    height:
                                        "number" == typeof n
                                            ? Math.ceil(
                                                  t.maxColumnHeight + B(n)
                                              )
                                            : `calc(${t.maxColumnHeight}px + ${n})`
                                }
                            )
                        })
                    )
                    const s = d({
                        values: t.columns,
                        breakpoints: e.breakpoints.values
                    })
                    return (
                        (n = h(
                            n,
                            c({ theme: e }, s, (t) => ({
                                "& > *": {
                                    width: `calc(${`${(100 / Number(t)).toFixed(
                                        2
                                    )}%`} - ${
                                        ("string" == typeof i &&
                                            !Number.isNaN(Number(i))) ||
                                        "number" == typeof i
                                            ? P(a, Number(i))
                                            : "0px"
                                    })`
                                }
                            }))
                        )),
                        "object" == typeof i &&
                            (n = h(
                                n,
                                c({ theme: e }, i, (t, e) => {
                                    if (e) {
                                        const n = Number(t),
                                            r = Object.keys(s).pop(),
                                            o = P(a, n)
                                        return {
                                            "& > *": {
                                                width: `calc(${`${(
                                                    100 /
                                                    ("object" == typeof s
                                                        ? s[e] || s[r]
                                                        : s)
                                                ).toFixed(2)}%`} - ${o})`
                                            }
                                        }
                                    }
                                    return null
                                })
                            )),
                        n
                    )
                }),
                N = k.forwardRef(function (t, e) {
                    const n = (0, s.Z)({ props: t, name: "MuiMasonry" }),
                        {
                            children: a,
                            className: u,
                            component: l = "div",
                            columns: c = 4,
                            spacing: d = 1,
                            defaultColumns: p,
                            defaultHeight: f,
                            defaultSpacing: v
                        } = n,
                        h = (0, r.Z)(n, D),
                        m = k.useRef(),
                        [g, y] = k.useState(),
                        x = !g && f && void 0 !== p && void 0 !== v,
                        [b, w] = k.useState(x ? p - 1 : 0),
                        S = (0, o.Z)({}, n, {
                            spacing: d,
                            columns: c,
                            maxColumnHeight: g,
                            defaultColumns: p,
                            defaultHeight: f,
                            defaultSpacing: v,
                            isSSR: x
                        }),
                        E = F(S),
                        C = k.useRef(
                            "undefined" == typeof ResizeObserver
                                ? void 0
                                : new ResizeObserver((t) => {
                                      if (!m.current || !t || 0 === t.length)
                                          return
                                      const e = m.current,
                                          n = m.current.firstChild,
                                          r = e.clientWidth,
                                          o = n.clientWidth
                                      if (0 === r || 0 === o) return
                                      const a = window.getComputedStyle(n),
                                          s = B(a.marginLeft),
                                          u = B(a.marginRight),
                                          l = Math.round(r / (o + s + u)),
                                          c = new Array(l).fill(0)
                                      let d = !1
                                      e.childNodes.forEach((t) => {
                                          if (
                                              t.nodeType !==
                                                  Node.ELEMENT_NODE ||
                                              "line-break" ===
                                                  t.dataset.class ||
                                              d
                                          )
                                              return
                                          const e = window.getComputedStyle(t),
                                              n = B(e.marginTop),
                                              r = B(e.marginBottom),
                                              o = B(e.height)
                                                  ? Math.ceil(B(e.height)) +
                                                    n +
                                                    r
                                                  : 0
                                          if (0 !== o) {
                                              for (
                                                  let e = 0;
                                                  e < t.childNodes.length;
                                                  e += 1
                                              ) {
                                                  const n = t.childNodes[e]
                                                  if (
                                                      "IMG" === n.tagName &&
                                                      0 === n.clientHeight
                                                  ) {
                                                      d = !0
                                                      break
                                                  }
                                              }
                                              if (!d) {
                                                  const e = c.indexOf(
                                                      Math.min(...c)
                                                  )
                                                  c[e] += o
                                                  const n = e + 1
                                                  t.style.order = n
                                              }
                                          } else d = !0
                                      }),
                                          d ||
                                              i.flushSync(() => {
                                                  y(Math.max(...c)),
                                                      w(l > 0 ? l - 1 : 0)
                                              })
                                  })
                        )
                    k.useEffect(() => {
                        const t = C.current
                        if (void 0 !== t)
                            return (
                                m.current &&
                                    m.current.childNodes.forEach((e) => {
                                        t.observe(e)
                                    }),
                                () => (t ? t.disconnect() : {})
                            )
                    }, [c, d, a])
                    const P = (function (...t) {
                            return k.useMemo(
                                () =>
                                    t.every((t) => null == t)
                                        ? null
                                        : (e) => {
                                              t.forEach((t) => {
                                                  !(function (t, e) {
                                                      "function" == typeof t
                                                          ? t(e)
                                                          : t && (t.current = e)
                                                  })(t, e)
                                              })
                                          },
                                t
                            )
                        })(e, m),
                        T = new Array(b)
                            .fill("")
                            .map((t, e) =>
                                (0, O.jsx)(
                                    "span",
                                    {
                                        "data-class": "line-break",
                                        style: (0, o.Z)({}, I, { order: e + 1 })
                                    },
                                    e
                                )
                            )
                    return (0,
                    O.jsxs)(z, (0, o.Z)({ as: l, className: (0, L.Z)(E.root, u), ref: P, ownerState: S }, h, { children: [a, T] }))
                }),
                $ = N
        },
        8176: (t, e, n) => {
            "use strict"
            n.d(e, { Z: () => et })
            var r = n(574),
                o = n(1163),
                i = n(9496),
                a = n(5924),
                s = n(5222),
                u = n(4454),
                l = n(446),
                c = n(8164),
                d = n(8658),
                p = n(4506),
                f = n(5734),
                v = n(7090)
            var h = n(6221)
            const m = i.createContext(null)
            function g(t, e) {
                var n = Object.create(null)
                return (
                    t &&
                        i.Children.map(t, function (t) {
                            return t
                        }).forEach(function (t) {
                            n[t.key] = (function (t) {
                                return e && (0, i.isValidElement)(t) ? e(t) : t
                            })(t)
                        }),
                    n
                )
            }
            function y(t, e, n) {
                return null != n[e] ? n[e] : t.props[e]
            }
            function x(t, e, n) {
                var r = g(t.children),
                    o = (function (t, e) {
                        function n(n) {
                            return n in e ? e[n] : t[n]
                        }
                        ;(t = t || {}), (e = e || {})
                        var r,
                            o = Object.create(null),
                            i = []
                        for (var a in t)
                            a in e
                                ? i.length && ((o[a] = i), (i = []))
                                : i.push(a)
                        var s = {}
                        for (var u in e) {
                            if (o[u])
                                for (r = 0; r < o[u].length; r++) {
                                    var l = o[u][r]
                                    s[o[u][r]] = n(l)
                                }
                            s[u] = n(u)
                        }
                        for (r = 0; r < i.length; r++) s[i[r]] = n(i[r])
                        return s
                    })(e, r)
                return (
                    Object.keys(o).forEach(function (a) {
                        var s = o[a]
                        if ((0, i.isValidElement)(s)) {
                            var u = a in e,
                                l = a in r,
                                c = e[a],
                                d = (0, i.isValidElement)(c) && !c.props.in
                            !l || (u && !d)
                                ? l || !u || d
                                    ? l &&
                                      u &&
                                      (0, i.isValidElement)(c) &&
                                      (o[a] = (0, i.cloneElement)(s, {
                                          onExited: n.bind(null, s),
                                          in: c.props.in,
                                          exit: y(s, "exit", t),
                                          enter: y(s, "enter", t)
                                      }))
                                    : (o[a] = (0, i.cloneElement)(s, {
                                          in: !1
                                      }))
                                : (o[a] = (0, i.cloneElement)(s, {
                                      onExited: n.bind(null, s),
                                      in: !0,
                                      exit: y(s, "exit", t),
                                      enter: y(s, "enter", t)
                                  }))
                        }
                    }),
                    o
                )
            }
            var b =
                    Object.values ||
                    function (t) {
                        return Object.keys(t).map(function (e) {
                            return t[e]
                        })
                    },
                w = (function (t) {
                    function e(e, n) {
                        var r,
                            o = (r =
                                t.call(this, e, n) || this).handleExited.bind(
                                (function (t) {
                                    if (void 0 === t)
                                        throw new ReferenceError(
                                            "this hasn't been initialised - super() hasn't been called"
                                        )
                                    return t
                                })(r)
                            )
                        return (
                            (r.state = {
                                contextValue: { isMounting: !0 },
                                handleExited: o,
                                firstRender: !0
                            }),
                            r
                        )
                    }
                    ;(0, h.Z)(e, t)
                    var n = e.prototype
                    return (
                        (n.componentDidMount = function () {
                            ;(this.mounted = !0),
                                this.setState({
                                    contextValue: { isMounting: !1 }
                                })
                        }),
                        (n.componentWillUnmount = function () {
                            this.mounted = !1
                        }),
                        (e.getDerivedStateFromProps = function (t, e) {
                            var n,
                                r,
                                o = e.children,
                                a = e.handleExited
                            return {
                                children: e.firstRender
                                    ? ((n = t),
                                      (r = a),
                                      g(n.children, function (t) {
                                          return (0,
                                          i.cloneElement)(t, { onExited: r.bind(null, t), in: !0, appear: y(t, "appear", n), enter: y(t, "enter", n), exit: y(t, "exit", n) })
                                      }))
                                    : x(t, o, a),
                                firstRender: !1
                            }
                        }),
                        (n.handleExited = function (t, e) {
                            var n = g(this.props.children)
                            t.key in n ||
                                (t.props.onExited && t.props.onExited(e),
                                this.mounted &&
                                    this.setState(function (e) {
                                        var n = (0, o.Z)({}, e.children)
                                        return delete n[t.key], { children: n }
                                    }))
                        }),
                        (n.render = function () {
                            var t = this.props,
                                e = t.component,
                                n = t.childFactory,
                                o = (0, r.Z)(t, ["component", "childFactory"]),
                                a = this.state.contextValue,
                                s = b(this.state.children).map(n)
                            return (
                                delete o.appear,
                                delete o.enter,
                                delete o.exit,
                                null === e
                                    ? i.createElement(
                                          m.Provider,
                                          { value: a },
                                          s
                                      )
                                    : i.createElement(
                                          m.Provider,
                                          { value: a },
                                          i.createElement(e, o, s)
                                      )
                            )
                        }),
                        e
                    )
                })(i.Component)
            ;(w.propTypes = {}),
                (w.defaultProps = {
                    component: "div",
                    childFactory: function (t) {
                        return t
                    }
                })
            const S = w
            var E = n(6994),
                C = n(4637)
            const P = function (t) {
                const {
                        className: e,
                        classes: n,
                        pulsate: r = !1,
                        rippleX: o,
                        rippleY: s,
                        rippleSize: u,
                        in: l,
                        onExited: c,
                        timeout: d
                    } = t,
                    [p, f] = i.useState(!1),
                    v = (0, a.Z)(
                        e,
                        n.ripple,
                        n.rippleVisible,
                        r && n.ripplePulsate
                    ),
                    h = {
                        width: u,
                        height: u,
                        top: -u / 2 + s,
                        left: -u / 2 + o
                    },
                    m = (0, a.Z)(
                        n.child,
                        p && n.childLeaving,
                        r && n.childPulsate
                    )
                return (
                    l || p || f(!0),
                    i.useEffect(() => {
                        if (!l && null != c) {
                            const t = setTimeout(c, d)
                            return () => {
                                clearTimeout(t)
                            }
                        }
                    }, [c, l, d]),
                    (0, C.jsx)("span", {
                        className: v,
                        style: h,
                        children: (0, C.jsx)("span", { className: m })
                    })
                )
            }
            var T = n(1481)
            const R = (0, T.Z)("MuiTouchRipple", [
                    "root",
                    "ripple",
                    "rippleVisible",
                    "ripplePulsate",
                    "child",
                    "childLeaving",
                    "childPulsate"
                ]),
                A = ["center", "classes", "className"]
            let M,
                V,
                k,
                L,
                Z = (t) => t
            const j = (0, E.F4)(
                    M ||
                        (M = Z`
  0% {
    transform: scale(0);
    opacity: 0.1;
  }

  100% {
    transform: scale(1);
    opacity: 0.3;
  }
`)
                ),
                O = (0, E.F4)(
                    V ||
                        (V = Z`
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
`)
                ),
                D = (0, E.F4)(
                    k ||
                        (k = Z`
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(0.92);
  }

  100% {
    transform: scale(1);
  }
`)
                ),
                B = (0, c.ZP)("span", { name: "MuiTouchRipple", slot: "Root" })(
                    {
                        overflow: "hidden",
                        pointerEvents: "none",
                        position: "absolute",
                        zIndex: 0,
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        borderRadius: "inherit"
                    }
                ),
                I = (0, c.ZP)(P, { name: "MuiTouchRipple", slot: "Ripple" })(
                    L ||
                        (L = Z`
  opacity: 0;
  position: absolute;

  &.${0} {
    opacity: 0.3;
    transform: scale(1);
    animation-name: ${0};
    animation-duration: ${0}ms;
    animation-timing-function: ${0};
  }

  &.${0} {
    animation-duration: ${0}ms;
  }

  & .${0} {
    opacity: 1;
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: currentColor;
  }

  & .${0} {
    opacity: 0;
    animation-name: ${0};
    animation-duration: ${0}ms;
    animation-timing-function: ${0};
  }

  & .${0} {
    position: absolute;
    /* @noflip */
    left: 0px;
    top: 0;
    animation-name: ${0};
    animation-duration: 2500ms;
    animation-timing-function: ${0};
    animation-iteration-count: infinite;
    animation-delay: 200ms;
  }
`),
                    R.rippleVisible,
                    j,
                    550,
                    ({ theme: t }) => t.transitions.easing.easeInOut,
                    R.ripplePulsate,
                    ({ theme: t }) => t.transitions.duration.shorter,
                    R.child,
                    R.childLeaving,
                    O,
                    550,
                    ({ theme: t }) => t.transitions.easing.easeInOut,
                    R.childPulsate,
                    D,
                    ({ theme: t }) => t.transitions.easing.easeInOut
                ),
                F = i.forwardRef(function (t, e) {
                    const n = (0, d.Z)({ props: t, name: "MuiTouchRipple" }),
                        { center: s = !1, classes: u = {}, className: l } = n,
                        c = (0, r.Z)(n, A),
                        [p, f] = i.useState([]),
                        v = i.useRef(0),
                        h = i.useRef(null)
                    i.useEffect(() => {
                        h.current && (h.current(), (h.current = null))
                    }, [p])
                    const m = i.useRef(!1),
                        g = i.useRef(null),
                        y = i.useRef(null),
                        x = i.useRef(null)
                    i.useEffect(
                        () => () => {
                            clearTimeout(g.current)
                        },
                        []
                    )
                    const b = i.useCallback(
                            (t) => {
                                const {
                                    pulsate: e,
                                    rippleX: n,
                                    rippleY: r,
                                    rippleSize: o,
                                    cb: i
                                } = t
                                f((t) => [
                                    ...t,
                                    (0, C.jsx)(
                                        I,
                                        {
                                            classes: {
                                                ripple: (0, a.Z)(
                                                    u.ripple,
                                                    R.ripple
                                                ),
                                                rippleVisible: (0, a.Z)(
                                                    u.rippleVisible,
                                                    R.rippleVisible
                                                ),
                                                ripplePulsate: (0, a.Z)(
                                                    u.ripplePulsate,
                                                    R.ripplePulsate
                                                ),
                                                child: (0, a.Z)(
                                                    u.child,
                                                    R.child
                                                ),
                                                childLeaving: (0, a.Z)(
                                                    u.childLeaving,
                                                    R.childLeaving
                                                ),
                                                childPulsate: (0, a.Z)(
                                                    u.childPulsate,
                                                    R.childPulsate
                                                )
                                            },
                                            timeout: 550,
                                            pulsate: e,
                                            rippleX: n,
                                            rippleY: r,
                                            rippleSize: o
                                        },
                                        v.current
                                    )
                                ]),
                                    (v.current += 1),
                                    (h.current = i)
                            },
                            [u]
                        ),
                        w = i.useCallback(
                            (t = {}, e = {}, n = () => {}) => {
                                const {
                                    pulsate: r = !1,
                                    center: o = s || e.pulsate,
                                    fakeElement: i = !1
                                } = e
                                if (
                                    "mousedown" ===
                                        (null == t ? void 0 : t.type) &&
                                    m.current
                                )
                                    return void (m.current = !1)
                                "touchstart" ===
                                    (null == t ? void 0 : t.type) &&
                                    (m.current = !0)
                                const a = i ? null : x.current,
                                    u = a
                                        ? a.getBoundingClientRect()
                                        : {
                                              width: 0,
                                              height: 0,
                                              left: 0,
                                              top: 0
                                          }
                                let l, c, d
                                if (
                                    o ||
                                    void 0 === t ||
                                    (0 === t.clientX && 0 === t.clientY) ||
                                    (!t.clientX && !t.touches)
                                )
                                    (l = Math.round(u.width / 2)),
                                        (c = Math.round(u.height / 2))
                                else {
                                    const { clientX: e, clientY: n } =
                                        t.touches && t.touches.length > 0
                                            ? t.touches[0]
                                            : t
                                    ;(l = Math.round(e - u.left)),
                                        (c = Math.round(n - u.top))
                                }
                                if (o)
                                    (d = Math.sqrt(
                                        (2 * u.width ** 2 + u.height ** 2) / 3
                                    )),
                                        d % 2 == 0 && (d += 1)
                                else {
                                    const t =
                                            2 *
                                                Math.max(
                                                    Math.abs(
                                                        (a
                                                            ? a.clientWidth
                                                            : 0) - l
                                                    ),
                                                    l
                                                ) +
                                            2,
                                        e =
                                            2 *
                                                Math.max(
                                                    Math.abs(
                                                        (a
                                                            ? a.clientHeight
                                                            : 0) - c
                                                    ),
                                                    c
                                                ) +
                                            2
                                    d = Math.sqrt(t ** 2 + e ** 2)
                                }
                                null != t && t.touches
                                    ? null === y.current &&
                                      ((y.current = () => {
                                          b({
                                              pulsate: r,
                                              rippleX: l,
                                              rippleY: c,
                                              rippleSize: d,
                                              cb: n
                                          })
                                      }),
                                      (g.current = setTimeout(() => {
                                          y.current &&
                                              (y.current(), (y.current = null))
                                      }, 80)))
                                    : b({
                                          pulsate: r,
                                          rippleX: l,
                                          rippleY: c,
                                          rippleSize: d,
                                          cb: n
                                      })
                            },
                            [s, b]
                        ),
                        E = i.useCallback(() => {
                            w({}, { pulsate: !0 })
                        }, [w]),
                        P = i.useCallback((t, e) => {
                            if (
                                (clearTimeout(g.current),
                                "touchend" === (null == t ? void 0 : t.type) &&
                                    y.current)
                            )
                                return (
                                    y.current(),
                                    (y.current = null),
                                    void (g.current = setTimeout(() => {
                                        P(t, e)
                                    }))
                                )
                            ;(y.current = null),
                                f((t) => (t.length > 0 ? t.slice(1) : t)),
                                (h.current = e)
                        }, [])
                    return (
                        i.useImperativeHandle(
                            e,
                            () => ({ pulsate: E, start: w, stop: P }),
                            [E, w, P]
                        ),
                        (0, C.jsx)(
                            B,
                            (0, o.Z)(
                                {
                                    className: (0, a.Z)(R.root, u.root, l),
                                    ref: x
                                },
                                c,
                                {
                                    children: (0, C.jsx)(S, {
                                        component: null,
                                        exit: !0,
                                        children: p
                                    })
                                }
                            )
                        )
                    )
                })
            var z = n(9989)
            function N(t) {
                return (0, z.Z)("MuiButtonBase", t)
            }
            const $ = (0, T.Z)("MuiButtonBase", [
                    "root",
                    "disabled",
                    "focusVisible"
                ]),
                U = [
                    "action",
                    "centerRipple",
                    "children",
                    "className",
                    "component",
                    "disabled",
                    "disableRipple",
                    "disableTouchRipple",
                    "focusRipple",
                    "focusVisibleClassName",
                    "LinkComponent",
                    "onBlur",
                    "onClick",
                    "onContextMenu",
                    "onDragLeave",
                    "onFocus",
                    "onFocusVisible",
                    "onKeyDown",
                    "onKeyUp",
                    "onMouseDown",
                    "onMouseLeave",
                    "onMouseUp",
                    "onTouchEnd",
                    "onTouchMove",
                    "onTouchStart",
                    "tabIndex",
                    "TouchRippleProps",
                    "touchRippleRef",
                    "type"
                ],
                W = (0, c.ZP)("button", {
                    name: "MuiButtonBase",
                    slot: "Root",
                    overridesResolver: (t, e) => e.root
                })({
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    boxSizing: "border-box",
                    WebkitTapHighlightColor: "transparent",
                    backgroundColor: "transparent",
                    outline: 0,
                    border: 0,
                    margin: 0,
                    borderRadius: 0,
                    padding: 0,
                    cursor: "pointer",
                    userSelect: "none",
                    verticalAlign: "middle",
                    MozAppearance: "none",
                    WebkitAppearance: "none",
                    textDecoration: "none",
                    color: "inherit",
                    "&::-moz-focus-inner": { borderStyle: "none" },
                    [`&.${$.disabled}`]: {
                        pointerEvents: "none",
                        cursor: "default"
                    },
                    "@media print": { colorAdjust: "exact" }
                }),
                H = i.forwardRef(function (t, e) {
                    const n = (0, d.Z)({ props: t, name: "MuiButtonBase" }),
                        {
                            action: s,
                            centerRipple: l = !1,
                            children: c,
                            className: h,
                            component: m = "button",
                            disabled: g = !1,
                            disableRipple: y = !1,
                            disableTouchRipple: x = !1,
                            focusRipple: b = !1,
                            LinkComponent: w = "a",
                            onBlur: S,
                            onClick: E,
                            onContextMenu: P,
                            onDragLeave: T,
                            onFocus: R,
                            onFocusVisible: A,
                            onKeyDown: M,
                            onKeyUp: V,
                            onMouseDown: k,
                            onMouseLeave: L,
                            onMouseUp: Z,
                            onTouchEnd: j,
                            onTouchMove: O,
                            onTouchStart: D,
                            tabIndex: B = 0,
                            TouchRippleProps: I,
                            touchRippleRef: z,
                            type: $
                        } = n,
                        H = (0, r.Z)(n, U),
                        _ = i.useRef(null),
                        Y = i.useRef(null),
                        q = (0, p.Z)(Y, z),
                        {
                            isFocusVisibleRef: X,
                            onFocus: G,
                            onBlur: K,
                            ref: J
                        } = (0, v.Z)(),
                        [Q, tt] = i.useState(!1)
                    g && Q && tt(!1),
                        i.useImperativeHandle(
                            s,
                            () => ({
                                focusVisible: () => {
                                    tt(!0), _.current.focus()
                                }
                            }),
                            []
                        )
                    const [et, nt] = i.useState(!1)
                    i.useEffect(() => {
                        nt(!0)
                    }, [])
                    const rt = et && !y && !g
                    function ot(t, e, n = x) {
                        return (0, f.Z)((r) => {
                            e && e(r)
                            return !n && Y.current && Y.current[t](r), !0
                        })
                    }
                    i.useEffect(() => {
                        Q && b && !y && et && Y.current.pulsate()
                    }, [y, b, Q, et])
                    const it = ot("start", k),
                        at = ot("stop", P),
                        st = ot("stop", T),
                        ut = ot("stop", Z),
                        lt = ot("stop", (t) => {
                            Q && t.preventDefault(), L && L(t)
                        }),
                        ct = ot("start", D),
                        dt = ot("stop", j),
                        pt = ot("stop", O),
                        ft = ot(
                            "stop",
                            (t) => {
                                K(t), !1 === X.current && tt(!1), S && S(t)
                            },
                            !1
                        ),
                        vt = (0, f.Z)((t) => {
                            _.current || (_.current = t.currentTarget),
                                G(t),
                                !0 === X.current && (tt(!0), A && A(t)),
                                R && R(t)
                        }),
                        ht = () => {
                            const t = _.current
                            return (
                                m &&
                                "button" !== m &&
                                !("A" === t.tagName && t.href)
                            )
                        },
                        mt = i.useRef(!1),
                        gt = (0, f.Z)((t) => {
                            b &&
                                !mt.current &&
                                Q &&
                                Y.current &&
                                " " === t.key &&
                                ((mt.current = !0),
                                Y.current.stop(t, () => {
                                    Y.current.start(t)
                                })),
                                t.target === t.currentTarget &&
                                    ht() &&
                                    " " === t.key &&
                                    t.preventDefault(),
                                M && M(t),
                                t.target === t.currentTarget &&
                                    ht() &&
                                    "Enter" === t.key &&
                                    !g &&
                                    (t.preventDefault(), E && E(t))
                        }),
                        yt = (0, f.Z)((t) => {
                            b &&
                                " " === t.key &&
                                Y.current &&
                                Q &&
                                !t.defaultPrevented &&
                                ((mt.current = !1),
                                Y.current.stop(t, () => {
                                    Y.current.pulsate(t)
                                })),
                                V && V(t),
                                E &&
                                    t.target === t.currentTarget &&
                                    ht() &&
                                    " " === t.key &&
                                    !t.defaultPrevented &&
                                    E(t)
                        })
                    let xt = m
                    "button" === xt && (H.href || H.to) && (xt = w)
                    const bt = {}
                    "button" === xt
                        ? ((bt.type = void 0 === $ ? "button" : $),
                          (bt.disabled = g))
                        : (H.href || H.to || (bt.role = "button"),
                          g && (bt["aria-disabled"] = g))
                    const wt = (0, p.Z)(e, J, _)
                    const St = (0, o.Z)({}, n, {
                            centerRipple: l,
                            component: m,
                            disabled: g,
                            disableRipple: y,
                            disableTouchRipple: x,
                            focusRipple: b,
                            tabIndex: B,
                            focusVisible: Q
                        }),
                        Et = ((t) => {
                            const {
                                    disabled: e,
                                    focusVisible: n,
                                    focusVisibleClassName: r,
                                    classes: o
                                } = t,
                                i = {
                                    root: [
                                        "root",
                                        e && "disabled",
                                        n && "focusVisible"
                                    ]
                                },
                                a = (0, u.Z)(i, N, o)
                            return n && r && (a.root += ` ${r}`), a
                        })(St)
                    return (0,
                    C.jsxs)(W, (0, o.Z)({ as: xt, className: (0, a.Z)(Et.root, h), ownerState: St, onBlur: ft, onClick: E, onContextMenu: at, onFocus: vt, onKeyDown: gt, onKeyUp: yt, onMouseDown: it, onMouseLeave: lt, onMouseUp: ut, onDragLeave: st, onTouchEnd: dt, onTouchMove: pt, onTouchStart: ct, ref: wt, tabIndex: g ? -1 : B, type: $ }, bt, H, { children: [c, rt ? (0, C.jsx)(F, (0, o.Z)({ ref: q, center: l }, I)) : null] }))
                })
            var _ = n(4660)
            function Y(t) {
                return (0, z.Z)("MuiButton", t)
            }
            const q = (0, T.Z)("MuiButton", [
                "root",
                "text",
                "textInherit",
                "textPrimary",
                "textSecondary",
                "textSuccess",
                "textError",
                "textInfo",
                "textWarning",
                "outlined",
                "outlinedInherit",
                "outlinedPrimary",
                "outlinedSecondary",
                "outlinedSuccess",
                "outlinedError",
                "outlinedInfo",
                "outlinedWarning",
                "contained",
                "containedInherit",
                "containedPrimary",
                "containedSecondary",
                "containedSuccess",
                "containedError",
                "containedInfo",
                "containedWarning",
                "disableElevation",
                "focusVisible",
                "disabled",
                "colorInherit",
                "textSizeSmall",
                "textSizeMedium",
                "textSizeLarge",
                "outlinedSizeSmall",
                "outlinedSizeMedium",
                "outlinedSizeLarge",
                "containedSizeSmall",
                "containedSizeMedium",
                "containedSizeLarge",
                "sizeMedium",
                "sizeSmall",
                "sizeLarge",
                "fullWidth",
                "startIcon",
                "endIcon",
                "iconSizeSmall",
                "iconSizeMedium",
                "iconSizeLarge"
            ])
            const X = i.createContext({}),
                G = [
                    "children",
                    "color",
                    "component",
                    "className",
                    "disabled",
                    "disableElevation",
                    "disableFocusRipple",
                    "endIcon",
                    "focusVisibleClassName",
                    "fullWidth",
                    "size",
                    "startIcon",
                    "type",
                    "variant"
                ],
                K = (t) =>
                    (0, o.Z)(
                        {},
                        "small" === t.size && {
                            "& > *:nth-of-type(1)": { fontSize: 18 }
                        },
                        "medium" === t.size && {
                            "& > *:nth-of-type(1)": { fontSize: 20 }
                        },
                        "large" === t.size && {
                            "& > *:nth-of-type(1)": { fontSize: 22 }
                        }
                    ),
                J = (0, c.ZP)(H, {
                    shouldForwardProp: (t) => (0, c.FO)(t) || "classes" === t,
                    name: "MuiButton",
                    slot: "Root",
                    overridesResolver: (t, e) => {
                        const { ownerState: n } = t
                        return [
                            e.root,
                            e[n.variant],
                            e[`${n.variant}${(0, _.Z)(n.color)}`],
                            e[`size${(0, _.Z)(n.size)}`],
                            e[`${n.variant}Size${(0, _.Z)(n.size)}`],
                            "inherit" === n.color && e.colorInherit,
                            n.disableElevation && e.disableElevation,
                            n.fullWidth && e.fullWidth
                        ]
                    }
                })(
                    ({ theme: t, ownerState: e }) => {
                        var n, r
                        return (0, o.Z)(
                            {},
                            t.typography.button,
                            {
                                minWidth: 64,
                                padding: "6px 16px",
                                borderRadius: (t.vars || t).shape.borderRadius,
                                transition: t.transitions.create(
                                    [
                                        "background-color",
                                        "box-shadow",
                                        "border-color",
                                        "color"
                                    ],
                                    { duration: t.transitions.duration.short }
                                ),
                                "&:hover": (0, o.Z)(
                                    {
                                        textDecoration: "none",
                                        backgroundColor: t.vars
                                            ? `rgba(${t.vars.palette.text.primaryChannel} / ${t.vars.palette.action.hoverOpacity})`
                                            : (0, l.Fq)(
                                                  t.palette.text.primary,
                                                  t.palette.action.hoverOpacity
                                              ),
                                        "@media (hover: none)": {
                                            backgroundColor: "transparent"
                                        }
                                    },
                                    "text" === e.variant &&
                                        "inherit" !== e.color && {
                                            backgroundColor: t.vars
                                                ? `rgba(${
                                                      t.vars.palette[e.color]
                                                          .mainChannel
                                                  } / ${
                                                      t.vars.palette.action
                                                          .hoverOpacity
                                                  })`
                                                : (0, l.Fq)(
                                                      t.palette[e.color].main,
                                                      t.palette.action
                                                          .hoverOpacity
                                                  ),
                                            "@media (hover: none)": {
                                                backgroundColor: "transparent"
                                            }
                                        },
                                    "outlined" === e.variant &&
                                        "inherit" !== e.color && {
                                            border: `1px solid ${
                                                (t.vars || t).palette[e.color]
                                                    .main
                                            }`,
                                            backgroundColor: t.vars
                                                ? `rgba(${
                                                      t.vars.palette[e.color]
                                                          .mainChannel
                                                  } / ${
                                                      t.vars.palette.action
                                                          .hoverOpacity
                                                  })`
                                                : (0, l.Fq)(
                                                      t.palette[e.color].main,
                                                      t.palette.action
                                                          .hoverOpacity
                                                  ),
                                            "@media (hover: none)": {
                                                backgroundColor: "transparent"
                                            }
                                        },
                                    "contained" === e.variant && {
                                        backgroundColor: (t.vars || t).palette
                                            .grey.A100,
                                        boxShadow: (t.vars || t).shadows[4],
                                        "@media (hover: none)": {
                                            boxShadow: (t.vars || t).shadows[2],
                                            backgroundColor: (t.vars || t)
                                                .palette.grey[300]
                                        }
                                    },
                                    "contained" === e.variant &&
                                        "inherit" !== e.color && {
                                            backgroundColor: (t.vars || t)
                                                .palette[e.color].dark,
                                            "@media (hover: none)": {
                                                backgroundColor: (t.vars || t)
                                                    .palette[e.color].main
                                            }
                                        }
                                ),
                                "&:active": (0, o.Z)(
                                    {},
                                    "contained" === e.variant && {
                                        boxShadow: (t.vars || t).shadows[8]
                                    }
                                ),
                                [`&.${q.focusVisible}`]: (0, o.Z)(
                                    {},
                                    "contained" === e.variant && {
                                        boxShadow: (t.vars || t).shadows[6]
                                    }
                                ),
                                [`&.${q.disabled}`]: (0, o.Z)(
                                    {
                                        color: (t.vars || t).palette.action
                                            .disabled
                                    },
                                    "outlined" === e.variant && {
                                        border: `1px solid ${
                                            (t.vars || t).palette.action
                                                .disabledBackground
                                        }`
                                    },
                                    "contained" === e.variant && {
                                        color: (t.vars || t).palette.action
                                            .disabled,
                                        boxShadow: (t.vars || t).shadows[0],
                                        backgroundColor: (t.vars || t).palette
                                            .action.disabledBackground
                                    }
                                )
                            },
                            "text" === e.variant && { padding: "6px 8px" },
                            "text" === e.variant &&
                                "inherit" !== e.color && {
                                    color: (t.vars || t).palette[e.color].main
                                },
                            "outlined" === e.variant && {
                                padding: "5px 15px",
                                border: "1px solid currentColor"
                            },
                            "outlined" === e.variant &&
                                "inherit" !== e.color && {
                                    color: (t.vars || t).palette[e.color].main,
                                    border: t.vars
                                        ? `1px solid rgba(${
                                              t.vars.palette[e.color]
                                                  .mainChannel
                                          } / 0.5)`
                                        : `1px solid ${(0, l.Fq)(
                                              t.palette[e.color].main,
                                              0.5
                                          )}`
                                },
                            "contained" === e.variant && {
                                color: t.vars
                                    ? t.vars.palette.text.primary
                                    : null ==
                                      (n = (r = t.palette).getContrastText)
                                    ? void 0
                                    : n.call(r, t.palette.grey[300]),
                                backgroundColor: (t.vars || t).palette
                                    .grey[300],
                                boxShadow: (t.vars || t).shadows[2]
                            },
                            "contained" === e.variant &&
                                "inherit" !== e.color && {
                                    color: (t.vars || t).palette[e.color]
                                        .contrastText,
                                    backgroundColor: (t.vars || t).palette[
                                        e.color
                                    ].main
                                },
                            "inherit" === e.color && {
                                color: "inherit",
                                borderColor: "currentColor"
                            },
                            "small" === e.size &&
                                "text" === e.variant && {
                                    padding: "4px 5px",
                                    fontSize: t.typography.pxToRem(13)
                                },
                            "large" === e.size &&
                                "text" === e.variant && {
                                    padding: "8px 11px",
                                    fontSize: t.typography.pxToRem(15)
                                },
                            "small" === e.size &&
                                "outlined" === e.variant && {
                                    padding: "3px 9px",
                                    fontSize: t.typography.pxToRem(13)
                                },
                            "large" === e.size &&
                                "outlined" === e.variant && {
                                    padding: "7px 21px",
                                    fontSize: t.typography.pxToRem(15)
                                },
                            "small" === e.size &&
                                "contained" === e.variant && {
                                    padding: "4px 10px",
                                    fontSize: t.typography.pxToRem(13)
                                },
                            "large" === e.size &&
                                "contained" === e.variant && {
                                    padding: "8px 22px",
                                    fontSize: t.typography.pxToRem(15)
                                },
                            e.fullWidth && { width: "100%" }
                        )
                    },
                    ({ ownerState: t }) =>
                        t.disableElevation && {
                            boxShadow: "none",
                            "&:hover": { boxShadow: "none" },
                            [`&.${q.focusVisible}`]: { boxShadow: "none" },
                            "&:active": { boxShadow: "none" },
                            [`&.${q.disabled}`]: { boxShadow: "none" }
                        }
                ),
                Q = (0, c.ZP)("span", {
                    name: "MuiButton",
                    slot: "StartIcon",
                    overridesResolver: (t, e) => {
                        const { ownerState: n } = t
                        return [e.startIcon, e[`iconSize${(0, _.Z)(n.size)}`]]
                    }
                })(({ ownerState: t }) =>
                    (0, o.Z)(
                        { display: "inherit", marginRight: 8, marginLeft: -4 },
                        "small" === t.size && { marginLeft: -2 },
                        K(t)
                    )
                ),
                tt = (0, c.ZP)("span", {
                    name: "MuiButton",
                    slot: "EndIcon",
                    overridesResolver: (t, e) => {
                        const { ownerState: n } = t
                        return [e.endIcon, e[`iconSize${(0, _.Z)(n.size)}`]]
                    }
                })(({ ownerState: t }) =>
                    (0, o.Z)(
                        { display: "inherit", marginRight: -4, marginLeft: 8 },
                        "small" === t.size && { marginRight: -2 },
                        K(t)
                    )
                ),
                et = i.forwardRef(function (t, e) {
                    const n = i.useContext(X),
                        l = (0, s.Z)(n, t),
                        c = (0, d.Z)({ props: l, name: "MuiButton" }),
                        {
                            children: p,
                            color: f = "primary",
                            component: v = "button",
                            className: h,
                            disabled: m = !1,
                            disableElevation: g = !1,
                            disableFocusRipple: y = !1,
                            endIcon: x,
                            focusVisibleClassName: b,
                            fullWidth: w = !1,
                            size: S = "medium",
                            startIcon: E,
                            type: P,
                            variant: T = "text"
                        } = c,
                        R = (0, r.Z)(c, G),
                        A = (0, o.Z)({}, c, {
                            color: f,
                            component: v,
                            disabled: m,
                            disableElevation: g,
                            disableFocusRipple: y,
                            fullWidth: w,
                            size: S,
                            type: P,
                            variant: T
                        }),
                        M = ((t) => {
                            const {
                                    color: e,
                                    disableElevation: n,
                                    fullWidth: r,
                                    size: i,
                                    variant: a,
                                    classes: s
                                } = t,
                                l = {
                                    root: [
                                        "root",
                                        a,
                                        `${a}${(0, _.Z)(e)}`,
                                        `size${(0, _.Z)(i)}`,
                                        `${a}Size${(0, _.Z)(i)}`,
                                        "inherit" === e && "colorInherit",
                                        n && "disableElevation",
                                        r && "fullWidth"
                                    ],
                                    label: ["label"],
                                    startIcon: [
                                        "startIcon",
                                        `iconSize${(0, _.Z)(i)}`
                                    ],
                                    endIcon: [
                                        "endIcon",
                                        `iconSize${(0, _.Z)(i)}`
                                    ]
                                },
                                c = (0, u.Z)(l, Y, s)
                            return (0, o.Z)({}, s, c)
                        })(A),
                        V =
                            E &&
                            (0, C.jsx)(Q, {
                                className: M.startIcon,
                                ownerState: A,
                                children: E
                            }),
                        k =
                            x &&
                            (0, C.jsx)(tt, {
                                className: M.endIcon,
                                ownerState: A,
                                children: x
                            })
                    return (0,
                    C.jsxs)(J, (0, o.Z)({ ownerState: A, className: (0, a.Z)(n.className, M.root, h), component: v, disabled: m, focusRipple: !y, focusVisibleClassName: (0, a.Z)(M.focusVisible, b), ref: e, type: P }, R, { classes: M, children: [V, p, k] }))
                })
        },
        1430: (t, e, n) => {
            "use strict"
            n.d(e, { Z: () => S })
            var r = n(1163),
                o = n(574),
                i = n(9496),
                a = n(5924),
                s = n(4454),
                u = n(8164),
                l = n(8658),
                c = n(446)
            const d = (t) => {
                let e
                return (
                    (e = t < 1 ? 5.11916 * t ** 2 : 4.5 * Math.log(t + 1) + 2),
                    (e / 100).toFixed(2)
                )
            }
            var p = n(1481),
                f = n(9989)
            function v(t) {
                return (0, f.Z)("MuiPaper", t)
            }
            ;(0, p.Z)("MuiPaper", [
                "root",
                "rounded",
                "outlined",
                "elevation",
                "elevation0",
                "elevation1",
                "elevation2",
                "elevation3",
                "elevation4",
                "elevation5",
                "elevation6",
                "elevation7",
                "elevation8",
                "elevation9",
                "elevation10",
                "elevation11",
                "elevation12",
                "elevation13",
                "elevation14",
                "elevation15",
                "elevation16",
                "elevation17",
                "elevation18",
                "elevation19",
                "elevation20",
                "elevation21",
                "elevation22",
                "elevation23",
                "elevation24"
            ])
            var h = n(4637)
            const m = [
                    "className",
                    "component",
                    "elevation",
                    "square",
                    "variant"
                ],
                g = (0, u.ZP)("div", {
                    name: "MuiPaper",
                    slot: "Root",
                    overridesResolver: (t, e) => {
                        const { ownerState: n } = t
                        return [
                            e.root,
                            e[n.variant],
                            !n.square && e.rounded,
                            "elevation" === n.variant &&
                                e[`elevation${n.elevation}`]
                        ]
                    }
                })(({ theme: t, ownerState: e }) => {
                    var n
                    return (0, r.Z)(
                        {
                            backgroundColor: (t.vars || t).palette.background
                                .paper,
                            color: (t.vars || t).palette.text.primary,
                            transition: t.transitions.create("box-shadow")
                        },
                        !e.square && { borderRadius: t.shape.borderRadius },
                        "outlined" === e.variant && {
                            border: `1px solid ${(t.vars || t).palette.divider}`
                        },
                        "elevation" === e.variant &&
                            (0, r.Z)(
                                {
                                    boxShadow: (t.vars || t).shadows[
                                        e.elevation
                                    ]
                                },
                                !t.vars &&
                                    "dark" === t.palette.mode && {
                                        backgroundImage: `linear-gradient(${(0,
                                        c.Fq)("#fff", d(e.elevation))}, ${(0,
                                        c.Fq)("#fff", d(e.elevation))})`
                                    },
                                t.vars && {
                                    backgroundImage:
                                        null == (n = t.vars.overlays)
                                            ? void 0
                                            : n[e.elevation]
                                }
                            )
                    )
                }),
                y = i.forwardRef(function (t, e) {
                    const n = (0, l.Z)({ props: t, name: "MuiPaper" }),
                        {
                            className: i,
                            component: u = "div",
                            elevation: c = 1,
                            square: d = !1,
                            variant: p = "elevation"
                        } = n,
                        f = (0, o.Z)(n, m),
                        y = (0, r.Z)({}, n, {
                            component: u,
                            elevation: c,
                            square: d,
                            variant: p
                        }),
                        x = ((t) => {
                            const {
                                    square: e,
                                    elevation: n,
                                    variant: r,
                                    classes: o
                                } = t,
                                i = {
                                    root: [
                                        "root",
                                        r,
                                        !e && "rounded",
                                        "elevation" === r && `elevation${n}`
                                    ]
                                }
                            return (0, s.Z)(i, v, o)
                        })(y)
                    return (0,
                    h.jsx)(g, (0, r.Z)({ as: u, ownerState: y, className: (0, a.Z)(x.root, i), ref: e }, f))
                })
            function x(t) {
                return (0, f.Z)("MuiCard", t)
            }
            ;(0, p.Z)("MuiCard", ["root"])
            const b = ["className", "raised"],
                w = (0, u.ZP)(y, {
                    name: "MuiCard",
                    slot: "Root",
                    overridesResolver: (t, e) => e.root
                })(() => ({ overflow: "hidden" })),
                S = i.forwardRef(function (t, e) {
                    const n = (0, l.Z)({ props: t, name: "MuiCard" }),
                        { className: i, raised: u = !1 } = n,
                        c = (0, o.Z)(n, b),
                        d = (0, r.Z)({}, n, { raised: u }),
                        p = ((t) => {
                            const { classes: e } = t
                            return (0, s.Z)({ root: ["root"] }, x, e)
                        })(d)
                    return (0,
                    h.jsx)(w, (0, r.Z)({ className: (0, a.Z)(p.root, i), elevation: u ? 8 : void 0, ref: e, ownerState: d }, c))
                })
        },
        1916: (t, e, n) => {
            "use strict"
            n.d(e, { Z: () => b })
            var r = n(574),
                o = n(1163),
                i = n(9496),
                a = n(5924),
                s = n(5809),
                u = n(4454),
                l = n(8164),
                c = n(8658),
                d = n(4660),
                p = n(1481),
                f = n(9989)
            function v(t) {
                return (0, f.Z)("MuiTypography", t)
            }
            ;(0, p.Z)("MuiTypography", [
                "root",
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
                "subtitle1",
                "subtitle2",
                "body1",
                "body2",
                "inherit",
                "button",
                "caption",
                "overline",
                "alignLeft",
                "alignRight",
                "alignCenter",
                "alignJustify",
                "noWrap",
                "gutterBottom",
                "paragraph"
            ])
            var h = n(4637)
            const m = [
                    "align",
                    "className",
                    "component",
                    "gutterBottom",
                    "noWrap",
                    "paragraph",
                    "variant",
                    "variantMapping"
                ],
                g = (0, l.ZP)("span", {
                    name: "MuiTypography",
                    slot: "Root",
                    overridesResolver: (t, e) => {
                        const { ownerState: n } = t
                        return [
                            e.root,
                            n.variant && e[n.variant],
                            "inherit" !== n.align &&
                                e[`align${(0, d.Z)(n.align)}`],
                            n.noWrap && e.noWrap,
                            n.gutterBottom && e.gutterBottom,
                            n.paragraph && e.paragraph
                        ]
                    }
                })(({ theme: t, ownerState: e }) =>
                    (0, o.Z)(
                        { margin: 0 },
                        e.variant && t.typography[e.variant],
                        "inherit" !== e.align && { textAlign: e.align },
                        e.noWrap && {
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                        },
                        e.gutterBottom && { marginBottom: "0.35em" },
                        e.paragraph && { marginBottom: 16 }
                    )
                ),
                y = {
                    h1: "h1",
                    h2: "h2",
                    h3: "h3",
                    h4: "h4",
                    h5: "h5",
                    h6: "h6",
                    subtitle1: "h6",
                    subtitle2: "h6",
                    body1: "p",
                    body2: "p",
                    inherit: "p"
                },
                x = {
                    primary: "primary.main",
                    textPrimary: "text.primary",
                    secondary: "secondary.main",
                    textSecondary: "text.secondary",
                    error: "error.main"
                },
                b = i.forwardRef(function (t, e) {
                    const n = (0, c.Z)({ props: t, name: "MuiTypography" }),
                        i = ((t) => x[t] || t)(n.color),
                        l = (0, s.Z)((0, o.Z)({}, n, { color: i })),
                        {
                            align: p = "inherit",
                            className: f,
                            component: b,
                            gutterBottom: w = !1,
                            noWrap: S = !1,
                            paragraph: E = !1,
                            variant: C = "body1",
                            variantMapping: P = y
                        } = l,
                        T = (0, r.Z)(l, m),
                        R = (0, o.Z)({}, l, {
                            align: p,
                            color: i,
                            className: f,
                            component: b,
                            gutterBottom: w,
                            noWrap: S,
                            paragraph: E,
                            variant: C,
                            variantMapping: P
                        }),
                        A = b || (E ? "p" : P[C] || y[C]) || "span",
                        M = ((t) => {
                            const {
                                    align: e,
                                    gutterBottom: n,
                                    noWrap: r,
                                    paragraph: o,
                                    variant: i,
                                    classes: a
                                } = t,
                                s = {
                                    root: [
                                        "root",
                                        i,
                                        "inherit" !== t.align &&
                                            `align${(0, d.Z)(e)}`,
                                        n && "gutterBottom",
                                        r && "noWrap",
                                        o && "paragraph"
                                    ]
                                }
                            return (0, u.Z)(s, v, a)
                        })(R)
                    return (0,
                    h.jsx)(g, (0, o.Z)({ as: A, ref: e, ownerState: R, className: (0, a.Z)(M.root, f) }, T))
                })
        },
        7192: (t, e, n) => {
            "use strict"
            n.d(e, { Z: () => l })
            var r = n(1163),
                o = n(552)
            function i(t) {
                return String(parseFloat(t)).length === String(t).length
            }
            function a(t) {
                return parseFloat(t)
            }
            function s(t) {
                return (e, n) => {
                    const r = String(e).match(/[\d.\-+]*\s*(.*)/)[1] || ""
                    if (r === n) return e
                    let o = a(e)
                    "px" !== r &&
                        ("em" === r || "rem" === r) &&
                        (o = a(e) * a(t))
                    let i = o
                    if ("px" !== n)
                        if ("em" === n) i = o / a(t)
                        else {
                            if ("rem" !== n) return e
                            i = o / a(t)
                        }
                    return parseFloat(i.toFixed(5)) + n
                }
            }
            function u({ lineHeight: t, pixels: e, htmlFontSize: n }) {
                return e / (t * n)
            }
            function l(t, e = {}) {
                const {
                        breakpoints: n = ["sm", "md", "lg"],
                        disableAlign: a = !1,
                        factor: l = 2,
                        variants: c = [
                            "h1",
                            "h2",
                            "h3",
                            "h4",
                            "h5",
                            "h6",
                            "subtitle1",
                            "subtitle2",
                            "body1",
                            "body2",
                            "caption",
                            "button",
                            "overline"
                        ]
                    } = e,
                    d = (0, r.Z)({}, t)
                d.typography = (0, r.Z)({}, d.typography)
                const p = d.typography,
                    f = s(p.htmlFontSize),
                    v = n.map((t) => d.breakpoints.values[t])
                return (
                    c.forEach((t) => {
                        const e = p[t],
                            n = parseFloat(f(e.fontSize, "rem"))
                        if (n <= 1) return
                        const s = n,
                            c = 1 + (s - 1) / l
                        let { lineHeight: d } = e
                        if (!i(d) && !a) throw new Error((0, o.Z)(6))
                        i(d) || (d = parseFloat(f(d, "rem")) / parseFloat(n))
                        let h = null
                        a ||
                            (h = (t) =>
                                (function ({ size: t, grid: e }) {
                                    const n = t - (t % e),
                                        r = n + e
                                    return t - n < r - t ? n : r
                                })({
                                    size: t,
                                    grid: u({
                                        pixels: 4,
                                        lineHeight: d,
                                        htmlFontSize: p.htmlFontSize
                                    })
                                })),
                            (p[t] = (0, r.Z)(
                                {},
                                e,
                                (function ({
                                    cssProperty: t,
                                    min: e,
                                    max: n,
                                    unit: r = "rem",
                                    breakpoints: o = [600, 900, 1200],
                                    transform: i = null
                                }) {
                                    const a = { [t]: `${e}${r}` },
                                        s = (n - e) / o[o.length - 1]
                                    return (
                                        o.forEach((n) => {
                                            let o = e + s * n
                                            null !== i && (o = i(o)),
                                                (a[
                                                    `@media (min-width:${n}px)`
                                                ] = {
                                                    [t]: `${
                                                        Math.round(1e4 * o) /
                                                        1e4
                                                    }${r}`
                                                })
                                        }),
                                        a
                                    )
                                })({
                                    cssProperty: "fontSize",
                                    min: c,
                                    max: s,
                                    unit: "rem",
                                    breakpoints: v,
                                    transform: h
                                })
                            ))
                    }),
                    d
                )
            }
        },
        4452: (t, e, n) => {
            "use strict"
            var r
            n.d(e, { Z: () => d })
            var o = n(9496),
                i = n(6208),
                a = n(5180),
                s = n(8439)
            function u(t, e, n, r, i) {
                const [a, u] = o.useState(() =>
                    i && n ? n(t).matches : r ? r(t).matches : e
                )
                return (
                    (0, s.Z)(() => {
                        let e = !0
                        if (!n) return
                        const r = n(t),
                            o = () => {
                                e && u(r.matches)
                            }
                        return (
                            o(),
                            r.addListener(o),
                            () => {
                                ;(e = !1), r.removeListener(o)
                            }
                        )
                    }, [t, n]),
                    a
                )
            }
            const l = (r || (r = n.t(o, 2))).useSyncExternalStore
            function c(t, e, n, r, i) {
                const a = o.useCallback(() => e, [e]),
                    s = o.useMemo(() => {
                        if (i && n) return () => n(t).matches
                        if (null !== r) {
                            const { matches: e } = r(t)
                            return () => e
                        }
                        return a
                    }, [a, t, r, i, n]),
                    [u, c] = o.useMemo(() => {
                        if (null === n) return [a, () => () => {}]
                        const e = n(t)
                        return [
                            () => e.matches,
                            (t) => (
                                e.addListener(t),
                                () => {
                                    e.removeListener(t)
                                }
                            )
                        ]
                    }, [a, n, t])
                return l(c, u, s)
            }
            function d(t, e = {}) {
                const n = (0, i.Z)(),
                    r =
                        "undefined" != typeof window &&
                        void 0 !== window.matchMedia,
                    {
                        defaultMatches: o = !1,
                        matchMedia: s = r ? window.matchMedia : null,
                        ssrMatchMedia: d = null,
                        noSsr: p = !1
                    } = (0, a.Z)({
                        name: "MuiUseMediaQuery",
                        props: e,
                        theme: n
                    })
                let f = "function" == typeof t ? t(n) : t
                f = f.replace(/^@media( ?)/m, "")
                return (void 0 !== l ? c : u)(f, o, s, d, p)
            }
        },
        1623: (t, e, n) => {
            "use strict"
            n.r(e),
                n.d(e, {
                    capitalize: () => o.Z,
                    createChainedFunction: () => i,
                    createSvgIcon: () => S,
                    debounce: () => E,
                    deprecatedPropType: () => C,
                    isMuiElement: () => P,
                    ownerDocument: () => R,
                    ownerWindow: () => A,
                    requirePropFactory: () => M,
                    setRef: () => V,
                    unstable_ClassNameGenerator: () => z,
                    unstable_useEnhancedEffect: () => k.Z,
                    unstable_useId: () => j,
                    unsupportedProp: () => O,
                    useControlled: () => D,
                    useEventCallback: () => B.Z,
                    useForkRef: () => I.Z,
                    useIsFocusVisible: () => F.Z
                })
            var r = n(9292),
                o = n(4660)
            const i = function (...t) {
                return t.reduce(
                    (t, e) =>
                        null == e
                            ? t
                            : function (...n) {
                                  t.apply(this, n), e.apply(this, n)
                              },
                    () => {}
                )
            }
            var a = n(1163),
                s = n(9496),
                u = n.t(s, 2),
                l = n(574),
                c = n(5924),
                d = n(4454),
                p = n(8658),
                f = n(8164),
                v = n(1481),
                h = n(9989)
            function m(t) {
                return (0, h.Z)("MuiSvgIcon", t)
            }
            ;(0, v.Z)("MuiSvgIcon", [
                "root",
                "colorPrimary",
                "colorSecondary",
                "colorAction",
                "colorError",
                "colorDisabled",
                "fontSizeInherit",
                "fontSizeSmall",
                "fontSizeMedium",
                "fontSizeLarge"
            ])
            var g = n(4637)
            const y = [
                    "children",
                    "className",
                    "color",
                    "component",
                    "fontSize",
                    "htmlColor",
                    "inheritViewBox",
                    "titleAccess",
                    "viewBox"
                ],
                x = (0, f.ZP)("svg", {
                    name: "MuiSvgIcon",
                    slot: "Root",
                    overridesResolver: (t, e) => {
                        const { ownerState: n } = t
                        return [
                            e.root,
                            "inherit" !== n.color &&
                                e[`color${(0, o.Z)(n.color)}`],
                            e[`fontSize${(0, o.Z)(n.fontSize)}`]
                        ]
                    }
                })(({ theme: t, ownerState: e }) => {
                    var n, r, o, i, a, s, u, l, c, d, p, f, v, h, m, g, y
                    return {
                        userSelect: "none",
                        width: "1em",
                        height: "1em",
                        display: "inline-block",
                        fill: "currentColor",
                        flexShrink: 0,
                        transition:
                            null == (n = t.transitions) ||
                            null == (r = n.create)
                                ? void 0
                                : r.call(n, "fill", {
                                      duration:
                                          null == (o = t.transitions) ||
                                          null == (i = o.duration)
                                              ? void 0
                                              : i.shorter
                                  }),
                        fontSize: {
                            inherit: "inherit",
                            small:
                                (null == (a = t.typography) ||
                                null == (s = a.pxToRem)
                                    ? void 0
                                    : s.call(a, 20)) || "1.25rem",
                            medium:
                                (null == (u = t.typography) ||
                                null == (l = u.pxToRem)
                                    ? void 0
                                    : l.call(u, 24)) || "1.5rem",
                            large:
                                (null == (c = t.typography) ||
                                null == (d = c.pxToRem)
                                    ? void 0
                                    : d.call(c, 35)) || "2.1875rem"
                        }[e.fontSize],
                        color:
                            null !=
                            (p =
                                null == (f = (t.vars || t).palette) ||
                                null == (v = f[e.color])
                                    ? void 0
                                    : v.main)
                                ? p
                                : {
                                      action:
                                          null == (h = (t.vars || t).palette) ||
                                          null == (m = h.action)
                                              ? void 0
                                              : m.active,
                                      disabled:
                                          null == (g = (t.vars || t).palette) ||
                                          null == (y = g.action)
                                              ? void 0
                                              : y.disabled,
                                      inherit: void 0
                                  }[e.color]
                    }
                }),
                b = s.forwardRef(function (t, e) {
                    const n = (0, p.Z)({ props: t, name: "MuiSvgIcon" }),
                        {
                            children: r,
                            className: i,
                            color: s = "inherit",
                            component: u = "svg",
                            fontSize: f = "medium",
                            htmlColor: v,
                            inheritViewBox: h = !1,
                            titleAccess: b,
                            viewBox: w = "0 0 24 24"
                        } = n,
                        S = (0, l.Z)(n, y),
                        E = (0, a.Z)({}, n, {
                            color: s,
                            component: u,
                            fontSize: f,
                            instanceFontSize: t.fontSize,
                            inheritViewBox: h,
                            viewBox: w
                        }),
                        C = {}
                    h || (C.viewBox = w)
                    const P = ((t) => {
                        const { color: e, fontSize: n, classes: r } = t,
                            i = {
                                root: [
                                    "root",
                                    "inherit" !== e && `color${(0, o.Z)(e)}`,
                                    `fontSize${(0, o.Z)(n)}`
                                ]
                            }
                        return (0, d.Z)(i, m, r)
                    })(E)
                    return (0,
                    g.jsxs)(x, (0, a.Z)({ as: u, className: (0, c.Z)(P.root, i), focusable: "false", color: v, "aria-hidden": !b || void 0, role: b ? "img" : void 0, ref: e }, C, S, { ownerState: E, children: [r, b ? (0, g.jsx)("title", { children: b }) : null] }))
                })
            b.muiName = "SvgIcon"
            const w = b
            function S(t, e) {
                function n(n, r) {
                    return (0, g.jsx)(
                        w,
                        (0, a.Z)({ "data-testid": `${e}Icon`, ref: r }, n, {
                            children: t
                        })
                    )
                }
                return (n.muiName = w.muiName), s.memo(s.forwardRef(n))
            }
            const E = function (t, e = 166) {
                let n
                function r(...r) {
                    clearTimeout(n),
                        (n = setTimeout(() => {
                            t.apply(this, r)
                        }, e))
                }
                return (
                    (r.clear = () => {
                        clearTimeout(n)
                    }),
                    r
                )
            }
            const C = function (t, e) {
                return () => null
            }
            const P = function (t, e) {
                return s.isValidElement(t) && -1 !== e.indexOf(t.type.muiName)
            }
            function T(t) {
                return (t && t.ownerDocument) || document
            }
            const R = T
            const A = function (t) {
                return T(t).defaultView || window
            }
            const M = function (t, e) {
                return () => null
            }
            const V = n(7859).Z
            var k = n(8439)
            let L = 0
            const Z = u.useId
            const j = function (t) {
                if (void 0 !== Z) {
                    const e = Z()
                    return null != t ? t : e
                }
                return (function (t) {
                    const [e, n] = s.useState(t),
                        r = t || e
                    return (
                        s.useEffect(() => {
                            null == e && ((L += 1), n(`mui-${L}`))
                        }, [e]),
                        r
                    )
                })(t)
            }
            const O = function (t, e, n, r, o) {
                return null
            }
            const D = function ({
                controlled: t,
                default: e,
                name: n,
                state: r = "value"
            }) {
                const { current: o } = s.useRef(void 0 !== t),
                    [i, a] = s.useState(e)
                return [
                    o ? t : i,
                    s.useCallback((t) => {
                        o || a(t)
                    }, [])
                ]
            }
            var B = n(5734),
                I = n(4506),
                F = n(7090)
            const z = {
                configure: (t) => {
                    r.Z.configure(t)
                }
            }
        },
        8439: (t, e, n) => {
            "use strict"
            n.d(e, { Z: () => r })
            const r = n(9924).Z
        },
        5734: (t, e, n) => {
            "use strict"
            n.d(e, { Z: () => i })
            var r = n(9496),
                o = n(9924)
            const i = function (t) {
                const e = r.useRef(t)
                return (
                    (0, o.Z)(() => {
                        e.current = t
                    }),
                    r.useCallback((...t) => (0, e.current)(...t), [])
                )
            }
        },
        4506: (t, e, n) => {
            "use strict"
            n.d(e, { Z: () => i })
            var r = n(9496),
                o = n(7859)
            const i = function (...t) {
                return r.useMemo(
                    () =>
                        t.every((t) => null == t)
                            ? null
                            : (e) => {
                                  t.forEach((t) => {
                                      ;(0, o.Z)(t, e)
                                  })
                              },
                    t
                )
            }
        },
        7090: (t, e, n) => {
            "use strict"
            n.d(e, { Z: () => p })
            var r = n(9496)
            let o,
                i = !0,
                a = !1
            const s = {
                text: !0,
                search: !0,
                url: !0,
                tel: !0,
                email: !0,
                password: !0,
                number: !0,
                date: !0,
                month: !0,
                week: !0,
                time: !0,
                datetime: !0,
                "datetime-local": !0
            }
            function u(t) {
                t.metaKey || t.altKey || t.ctrlKey || (i = !0)
            }
            function l() {
                i = !1
            }
            function c() {
                "hidden" === this.visibilityState && a && (i = !0)
            }
            function d(t) {
                const { target: e } = t
                try {
                    return e.matches(":focus-visible")
                } catch (n) {}
                return (
                    i ||
                    (function (t) {
                        const { type: e, tagName: n } = t
                        return (
                            !("INPUT" !== n || !s[e] || t.readOnly) ||
                            ("TEXTAREA" === n && !t.readOnly) ||
                            !!t.isContentEditable
                        )
                    })(e)
                )
            }
            const p = function () {
                const t = r.useCallback((t) => {
                        var e
                        null != t &&
                            ((e = t.ownerDocument).addEventListener(
                                "keydown",
                                u,
                                !0
                            ),
                            e.addEventListener("mousedown", l, !0),
                            e.addEventListener("pointerdown", l, !0),
                            e.addEventListener("touchstart", l, !0),
                            e.addEventListener("visibilitychange", c, !0))
                    }, []),
                    e = r.useRef(!1)
                return {
                    isFocusVisibleRef: e,
                    onFocus: function (t) {
                        return !!d(t) && ((e.current = !0), !0)
                    },
                    onBlur: function () {
                        return (
                            !!e.current &&
                            ((a = !0),
                            window.clearTimeout(o),
                            (o = window.setTimeout(() => {
                                a = !1
                            }, 100)),
                            (e.current = !1),
                            !0)
                        )
                    },
                    ref: t
                }
            }
        },
        6837: (t, e, n) => {
            "use strict"
            n.d(e, { Z: () => v })
            var r = n(9496),
                o = n(1163),
                i = n(87),
                a = n(1247)
            const s =
                "function" == typeof Symbol && Symbol.for
                    ? Symbol.for("mui.nested")
                    : "__THEME_NESTED__"
            var u = n(4637)
            const l = function (t) {
                const { children: e, theme: n } = t,
                    l = (0, a.Z)(),
                    c = r.useMemo(() => {
                        const t =
                            null === l
                                ? n
                                : (function (t, e) {
                                      if ("function" == typeof e) return e(t)
                                      return (0, o.Z)({}, t, e)
                                  })(l, n)
                        return null != t && (t[s] = null !== l), t
                    }, [n, l])
                return (0, u.jsx)(i.Z.Provider, { value: c, children: e })
            }
            var c = n(3639),
                d = n(4218)
            const p = {}
            function f(t) {
                const e = (0, d.Z)()
                return (0, u.jsx)(c.T.Provider, {
                    value: "object" == typeof e ? e : p,
                    children: t.children
                })
            }
            const v = function (t) {
                const { children: e, theme: n } = t
                return (0, u.jsx)(l, {
                    theme: n,
                    children: (0, u.jsx)(f, { children: e })
                })
            }
        },
        7859: (t, e, n) => {
            "use strict"
            function r(t, e) {
                "function" == typeof t ? t(e) : t && (t.current = e)
            }
            n.d(e, { Z: () => r })
        },
        9924: (t, e, n) => {
            "use strict"
            n.d(e, { Z: () => o })
            var r = n(9496)
            const o =
                "undefined" != typeof window ? r.useLayoutEffect : r.useEffect
        },
        8070: (t, e, n) => {
            "use strict"
            n.d(e, { Z: () => a })
            var r = n(9496),
                o = n(5924)
            const i = "tabItem_RZ_s"
            function a(t) {
                var e = t.children,
                    n = t.hidden,
                    a = t.className
                return r.createElement(
                    "div",
                    { role: "tabpanel", className: (0, o.Z)(i, a), hidden: n },
                    e
                )
            }
        },
        31: (t, e, n) => {
            "use strict"
            n.d(e, { Z: () => S })
            var r = n(4250),
                o = n(9496),
                i = n(5924),
                a = n(4044),
                s = n(9332),
                u = n(5415),
                l = n(8896),
                c = n(5022)
            function d(t) {
                return (function (t) {
                    return o.Children.map(t, function (t) {
                        if ((0, o.isValidElement)(t) && "value" in t.props)
                            return t
                        throw new Error(
                            "Docusaurus error: Bad <Tabs> child <" +
                                ("string" == typeof t.type
                                    ? t.type
                                    : t.type.name) +
                                '>: all children of the <Tabs> component should be <TabItem>, and every <TabItem> should have a unique "value" prop.'
                        )
                    })
                })(t).map(function (t) {
                    var e = t.props
                    return {
                        value: e.value,
                        label: e.label,
                        attributes: e.attributes,
                        default: e.default
                    }
                })
            }
            function p(t) {
                var e = t.values,
                    n = t.children
                return (0, o.useMemo)(
                    function () {
                        var t = null != e ? e : d(n)
                        return (
                            (function (t) {
                                var e = (0, l.l)(t, function (t, e) {
                                    return t.value === e.value
                                })
                                if (e.length > 0)
                                    throw new Error(
                                        'Docusaurus error: Duplicate values "' +
                                            e
                                                .map(function (t) {
                                                    return t.value
                                                })
                                                .join(", ") +
                                            '" found in <Tabs>. Every value needs to be unique.'
                                    )
                            })(t),
                            t
                        )
                    },
                    [e, n]
                )
            }
            function f(t) {
                var e = t.value
                return t.tabValues.some(function (t) {
                    return t.value === e
                })
            }
            function v(t) {
                var e = t.queryString,
                    n = void 0 !== e && e,
                    r = t.groupId,
                    i = (0, s.k6)(),
                    a = (function (t) {
                        var e = t.queryString,
                            n = void 0 !== e && e,
                            r = t.groupId
                        if ("string" == typeof n) return n
                        if (!1 === n) return null
                        if (!0 === n && !r)
                            throw new Error(
                                'Docusaurus error: The <Tabs> component groupId prop is required if queryString=true, because this value is used as the search param name. You can also provide an explicit value such as queryString="my-search-param".'
                            )
                        return null != r ? r : null
                    })({ queryString: n, groupId: r })
                return [
                    (0, u._X)(a),
                    (0, o.useCallback)(
                        function (t) {
                            if (a) {
                                var e = new URLSearchParams(i.location.search)
                                e.set(a, t),
                                    i.replace(
                                        Object.assign({}, i.location, {
                                            search: e.toString()
                                        })
                                    )
                            }
                        },
                        [a, i]
                    )
                ]
            }
            function h(t) {
                var e,
                    n,
                    r,
                    i,
                    a = t.defaultValue,
                    s = t.queryString,
                    u = void 0 !== s && s,
                    l = t.groupId,
                    d = p(t),
                    h = (0, o.useState)(function () {
                        return (function (t) {
                            var e,
                                n = t.defaultValue,
                                r = t.tabValues
                            if (0 === r.length)
                                throw new Error(
                                    "Docusaurus error: the <Tabs> component requires at least one <TabItem> children component"
                                )
                            if (n) {
                                if (!f({ value: n, tabValues: r }))
                                    throw new Error(
                                        'Docusaurus error: The <Tabs> has a defaultValue "' +
                                            n +
                                            '" but none of its children has the corresponding value. Available values are: ' +
                                            r
                                                .map(function (t) {
                                                    return t.value
                                                })
                                                .join(", ") +
                                            ". If you intend to show no default tab, use defaultValue={null} instead."
                                    )
                                return n
                            }
                            var o =
                                null !=
                                (e = r.find(function (t) {
                                    return t.default
                                }))
                                    ? e
                                    : r[0]
                            if (!o)
                                throw new Error("Unexpected error: 0 tabValues")
                            return o.value
                        })({ defaultValue: a, tabValues: d })
                    }),
                    m = h[0],
                    g = h[1],
                    y = v({ queryString: u, groupId: l }),
                    x = y[0],
                    b = y[1],
                    w =
                        ((e = (function (t) {
                            return t ? "docusaurus.tab." + t : null
                        })({ groupId: l }.groupId)),
                        (n = (0, c.Nk)(e)),
                        (r = n[0]),
                        (i = n[1]),
                        [
                            r,
                            (0, o.useCallback)(
                                function (t) {
                                    e && i.set(t)
                                },
                                [e, i]
                            )
                        ]),
                    S = w[0],
                    E = w[1],
                    C = (function () {
                        var t = null != x ? x : S
                        return f({ value: t, tabValues: d }) ? t : null
                    })()
                return (
                    (0, o.useLayoutEffect)(
                        function () {
                            C && g(C)
                        },
                        [C]
                    ),
                    {
                        selectedValue: m,
                        selectValue: (0, o.useCallback)(
                            function (t) {
                                if (!f({ value: t, tabValues: d }))
                                    throw new Error(
                                        "Can't select invalid tab value=" + t
                                    )
                                g(t), b(t), E(t)
                            },
                            [b, E, d]
                        ),
                        tabValues: d
                    }
                )
            }
            var m = n(8649)
            const g = "tabList_NPiC",
                y = "tabItem_b6he"
            function x(t) {
                var e = t.className,
                    n = t.block,
                    s = t.selectedValue,
                    u = t.selectValue,
                    l = t.tabValues,
                    c = [],
                    d = (0, a.o5)().blockElementScrollPositionUntilNextRender,
                    p = function (t) {
                        var e = t.currentTarget,
                            n = c.indexOf(e),
                            r = l[n].value
                        r !== s && (d(e), u(r))
                    },
                    f = function (t) {
                        var e,
                            n = null
                        switch (t.key) {
                            case "Enter":
                                p(t)
                                break
                            case "ArrowRight":
                                var r,
                                    o = c.indexOf(t.currentTarget) + 1
                                n = null != (r = c[o]) ? r : c[0]
                                break
                            case "ArrowLeft":
                                var i,
                                    a = c.indexOf(t.currentTarget) - 1
                                n = null != (i = c[a]) ? i : c[c.length - 1]
                        }
                        null == (e = n) || e.focus()
                    }
                return o.createElement(
                    "ul",
                    {
                        role: "tablist",
                        "aria-orientation": "horizontal",
                        className: (0, i.Z)("tabs", { "tabs--block": n }, e)
                    },
                    l.map(function (t) {
                        var e = t.value,
                            n = t.label,
                            a = t.attributes
                        return o.createElement(
                            "li",
                            (0, r.Z)(
                                {
                                    role: "tab",
                                    tabIndex: s === e ? 0 : -1,
                                    "aria-selected": s === e,
                                    key: e,
                                    ref: function (t) {
                                        return c.push(t)
                                    },
                                    onKeyDown: f,
                                    onClick: p
                                },
                                a,
                                {
                                    className: (0, i.Z)(
                                        "tabs__item",
                                        y,
                                        null == a ? void 0 : a.className,
                                        { "tabs__item--active": s === e }
                                    )
                                }
                            ),
                            null != n ? n : e
                        )
                    })
                )
            }
            function b(t) {
                var e = t.lazy,
                    n = t.children,
                    r = t.selectedValue
                if (((n = Array.isArray(n) ? n : [n]), e)) {
                    var i = n.find(function (t) {
                        return t.props.value === r
                    })
                    return i
                        ? (0, o.cloneElement)(i, {
                              className: "margin-top--md"
                          })
                        : null
                }
                return o.createElement(
                    "div",
                    { className: "margin-top--md" },
                    n.map(function (t, e) {
                        return (0,
                        o.cloneElement)(t, { key: e, hidden: t.props.value !== r })
                    })
                )
            }
            function w(t) {
                var e = h(t)
                return o.createElement(
                    "div",
                    { className: (0, i.Z)("tabs-container", g) },
                    o.createElement(x, (0, r.Z)({}, t, e)),
                    o.createElement(b, (0, r.Z)({}, t, e))
                )
            }
            function S(t) {
                var e = (0, m.Z)()
                return o.createElement(w, (0, r.Z)({ key: String(e) }, t))
            }
        },
        8203: (t, e, n) => {
            "use strict"
            n.d(e, { K: () => r, k: () => o })
            var r = function () {},
                o = function () {}
        },
        677: (t, e, n) => {
            "use strict"
            n.d(e, {
                CR: () => s,
                ZT: () => o,
                _T: () => a,
                ev: () => u,
                pi: () => i
            })
            var r = function (t, e) {
                return (
                    (r =
                        Object.setPrototypeOf ||
                        ({ __proto__: [] } instanceof Array &&
                            function (t, e) {
                                t.__proto__ = e
                            }) ||
                        function (t, e) {
                            for (var n in e)
                                Object.prototype.hasOwnProperty.call(e, n) &&
                                    (t[n] = e[n])
                        }),
                    r(t, e)
                )
            }
            function o(t, e) {
                if ("function" != typeof e && null !== e)
                    throw new TypeError(
                        "Class extends value " +
                            String(e) +
                            " is not a constructor or null"
                    )
                function n() {
                    this.constructor = t
                }
                r(t, e),
                    (t.prototype =
                        null === e
                            ? Object.create(e)
                            : ((n.prototype = e.prototype), new n()))
            }
            var i = function () {
                return (
                    (i =
                        Object.assign ||
                        function (t) {
                            for (var e, n = 1, r = arguments.length; n < r; n++)
                                for (var o in (e = arguments[n]))
                                    Object.prototype.hasOwnProperty.call(
                                        e,
                                        o
                                    ) && (t[o] = e[o])
                            return t
                        }),
                    i.apply(this, arguments)
                )
            }
            function a(t, e) {
                var n = {}
                for (var r in t)
                    Object.prototype.hasOwnProperty.call(t, r) &&
                        e.indexOf(r) < 0 &&
                        (n[r] = t[r])
                if (
                    null != t &&
                    "function" == typeof Object.getOwnPropertySymbols
                ) {
                    var o = 0
                    for (r = Object.getOwnPropertySymbols(t); o < r.length; o++)
                        e.indexOf(r[o]) < 0 &&
                            Object.prototype.propertyIsEnumerable.call(
                                t,
                                r[o]
                            ) &&
                            (n[r[o]] = t[r[o]])
                }
                return n
            }
            Object.create
            function s(t, e) {
                var n = "function" == typeof Symbol && t[Symbol.iterator]
                if (!n) return t
                var r,
                    o,
                    i = n.call(t),
                    a = []
                try {
                    for (; (void 0 === e || e-- > 0) && !(r = i.next()).done; )
                        a.push(r.value)
                } catch (s) {
                    o = { error: s }
                } finally {
                    try {
                        r && !r.done && (n = i.return) && n.call(i)
                    } finally {
                        if (o) throw o.error
                    }
                }
                return a
            }
            function u(t, e, n) {
                if (n || 2 === arguments.length)
                    for (var r, o = 0, i = e.length; o < i; o++)
                        (!r && o in e) ||
                            (r || (r = Array.prototype.slice.call(e, 0, o)),
                            (r[o] = e[o]))
                return t.concat(r || Array.prototype.slice.call(e))
            }
            Object.create
        },
        8772: (t) => {
            ;(t.exports = function (t) {
                return t && t.__esModule ? t : { default: t }
            }),
                (t.exports.__esModule = !0),
                (t.exports.default = t.exports)
        },
        84: (t, e, n) => {
            "use strict"
            n.d(e, { _: () => c })
            var r = n(677),
                o = n(8203),
                i = n(6914),
                a = n(9241)
            function s() {
                var t = !1,
                    e = [],
                    n = new Set(),
                    s = {
                        subscribe: function (t) {
                            return (
                                n.add(t),
                                function () {
                                    n.delete(t)
                                }
                            )
                        },
                        start: function (r, o) {
                            if (t) {
                                var a = []
                                return (
                                    n.forEach(function (t) {
                                        a.push(
                                            (0, i.d5)(t, r, {
                                                transitionOverride: o
                                            })
                                        )
                                    }),
                                    Promise.all(a)
                                )
                            }
                            return new Promise(function (t) {
                                e.push({ animation: [r, o], resolve: t })
                            })
                        },
                        set: function (e) {
                            return (
                                (0, o.k)(
                                    t,
                                    "controls.set() should only be called after a component has mounted. Consider calling within a useEffect hook."
                                ),
                                n.forEach(function (t) {
                                    ;(0, a.gg)(t, e)
                                })
                            )
                        },
                        stop: function () {
                            n.forEach(function (t) {
                                ;(0, i.p_)(t)
                            })
                        },
                        mount: function () {
                            return (
                                (t = !0),
                                e.forEach(function (t) {
                                    var e = t.animation,
                                        n = t.resolve
                                    s.start
                                        .apply(
                                            s,
                                            (0, r.ev)([], (0, r.CR)(e), !1)
                                        )
                                        .then(n)
                                }),
                                function () {
                                    ;(t = !1), s.stop()
                                }
                            )
                        }
                    }
                return s
            }
            var u = n(9496),
                l = n(4786)
            var c = function () {
                var t = (0, l.h)(s)
                return (0, u.useEffect)(t.mount, []), t
            }
        },
        227: (t, e, n) => {
            "use strict"
            n.d(e, { C: () => r })
            var r = function (t) {
                return Array.isArray(t)
            }
        },
        5638: (t, e, n) => {
            "use strict"
            n.d(e, { ev: () => xt, b8: () => bt })
            var r = n(677),
                o = n(8203),
                i = n(6179)
            const a = 0.001
            function s({
                duration: t = 800,
                bounce: e = 0.25,
                velocity: n = 0,
                mass: r = 1
            }) {
                let s, l
                ;(0, o.K)(
                    t <= 1e4,
                    "Spring duration must be 10 seconds or less"
                )
                let c = 1 - e
                ;(c = (0, i.u)(0.05, 1, c)),
                    (t = (0, i.u)(0.01, 10, t / 1e3)),
                    c < 1
                        ? ((s = (e) => {
                              const r = e * c,
                                  o = r * t,
                                  i = r - n,
                                  s = u(e, c),
                                  l = Math.exp(-o)
                              return a - (i / s) * l
                          }),
                          (l = (e) => {
                              const r = e * c * t,
                                  o = r * n + n,
                                  i = Math.pow(c, 2) * Math.pow(e, 2) * t,
                                  l = Math.exp(-r),
                                  d = u(Math.pow(e, 2), c)
                              return (
                                  ((-s(e) + a > 0 ? -1 : 1) * ((o - i) * l)) / d
                              )
                          }))
                        : ((s = (e) =>
                              Math.exp(-e * t) * ((e - n) * t + 1) - 0.001),
                          (l = (e) => Math.exp(-e * t) * (t * t * (n - e))))
                const d = (function (t, e, n) {
                    let r = n
                    for (let o = 1; o < 12; o++) r -= t(r) / e(r)
                    return r
                })(s, l, 5 / t)
                if (((t *= 1e3), isNaN(d)))
                    return { stiffness: 100, damping: 10, duration: t }
                {
                    const e = Math.pow(d, 2) * r
                    return {
                        stiffness: e,
                        damping: 2 * c * Math.sqrt(r * e),
                        duration: t
                    }
                }
            }
            function u(t, e) {
                return t * Math.sqrt(1 - e * e)
            }
            const l = ["duration", "bounce"],
                c = ["stiffness", "damping", "mass"]
            function d(t, e) {
                return e.some((e) => void 0 !== t[e])
            }
            function p(t) {
                var {
                        from: e = 0,
                        to: n = 1,
                        restSpeed: o = 2,
                        restDelta: i
                    } = t,
                    a = (0, r._T)(t, ["from", "to", "restSpeed", "restDelta"])
                const p = { done: !1, value: e }
                let {
                        stiffness: v,
                        damping: h,
                        mass: m,
                        velocity: g,
                        duration: y,
                        isResolvedFromDuration: x
                    } = (function (t) {
                        let e = Object.assign(
                            {
                                velocity: 0,
                                stiffness: 100,
                                damping: 10,
                                mass: 1,
                                isResolvedFromDuration: !1
                            },
                            t
                        )
                        if (!d(t, c) && d(t, l)) {
                            const n = s(t)
                            ;(e = Object.assign(
                                Object.assign(Object.assign({}, e), n),
                                { velocity: 0, mass: 1 }
                            )),
                                (e.isResolvedFromDuration = !0)
                        }
                        return e
                    })(a),
                    b = f,
                    w = f
                function S() {
                    const t = g ? -g / 1e3 : 0,
                        r = n - e,
                        o = h / (2 * Math.sqrt(v * m)),
                        a = Math.sqrt(v / m) / 1e3
                    if (
                        (void 0 === i &&
                            (i = Math.min(Math.abs(n - e) / 100, 0.4)),
                        o < 1)
                    ) {
                        const e = u(a, o)
                        ;(b = (i) => {
                            const s = Math.exp(-o * a * i)
                            return (
                                n -
                                s *
                                    (((t + o * a * r) / e) * Math.sin(e * i) +
                                        r * Math.cos(e * i))
                            )
                        }),
                            (w = (n) => {
                                const i = Math.exp(-o * a * n)
                                return (
                                    o *
                                        a *
                                        i *
                                        ((Math.sin(e * n) * (t + o * a * r)) /
                                            e +
                                            r * Math.cos(e * n)) -
                                    i *
                                        (Math.cos(e * n) * (t + o * a * r) -
                                            e * r * Math.sin(e * n))
                                )
                            })
                    } else if (1 === o)
                        b = (e) => n - Math.exp(-a * e) * (r + (t + a * r) * e)
                    else {
                        const e = a * Math.sqrt(o * o - 1)
                        b = (i) => {
                            const s = Math.exp(-o * a * i),
                                u = Math.min(e * i, 300)
                            return (
                                n -
                                (s *
                                    ((t + o * a * r) * Math.sinh(u) +
                                        e * r * Math.cosh(u))) /
                                    e
                            )
                        }
                    }
                }
                return (
                    S(),
                    {
                        next: (t) => {
                            const e = b(t)
                            if (x) p.done = t >= y
                            else {
                                const r = 1e3 * w(t),
                                    a = Math.abs(r) <= o,
                                    s = Math.abs(n - e) <= i
                                p.done = a && s
                            }
                            return (p.value = p.done ? n : e), p
                        },
                        flipTarget: () => {
                            ;(g = -g), ([e, n] = [n, e]), S()
                        }
                    }
                )
            }
            p.needsInterpolation = (t, e) =>
                "string" == typeof t || "string" == typeof e
            const f = (t) => 0
            var v = n(1759),
                h = n(9552),
                m = n(6637),
                g = n(7522),
                y = n(4707)
            function x(t, e, n) {
                return (
                    n < 0 && (n += 1),
                    n > 1 && (n -= 1),
                    n < 1 / 6
                        ? t + 6 * (e - t) * n
                        : n < 0.5
                        ? e
                        : n < 2 / 3
                        ? t + (e - t) * (2 / 3 - n) * 6
                        : t
                )
            }
            function b({ hue: t, saturation: e, lightness: n, alpha: r }) {
                ;(t /= 360), (n /= 100)
                let o = 0,
                    i = 0,
                    a = 0
                if ((e /= 100)) {
                    const r = n < 0.5 ? n * (1 + e) : n + e - n * e,
                        s = 2 * n - r
                    ;(o = x(s, r, t + 1 / 3)),
                        (i = x(s, r, t)),
                        (a = x(s, r, t - 1 / 3))
                } else o = i = a = n
                return {
                    red: Math.round(255 * o),
                    green: Math.round(255 * i),
                    blue: Math.round(255 * a),
                    alpha: r
                }
            }
            const w = (t, e, n) => {
                    const r = t * t,
                        o = e * e
                    return Math.sqrt(Math.max(0, n * (o - r) + r))
                },
                S = [m.$, g.m, y.J],
                E = (t) => S.find((e) => e.test(t)),
                C = (t) =>
                    `'${t}' is not an animatable color. Use the equivalent color code instead.`,
                P = (t, e) => {
                    let n = E(t),
                        r = E(e)
                    ;(0, o.k)(!!n, C(t)), (0, o.k)(!!r, C(e))
                    let i = n.parse(t),
                        a = r.parse(e)
                    n === y.J && ((i = b(i)), (n = g.m)),
                        r === y.J && ((a = b(a)), (r = g.m))
                    const s = Object.assign({}, i)
                    return (t) => {
                        for (const e in s)
                            "alpha" !== e && (s[e] = w(i[e], a[e], t))
                        return (
                            (s.alpha = (0, h.C)(i.alpha, a.alpha, t)),
                            n.transform(s)
                        )
                    }
                }
            var T = n(9872),
                R = n(1928),
                A = n(179),
                M = n(2379)
            function V(t, e) {
                return (0, A.e)(t)
                    ? (n) => (0, h.C)(t, e, n)
                    : T.$.test(t)
                    ? P(t, e)
                    : j(t, e)
            }
            const k = (t, e) => {
                    const n = [...t],
                        r = n.length,
                        o = t.map((t, n) => V(t, e[n]))
                    return (t) => {
                        for (let e = 0; e < r; e++) n[e] = o[e](t)
                        return n
                    }
                },
                L = (t, e) => {
                    const n = Object.assign(Object.assign({}, t), e),
                        r = {}
                    for (const o in n)
                        void 0 !== t[o] &&
                            void 0 !== e[o] &&
                            (r[o] = V(t[o], e[o]))
                    return (t) => {
                        for (const e in r) n[e] = r[e](t)
                        return n
                    }
                }
            function Z(t) {
                const e = R.P.parse(t),
                    n = e.length
                let r = 0,
                    o = 0,
                    i = 0
                for (let a = 0; a < n; a++)
                    r || "number" == typeof e[a]
                        ? r++
                        : void 0 !== e[a].hue
                        ? i++
                        : o++
                return { parsed: e, numNumbers: r, numRGB: o, numHSL: i }
            }
            const j = (t, e) => {
                    const n = R.P.createTransformer(e),
                        r = Z(t),
                        i = Z(e)
                    return r.numHSL === i.numHSL &&
                        r.numRGB === i.numRGB &&
                        r.numNumbers >= i.numNumbers
                        ? (0, M.z)(k(r.parsed, i.parsed), n)
                        : ((0, o.K)(
                              !0,
                              `Complex values '${t}' and '${e}' too different to mix. Ensure all colors are of the same type, and that each contains the same quantity of number and color values. Falling back to instant transition.`
                          ),
                          (n) => `${n > 0 ? e : t}`)
                },
                O = (t, e) => (n) => (0, h.C)(t, e, n)
            function D(t, e, n) {
                const r = [],
                    o =
                        n ||
                        ("number" == typeof (i = t[0])
                            ? O
                            : "string" == typeof i
                            ? T.$.test(i)
                                ? P
                                : j
                            : Array.isArray(i)
                            ? k
                            : "object" == typeof i
                            ? L
                            : void 0)
                var i
                const a = t.length - 1
                for (let s = 0; s < a; s++) {
                    let n = o(t[s], t[s + 1])
                    if (e) {
                        const t = Array.isArray(e) ? e[s] : e
                        n = (0, M.z)(t, n)
                    }
                    r.push(n)
                }
                return r
            }
            function B(t, e, { clamp: n = !0, ease: r, mixer: a } = {}) {
                const s = t.length
                ;(0, o.k)(
                    s === e.length,
                    "Both input and output ranges must be the same length"
                ),
                    (0, o.k)(
                        !r || !Array.isArray(r) || r.length === s - 1,
                        "Array of easing functions must be of length `input.length - 1`, as it applies to the transitions **between** the defined values."
                    ),
                    t[0] > t[s - 1] &&
                        ((t = [].concat(t)),
                        (e = [].concat(e)),
                        t.reverse(),
                        e.reverse())
                const u = D(e, r, a),
                    l =
                        2 === s
                            ? (function ([t, e], [n]) {
                                  return (r) => n((0, v.Y)(t, e, r))
                              })(t, u)
                            : (function (t, e) {
                                  const n = t.length,
                                      r = n - 1
                                  return (o) => {
                                      let i = 0,
                                          a = !1
                                      if (
                                          (o <= t[0]
                                              ? (a = !0)
                                              : o >= t[r] &&
                                                ((i = r - 1), (a = !0)),
                                          !a)
                                      ) {
                                          let e = 1
                                          for (
                                              ;
                                              e < n && !(t[e] > o || e === r);
                                              e++
                                          );
                                          i = e - 1
                                      }
                                      const s = (0, v.Y)(t[i], t[i + 1], o)
                                      return e[i](s)
                                  }
                              })(t, u)
                return n ? (e) => l((0, i.u)(t[0], t[s - 1], e)) : l
            }
            var I = n(3401)
            function F(t, e) {
                return t.map(() => e || I.mZ).splice(0, t.length - 1)
            }
            function z({
                from: t = 0,
                to: e = 1,
                ease: n,
                offset: r,
                duration: o = 300
            }) {
                const i = { done: !1, value: t },
                    a = Array.isArray(e) ? e : [t, e],
                    s = (function (t, e) {
                        return t.map((t) => t * e)
                    })(
                        r && r.length === a.length
                            ? r
                            : (function (t) {
                                  const e = t.length
                                  return t.map((t, n) =>
                                      0 !== n ? n / (e - 1) : 0
                                  )
                              })(a),
                        o
                    )
                function u() {
                    return B(s, a, { ease: Array.isArray(n) ? n : F(a, n) })
                }
                let l = u()
                return {
                    next: (t) => ((i.value = l(t)), (i.done = t >= o), i),
                    flipTarget: () => {
                        a.reverse(), (l = u())
                    }
                }
            }
            const N = {
                keyframes: z,
                spring: p,
                decay: function ({
                    velocity: t = 0,
                    from: e = 0,
                    power: n = 0.8,
                    timeConstant: r = 350,
                    restDelta: o = 0.5,
                    modifyTarget: i
                }) {
                    const a = { done: !1, value: e }
                    let s = n * t
                    const u = e + s,
                        l = void 0 === i ? u : i(u)
                    return (
                        l !== u && (s = l - e),
                        {
                            next: (t) => {
                                const e = -s * Math.exp(-t / r)
                                return (
                                    (a.done = !(e > o || e < -o)),
                                    (a.value = a.done ? l : l + e),
                                    a
                                )
                            },
                            flipTarget: () => {}
                        }
                    )
                }
            }
            var $ = n(931)
            function U(t, e, n = 0) {
                return t - e - n
            }
            const W = (t) => {
                const e = ({ delta: e }) => t(e)
                return {
                    start: () => $.ZP.update(e, !0),
                    stop: () => $.qY.update(e)
                }
            }
            function H(t) {
                var e,
                    n,
                    {
                        from: o,
                        autoplay: i = !0,
                        driver: a = W,
                        elapsed: s = 0,
                        repeat: u = 0,
                        repeatType: l = "loop",
                        repeatDelay: c = 0,
                        onPlay: d,
                        onStop: f,
                        onComplete: v,
                        onRepeat: h,
                        onUpdate: m
                    } = t,
                    g = (0, r._T)(t, [
                        "from",
                        "autoplay",
                        "driver",
                        "elapsed",
                        "repeat",
                        "repeatType",
                        "repeatDelay",
                        "onPlay",
                        "onStop",
                        "onComplete",
                        "onRepeat",
                        "onUpdate"
                    ])
                let y,
                    x,
                    b,
                    { to: w } = g,
                    S = 0,
                    E = g.duration,
                    C = !1,
                    P = !0
                const T = (function (t) {
                    if (Array.isArray(t.to)) return z
                    if (N[t.type]) return N[t.type]
                    const e = new Set(Object.keys(t))
                    return e.has("ease") ||
                        (e.has("duration") && !e.has("dampingRatio"))
                        ? z
                        : e.has("dampingRatio") ||
                          e.has("stiffness") ||
                          e.has("mass") ||
                          e.has("damping") ||
                          e.has("restSpeed") ||
                          e.has("restDelta")
                        ? p
                        : z
                })(g)
                ;(null === (n = (e = T).needsInterpolation) || void 0 === n
                    ? void 0
                    : n.call(e, o, w)) &&
                    ((b = B([0, 100], [o, w], { clamp: !1 })),
                    (o = 0),
                    (w = 100))
                const R = T(
                    Object.assign(Object.assign({}, g), { from: o, to: w })
                )
                function A() {
                    S++,
                        "reverse" === l
                            ? ((P = S % 2 == 0),
                              (s = (function (t, e, n = 0, r = !0) {
                                  return r ? U(e + -t, e, n) : e - (t - e) + n
                              })(s, E, c, P)))
                            : ((s = U(s, E, c)),
                              "mirror" === l && R.flipTarget()),
                        (C = !1),
                        h && h()
                }
                function M(t) {
                    if ((P || (t = -t), (s += t), !C)) {
                        const t = R.next(Math.max(0, s))
                        ;(x = t.value),
                            b && (x = b(x)),
                            (C = P ? t.done : s <= 0)
                    }
                    null == m || m(x),
                        C &&
                            (0 === S && (null != E || (E = s)),
                            S < u
                                ? (function (t, e, n, r) {
                                      return r ? t >= e + n : t <= -n
                                  })(s, E, c, P) && A()
                                : (y.stop(), v && v()))
                }
                return (
                    i && (null == d || d(), (y = a(M)), y.start()),
                    {
                        stop: () => {
                            null == f || f(), y.stop()
                        }
                    }
                )
            }
            var _ = n(8064)
            var Y = n(9947)
            const q = (t, e) => 1 - 3 * e + 3 * t,
                X = (t, e) => 3 * e - 6 * t,
                G = (t) => 3 * t,
                K = (t, e, n) => ((q(e, n) * t + X(e, n)) * t + G(e)) * t,
                J = (t, e, n) => 3 * q(e, n) * t * t + 2 * X(e, n) * t + G(e)
            const Q = 0.1
            function tt(t, e, n, r) {
                if (t === e && n === r) return I.GE
                const o = new Float32Array(11)
                for (let a = 0; a < 11; ++a) o[a] = K(a * Q, t, n)
                function i(e) {
                    let r = 0,
                        i = 1
                    for (; 10 !== i && o[i] <= e; ++i) r += Q
                    --i
                    const a = r + ((e - o[i]) / (o[i + 1] - o[i])) * Q,
                        s = J(a, t, n)
                    return s >= 0.001
                        ? (function (t, e, n, r) {
                              for (let o = 0; o < 8; ++o) {
                                  const o = J(e, n, r)
                                  if (0 === o) return e
                                  e -= (K(e, n, r) - t) / o
                              }
                              return e
                          })(e, a, t, n)
                        : 0 === s
                        ? a
                        : (function (t, e, n, r, o) {
                              let i,
                                  a,
                                  s = 0
                              do {
                                  ;(a = e + (n - e) / 2),
                                      (i = K(a, r, o) - t),
                                      i > 0 ? (n = a) : (e = a)
                              } while (Math.abs(i) > 1e-7 && ++s < 10)
                              return a
                          })(e, r, r + Q, t, n)
                }
                return (t) => (0 === t || 1 === t ? t : K(i(t), e, r))
            }
            var et = {
                    linear: I.GE,
                    easeIn: I.YQ,
                    easeInOut: I.mZ,
                    easeOut: I.Vv,
                    circIn: I.Z7,
                    circInOut: I.X7,
                    circOut: I.Bn,
                    backIn: I.G2,
                    backInOut: I.XL,
                    backOut: I.CG,
                    anticipate: I.LU,
                    bounceIn: I.h9,
                    bounceInOut: I.yD,
                    bounceOut: I.gJ
                },
                nt = function (t) {
                    if (Array.isArray(t)) {
                        ;(0, o.k)(
                            4 === t.length,
                            "Cubic bezier arrays must contain four numerical values."
                        )
                        var e = (0, r.CR)(t, 4)
                        return tt(e[0], e[1], e[2], e[3])
                    }
                    return "string" == typeof t
                        ? ((0, o.k)(
                              void 0 !== et[t],
                              "Invalid easing type '".concat(t, "'")
                          ),
                          et[t])
                        : t
                },
                rt = function (t, e) {
                    return (
                        "zIndex" !== t &&
                        (!("number" != typeof e && !Array.isArray(e)) ||
                            !(
                                "string" != typeof e ||
                                !R.P.test(e) ||
                                e.startsWith("url(")
                            ))
                    )
                },
                ot = n(227),
                it = function () {
                    return {
                        type: "spring",
                        stiffness: 500,
                        damping: 25,
                        restSpeed: 10
                    }
                },
                at = function (t) {
                    return {
                        type: "spring",
                        stiffness: 550,
                        damping: 0 === t ? 2 * Math.sqrt(550) : 30,
                        restSpeed: 10
                    }
                },
                st = function () {
                    return { type: "keyframes", ease: "linear", duration: 0.3 }
                },
                ut = function (t) {
                    return { type: "keyframes", duration: 0.8, values: t }
                },
                lt = {
                    x: it,
                    y: it,
                    z: it,
                    rotate: it,
                    rotateX: it,
                    rotateY: it,
                    rotateZ: it,
                    scaleX: at,
                    scaleY: at,
                    scale: at,
                    opacity: st,
                    backgroundColor: st,
                    color: st,
                    default: at
                },
                ct = n(7203),
                dt = !1,
                pt = n(7125)
            var ft = !1
            function vt(t) {
                var e = t.ease,
                    n = t.times,
                    i = t.yoyo,
                    a = t.flip,
                    s = t.loop,
                    u = (0, r._T)(t, ["ease", "times", "yoyo", "flip", "loop"]),
                    l = (0, r.pi)({}, u)
                return (
                    n && (l.offset = n),
                    u.duration && (l.duration = (0, Y.w)(u.duration)),
                    u.repeatDelay && (l.repeatDelay = (0, Y.w)(u.repeatDelay)),
                    e &&
                        (l.ease = (function (t) {
                            return Array.isArray(t) && "number" != typeof t[0]
                        })(e)
                            ? e.map(nt)
                            : nt(e)),
                    "tween" === u.type && (l.type = "keyframes"),
                    (i || s || a) &&
                        ((0, o.K)(
                            !ft,
                            "yoyo, loop and flip have been removed from the API. Replace with repeat and repeatType options."
                        ),
                        (ft = !0),
                        i
                            ? (l.repeatType = "reverse")
                            : s
                            ? (l.repeatType = "loop")
                            : a && (l.repeatType = "mirror"),
                        (l.repeat = s || i || a || u.repeat)),
                    "spring" !== u.type && (l.type = "keyframes"),
                    l
                )
            }
            function ht(t, e, n) {
                var o, i, a, s
                return (
                    Array.isArray(e.to) &&
                        ((null !== (o = t.duration) && void 0 !== o) ||
                            (t.duration = 0.8)),
                    (function (t) {
                        Array.isArray(t.to) &&
                            null === t.to[0] &&
                            ((t.to = (0, r.ev)([], (0, r.CR)(t.to), !1)),
                            (t.to[0] = t.from))
                    })(e),
                    (function (t) {
                        t.when,
                            t.delay,
                            t.delayChildren,
                            t.staggerChildren,
                            t.staggerDirection,
                            t.repeat,
                            t.repeatType,
                            t.repeatDelay,
                            t.from
                        var e = (0, r._T)(t, [
                            "when",
                            "delay",
                            "delayChildren",
                            "staggerChildren",
                            "staggerDirection",
                            "repeat",
                            "repeatType",
                            "repeatDelay",
                            "from"
                        ])
                        return !!Object.keys(e).length
                    })(t) ||
                        (t = (0, r.pi)(
                            (0, r.pi)({}, t),
                            ((i = n),
                            (a = e.to),
                            (s = (0, ot.C)(a) ? ut : lt[i] || lt.default),
                            (0, r.pi)({ to: a }, s(a)))
                        )),
                    (0, r.pi)((0, r.pi)({}, e), vt(t))
                )
            }
            function mt(t, e, n, i, a) {
                var s,
                    u = xt(i, t),
                    l = null !== (s = u.from) && void 0 !== s ? s : e.get(),
                    c = rt(t, n)
                "none" === l && c && "string" == typeof n
                    ? (l = (0, ct.T)(t, n))
                    : gt(l) && "string" == typeof n
                    ? (l = yt(n))
                    : !Array.isArray(n) &&
                      gt(n) &&
                      "string" == typeof l &&
                      (n = yt(l))
                var d = rt(t, l)
                return (
                    (0, o.K)(
                        d === c,
                        "You are trying to animate "
                            .concat(t, ' from "')
                            .concat(l, '" to "')
                            .concat(n, '". ')
                            .concat(
                                l,
                                " is not an animatable value - to enable this animation set "
                            )
                            .concat(l, " to a value animatable to ")
                            .concat(n, " via the `style` property.")
                    ),
                    d && c && !1 !== u.type
                        ? function () {
                              var o = {
                                  from: l,
                                  to: n,
                                  velocity: e.getVelocity(),
                                  onComplete: a,
                                  onUpdate: function (t) {
                                      return e.set(t)
                                  }
                              }
                              return "inertia" === u.type || "decay" === u.type
                                  ? (function ({
                                        from: t = 0,
                                        velocity: e = 0,
                                        min: n,
                                        max: r,
                                        power: o = 0.8,
                                        timeConstant: i = 750,
                                        bounceStiffness: a = 500,
                                        bounceDamping: s = 10,
                                        restDelta: u = 1,
                                        modifyTarget: l,
                                        driver: c,
                                        onUpdate: d,
                                        onComplete: p,
                                        onStop: f
                                    }) {
                                        let v
                                        function h(t) {
                                            return (
                                                (void 0 !== n && t < n) ||
                                                (void 0 !== r && t > r)
                                            )
                                        }
                                        function m(t) {
                                            return void 0 === n
                                                ? r
                                                : void 0 === r ||
                                                  Math.abs(n - t) <
                                                      Math.abs(r - t)
                                                ? n
                                                : r
                                        }
                                        function g(t) {
                                            null == v || v.stop(),
                                                (v = H(
                                                    Object.assign(
                                                        Object.assign({}, t),
                                                        {
                                                            driver: c,
                                                            onUpdate: (e) => {
                                                                var n
                                                                null == d ||
                                                                    d(e),
                                                                    null ===
                                                                        (n =
                                                                            t.onUpdate) ||
                                                                        void 0 ===
                                                                            n ||
                                                                        n.call(
                                                                            t,
                                                                            e
                                                                        )
                                                            },
                                                            onComplete: p,
                                                            onStop: f
                                                        }
                                                    )
                                                ))
                                        }
                                        function y(t) {
                                            g(
                                                Object.assign(
                                                    {
                                                        type: "spring",
                                                        stiffness: a,
                                                        damping: s,
                                                        restDelta: u
                                                    },
                                                    t
                                                )
                                            )
                                        }
                                        if (h(t))
                                            y({
                                                from: t,
                                                velocity: e,
                                                to: m(t)
                                            })
                                        else {
                                            let r = o * e + t
                                            void 0 !== l && (r = l(r))
                                            const a = m(r),
                                                s = a === n ? -1 : 1
                                            let c, d
                                            const p = (t) => {
                                                ;(c = d),
                                                    (d = t),
                                                    (e = (0, _.R)(
                                                        t - c,
                                                        (0, $.$B)().delta
                                                    )),
                                                    ((1 === s && t > a) ||
                                                        (-1 === s && t < a)) &&
                                                        y({
                                                            from: t,
                                                            to: a,
                                                            velocity: e
                                                        })
                                            }
                                            g({
                                                type: "decay",
                                                from: t,
                                                velocity: e,
                                                timeConstant: i,
                                                power: o,
                                                restDelta: u,
                                                modifyTarget: l,
                                                onUpdate: h(r) ? p : void 0
                                            })
                                        }
                                        return {
                                            stop: () =>
                                                null == v ? void 0 : v.stop()
                                        }
                                    })((0, r.pi)((0, r.pi)({}, o), u))
                                  : H(
                                        (0, r.pi)((0, r.pi)({}, ht(u, o, t)), {
                                            onUpdate: function (t) {
                                                var e
                                                o.onUpdate(t),
                                                    null === (e = u.onUpdate) ||
                                                        void 0 === e ||
                                                        e.call(u, t)
                                            },
                                            onComplete: function () {
                                                var t
                                                o.onComplete(),
                                                    null ===
                                                        (t = u.onComplete) ||
                                                        void 0 === t ||
                                                        t.call(u)
                                            }
                                        })
                                    )
                          }
                        : function () {
                              var t,
                                  r,
                                  o = (0, pt.Y)(n)
                              return (
                                  e.set(o),
                                  a(),
                                  null ===
                                      (t = null == u ? void 0 : u.onUpdate) ||
                                      void 0 === t ||
                                      t.call(u, o),
                                  null ===
                                      (r = null == u ? void 0 : u.onComplete) ||
                                      void 0 === r ||
                                      r.call(u),
                                  { stop: function () {} }
                              )
                          }
                )
            }
            function gt(t) {
                return (
                    0 === t ||
                    ("string" == typeof t &&
                        0 === parseFloat(t) &&
                        -1 === t.indexOf(" "))
                )
            }
            function yt(t) {
                return "number" == typeof t ? 0 : (0, ct.T)("", t)
            }
            function xt(t, e) {
                return t[e] || t.default || t
            }
            function bt(t, e, n, r) {
                return (
                    void 0 === r && (r = {}),
                    dt && (r = { type: !1 }),
                    e.start(function (o) {
                        var i,
                            a,
                            s = mt(t, e, n, r, o),
                            u = (function (t, e) {
                                var n, r
                                return null !==
                                    (r =
                                        null !== (n = (xt(t, e) || {}).delay) &&
                                        void 0 !== n
                                            ? n
                                            : t.delay) && void 0 !== r
                                    ? r
                                    : 0
                            })(r, t),
                            l = function () {
                                return (a = s())
                            }
                        return (
                            u ? (i = window.setTimeout(l, (0, Y.w)(u))) : l(),
                            function () {
                                clearTimeout(i), null == a || a.stop()
                            }
                        )
                    })
                )
            }
        },
        949: (t, e, n) => {
            "use strict"
            n.d(e, { E: () => Nr })
            var r = n(677),
                o = n(9496),
                i =
                    ("undefined" == typeof process || process.env,
                    "production"),
                a = function (t) {
                    return {
                        isEnabled: function (e) {
                            return t.some(function (t) {
                                return !!e[t]
                            })
                        }
                    }
                },
                s = {
                    measureLayout: a(["layout", "layoutId", "drag"]),
                    animation: a([
                        "animate",
                        "exit",
                        "variants",
                        "whileHover",
                        "whileTap",
                        "whileFocus",
                        "whileDrag",
                        "whileInView"
                    ]),
                    exit: a(["exit"]),
                    drag: a(["drag", "dragControls"]),
                    focus: a(["whileFocus"]),
                    hover: a(["whileHover", "onHoverStart", "onHoverEnd"]),
                    tap: a(["whileTap", "onTap", "onTapStart", "onTapCancel"]),
                    pan: a([
                        "onPan",
                        "onPanStart",
                        "onPanSessionStart",
                        "onPanEnd"
                    ]),
                    inView: a([
                        "whileInView",
                        "onViewportEnter",
                        "onViewportLeave"
                    ])
                }
            var u = n(8203),
                l = (0, o.createContext)({ strict: !1 }),
                c = Object.keys(s),
                d = c.length
            var p = (0, o.createContext)({
                    transformPagePoint: function (t) {
                        return t
                    },
                    isStatic: !1,
                    reducedMotion: "never"
                }),
                f = (0, o.createContext)({})
            var v = (0, o.createContext)(null),
                h = n(9423),
                m = n(9813),
                g = { current: null },
                y = !1
            function x() {
                return (
                    !y &&
                        (function () {
                            if (((y = !0), m.j))
                                if (window.matchMedia) {
                                    var t = window.matchMedia(
                                            "(prefers-reduced-motion)"
                                        ),
                                        e = function () {
                                            return (g.current = t.matches)
                                        }
                                    t.addListener(e), e()
                                } else g.current = !1
                        })(),
                    (0, r.CR)((0, o.useState)(g.current), 1)[0]
                )
            }
            function b(t, e, n, r) {
                var i,
                    a,
                    s = (0, o.useContext)(l),
                    u = (0, o.useContext)(f).visualElement,
                    c = (0, o.useContext)(v),
                    d =
                        ((i = x()),
                        "never" !== (a = (0, o.useContext)(p).reducedMotion) &&
                            ("always" === a || i)),
                    m = (0, o.useRef)(void 0)
                r || (r = s.renderer),
                    !m.current &&
                        r &&
                        (m.current = r(t, {
                            visualState: e,
                            parent: u,
                            props: n,
                            presenceId: null == c ? void 0 : c.id,
                            blockInitialAnimation:
                                !1 === (null == c ? void 0 : c.initial),
                            shouldReduceMotion: d
                        }))
                var g = m.current
                return (
                    (0, h.L)(function () {
                        null == g || g.syncRender()
                    }),
                    (0, o.useEffect)(function () {
                        var t
                        null === (t = null == g ? void 0 : g.animationState) ||
                            void 0 === t ||
                            t.animateChanges()
                    }),
                    (0, h.L)(function () {
                        return function () {
                            return null == g ? void 0 : g.notifyUnmount()
                        }
                    }, []),
                    g
                )
            }
            function w(t) {
                return (
                    "object" == typeof t &&
                    Object.prototype.hasOwnProperty.call(t, "current")
                )
            }
            var S = n(4714)
            function E(t) {
                var e = (function (t, e) {
                        if ((0, S.O6)(t)) {
                            var n = t.initial,
                                r = t.animate
                            return {
                                initial: !1 === n || (0, S.$L)(n) ? n : void 0,
                                animate: (0, S.$L)(r) ? r : void 0
                            }
                        }
                        return !1 !== t.inherit ? e : {}
                    })(t, (0, o.useContext)(f)),
                    n = e.initial,
                    r = e.animate
                return (0, o.useMemo)(
                    function () {
                        return { initial: n, animate: r }
                    },
                    [C(n), C(r)]
                )
            }
            function C(t) {
                return Array.isArray(t) ? t.join(" ") : t
            }
            var P = n(4786),
                T = { hasAnimatedSinceResize: !0, hasEverUpdated: !1 },
                R = 1
            var A = (0, o.createContext)({}),
                M = (0, o.createContext)({})
            var V = (function (t) {
                function e() {
                    return (null !== t && t.apply(this, arguments)) || this
                }
                return (
                    (0, r.ZT)(e, t),
                    (e.prototype.getSnapshotBeforeUpdate = function () {
                        return this.updateProps(), null
                    }),
                    (e.prototype.componentDidUpdate = function () {}),
                    (e.prototype.updateProps = function () {
                        var t = this.props,
                            e = t.visualElement,
                            n = t.props
                        e && e.setProps(n)
                    }),
                    (e.prototype.render = function () {
                        return this.props.children
                    }),
                    e
                )
            })(o.Component)
            function k(t) {
                var e = t.preloadedFeatures,
                    n = t.createVisualElement,
                    a = t.projectionNodeConstructor,
                    v = t.useRender,
                    h = t.useVisualState,
                    g = t.Component
                return (
                    e &&
                        (function (t) {
                            for (var e in t)
                                null !== t[e] &&
                                    ("projectionNodeConstructor" === e
                                        ? (s.projectionNodeConstructor = t[e])
                                        : (s[e].Component = t[e]))
                        })(e),
                    (0, o.forwardRef)(function (t, y) {
                        var x = (function (t) {
                            var e,
                                n = t.layoutId,
                                r =
                                    null === (e = (0, o.useContext)(A)) ||
                                    void 0 === e
                                        ? void 0
                                        : e.id
                            return r && void 0 !== n ? r + "-" + n : n
                        })(t)
                        t = (0, r.pi)((0, r.pi)({}, t), { layoutId: x })
                        var S = (0, o.useContext)(p),
                            C = null,
                            k = E(t),
                            L = S.isStatic
                                ? void 0
                                : (0, P.h)(function () {
                                      if (T.hasEverUpdated) return R++
                                  }),
                            Z = h(t, S.isStatic)
                        return (
                            !S.isStatic &&
                                m.j &&
                                ((k.visualElement = b(
                                    g,
                                    Z,
                                    (0, r.pi)((0, r.pi)({}, S), t),
                                    n
                                )),
                                (function (t, e, n, r) {
                                    var i,
                                        a = e.layoutId,
                                        s = e.layout,
                                        u = e.drag,
                                        l = e.dragConstraints,
                                        c = e.layoutScroll,
                                        d = (0, o.useContext)(M)
                                    r &&
                                        n &&
                                        !(null == n ? void 0 : n.projection) &&
                                        ((n.projection = new r(
                                            t,
                                            n.getLatestValues(),
                                            null === (i = n.parent) ||
                                            void 0 === i
                                                ? void 0
                                                : i.projection
                                        )),
                                        n.projection.setOptions({
                                            layoutId: a,
                                            layout: s,
                                            alwaysMeasureLayout:
                                                Boolean(u) || (l && w(l)),
                                            visualElement: n,
                                            scheduleRender: function () {
                                                return n.scheduleRender()
                                            },
                                            animationType:
                                                "string" == typeof s
                                                    ? s
                                                    : "both",
                                            initialPromotionConfig: d,
                                            layoutScroll: c
                                        }))
                                })(
                                    L,
                                    t,
                                    k.visualElement,
                                    a || s.projectionNodeConstructor
                                ),
                                (C = (function (t, e, n) {
                                    var a = [],
                                        p = (0, o.useContext)(l)
                                    if (!e) return null
                                    "production" !== i &&
                                        n &&
                                        p.strict &&
                                        (0, u.k)(
                                            !1,
                                            "You have rendered a `motion` component within a `LazyMotion` component. This will break tree shaking. Import and render a `m` component instead."
                                        )
                                    for (var f = 0; f < d; f++) {
                                        var v = c[f],
                                            h = s[v],
                                            m = h.isEnabled,
                                            g = h.Component
                                        m(t) &&
                                            g &&
                                            a.push(
                                                o.createElement(
                                                    g,
                                                    (0, r.pi)({ key: v }, t, {
                                                        visualElement: e
                                                    })
                                                )
                                            )
                                    }
                                    return a
                                })(t, k.visualElement, e))),
                            o.createElement(
                                V,
                                {
                                    visualElement: k.visualElement,
                                    props: (0, r.pi)((0, r.pi)({}, S), t)
                                },
                                C,
                                o.createElement(
                                    f.Provider,
                                    { value: k },
                                    v(
                                        g,
                                        t,
                                        L,
                                        (function (t, e, n) {
                                            return (0, o.useCallback)(
                                                function (r) {
                                                    var o
                                                    r &&
                                                        (null ===
                                                            (o = t.mount) ||
                                                            void 0 === o ||
                                                            o.call(t, r)),
                                                        e &&
                                                            (r
                                                                ? e.mount(r)
                                                                : e.unmount()),
                                                        n &&
                                                            ("function" ==
                                                            typeof n
                                                                ? n(r)
                                                                : w(n) &&
                                                                  (n.current =
                                                                      r))
                                                },
                                                [e]
                                            )
                                        })(Z, k.visualElement, y),
                                        Z,
                                        S.isStatic,
                                        k.visualElement
                                    )
                                )
                            )
                        )
                    })
                )
            }
            function L(t) {
                function e(e, n) {
                    return void 0 === n && (n = {}), k(t(e, n))
                }
                if ("undefined" == typeof Proxy) return e
                var n = new Map()
                return new Proxy(e, {
                    get: function (t, r) {
                        return n.has(r) || n.set(r, e(r)), n.get(r)
                    }
                })
            }
            var Z = [
                "animate",
                "circle",
                "defs",
                "desc",
                "ellipse",
                "g",
                "image",
                "line",
                "filter",
                "marker",
                "mask",
                "metadata",
                "path",
                "pattern",
                "polygon",
                "polyline",
                "rect",
                "stop",
                "svg",
                "switch",
                "symbol",
                "text",
                "tspan",
                "use",
                "view"
            ]
            function j(t) {
                return (
                    "string" == typeof t &&
                    !t.includes("-") &&
                    !!(Z.indexOf(t) > -1 || /[A-Z]/.test(t))
                )
            }
            var O = {}
            var D = n(942)
            function B(t, e) {
                var n = e.layout,
                    r = e.layoutId
                return (
                    (0, D._c)(t) ||
                    (0, D.Ee)(t) ||
                    ((n || void 0 !== r) && (!!O[t] || "opacity" === t))
                )
            }
            var I = function (t) {
                    return Boolean(
                        null !== t && "object" == typeof t && t.getVelocity
                    )
                },
                F = {
                    x: "translateX",
                    y: "translateY",
                    z: "translateZ",
                    transformPerspective: "perspective"
                }
            function z(t) {
                return t.startsWith("--")
            }
            var N = function (t, e) {
                    return e && "number" == typeof t ? e.transform(t) : t
                },
                $ = n(3766)
            function U(t, e, n, r) {
                var o,
                    i = t.style,
                    a = t.vars,
                    s = t.transform,
                    u = t.transformKeys,
                    l = t.transformOrigin
                u.length = 0
                var c = !1,
                    d = !1,
                    p = !0
                for (var f in e) {
                    var v = e[f]
                    if (z(f)) a[f] = v
                    else {
                        var h = $.j[f],
                            m = N(v, h)
                        if ((0, D._c)(f)) {
                            if (((c = !0), (s[f] = m), u.push(f), !p)) continue
                            v !==
                                (null !== (o = h.default) && void 0 !== o
                                    ? o
                                    : 0) && (p = !1)
                        } else
                            (0, D.Ee)(f) ? ((l[f] = m), (d = !0)) : (i[f] = m)
                    }
                }
                c
                    ? (i.transform = (function (t, e, n, r) {
                          var o = t.transform,
                              i = t.transformKeys,
                              a = e.enableHardwareAcceleration,
                              s = void 0 === a || a,
                              u = e.allowTransformNone,
                              l = void 0 === u || u,
                              c = ""
                          i.sort(D.s3)
                          for (var d = !1, p = i.length, f = 0; f < p; f++) {
                              var v = i[f]
                              ;(c += ""
                                  .concat(F[v] || v, "(")
                                  .concat(o[v], ") ")),
                                  "z" === v && (d = !0)
                          }
                          return (
                              !d && s ? (c += "translateZ(0)") : (c = c.trim()),
                              r
                                  ? (c = r(o, n ? "" : c))
                                  : l && n && (c = "none"),
                              c
                          )
                      })(t, n, p, r))
                    : r
                    ? (i.transform = r({}, ""))
                    : !e.transform && i.transform && (i.transform = "none"),
                    d &&
                        (i.transformOrigin = (function (t) {
                            var e = t.originX,
                                n = void 0 === e ? "50%" : e,
                                r = t.originY,
                                o = void 0 === r ? "50%" : r,
                                i = t.originZ,
                                a = void 0 === i ? 0 : i
                            return "".concat(n, " ").concat(o, " ").concat(a)
                        })(l))
            }
            var W = function () {
                return {
                    style: {},
                    transform: {},
                    transformKeys: [],
                    transformOrigin: {},
                    vars: {}
                }
            }
            function H(t, e, n) {
                for (var r in e) I(e[r]) || B(r, n) || (t[r] = e[r])
            }
            function _(t, e, n) {
                var i = {}
                return (
                    H(i, t.style || {}, t),
                    Object.assign(
                        i,
                        (function (t, e, n) {
                            var i = t.transformTemplate
                            return (0, o.useMemo)(
                                function () {
                                    var t = {
                                        style: {},
                                        transform: {},
                                        transformKeys: [],
                                        transformOrigin: {},
                                        vars: {}
                                    }
                                    U(
                                        t,
                                        e,
                                        { enableHardwareAcceleration: !n },
                                        i
                                    )
                                    var o = t.vars,
                                        a = t.style
                                    return (0, r.pi)((0, r.pi)({}, o), a)
                                },
                                [e]
                            )
                        })(t, e, n)
                    ),
                    t.transformValues && (i = t.transformValues(i)),
                    i
                )
            }
            function Y(t, e, n) {
                var r = {},
                    o = _(t, e, n)
                return (
                    Boolean(t.drag) &&
                        !1 !== t.dragListener &&
                        ((r.draggable = !1),
                        (o.userSelect =
                            o.WebkitUserSelect =
                            o.WebkitTouchCallout =
                                "none"),
                        (o.touchAction =
                            !0 === t.drag
                                ? "none"
                                : "pan-".concat("x" === t.drag ? "y" : "x"))),
                    (r.style = o),
                    r
                )
            }
            var q = new Set([
                "initial",
                "animate",
                "exit",
                "style",
                "variants",
                "transition",
                "transformTemplate",
                "transformValues",
                "custom",
                "inherit",
                "layout",
                "layoutId",
                "layoutDependency",
                "onLayoutAnimationStart",
                "onLayoutAnimationComplete",
                "onLayoutMeasure",
                "onBeforeLayoutMeasure",
                "onAnimationStart",
                "onAnimationComplete",
                "onUpdate",
                "onDragStart",
                "onDrag",
                "onDragEnd",
                "onMeasureDragConstraints",
                "onDirectionLock",
                "onDragTransitionEnd",
                "drag",
                "dragControls",
                "dragListener",
                "dragConstraints",
                "dragDirectionLock",
                "dragSnapToOrigin",
                "_dragX",
                "_dragY",
                "dragElastic",
                "dragMomentum",
                "dragPropagation",
                "dragTransition",
                "whileDrag",
                "onPan",
                "onPanStart",
                "onPanEnd",
                "onPanSessionStart",
                "onTap",
                "onTapStart",
                "onTapCancel",
                "onHoverStart",
                "onHoverEnd",
                "whileFocus",
                "whileTap",
                "whileHover",
                "whileInView",
                "onViewportEnter",
                "onViewportLeave",
                "viewport",
                "layoutScroll"
            ])
            function X(t) {
                return q.has(t)
            }
            var G,
                K = function (t) {
                    return !X(t)
                }
            try {
                ;(G = require("@emotion/is-prop-valid").default) &&
                    (K = function (t) {
                        return t.startsWith("on") ? !X(t) : G(t)
                    })
            } catch ($r) {}
            var J = n(6939)
            function Q(t, e, n) {
                return "string" == typeof t ? t : J.px.transform(e + n * t)
            }
            var tt = { offset: "stroke-dashoffset", array: "stroke-dasharray" },
                et = { offset: "strokeDashoffset", array: "strokeDasharray" }
            function nt(t, e, n, o) {
                var i = e.attrX,
                    a = e.attrY,
                    s = e.originX,
                    u = e.originY,
                    l = e.pathLength,
                    c = e.pathSpacing,
                    d = void 0 === c ? 1 : c,
                    p = e.pathOffset,
                    f = void 0 === p ? 0 : p
                U(
                    t,
                    (0, r._T)(e, [
                        "attrX",
                        "attrY",
                        "originX",
                        "originY",
                        "pathLength",
                        "pathSpacing",
                        "pathOffset"
                    ]),
                    n,
                    o
                ),
                    (t.attrs = t.style),
                    (t.style = {})
                var v = t.attrs,
                    h = t.style,
                    m = t.dimensions
                v.transform &&
                    (m && (h.transform = v.transform), delete v.transform),
                    m &&
                        (void 0 !== s || void 0 !== u || h.transform) &&
                        (h.transformOrigin = (function (t, e, n) {
                            var r = Q(e, t.x, t.width),
                                o = Q(n, t.y, t.height)
                            return "".concat(r, " ").concat(o)
                        })(m, void 0 !== s ? s : 0.5, void 0 !== u ? u : 0.5)),
                    void 0 !== i && (v.x = i),
                    void 0 !== a && (v.y = a),
                    void 0 !== l &&
                        (function (t, e, n, r, o) {
                            void 0 === n && (n = 1),
                                void 0 === r && (r = 0),
                                void 0 === o && (o = !0),
                                (t.pathLength = 1)
                            var i = o ? tt : et
                            t[i.offset] = J.px.transform(-r)
                            var a = J.px.transform(e),
                                s = J.px.transform(n)
                            t[i.array] = "".concat(a, " ").concat(s)
                        })(v, l, d, f, !1)
            }
            var rt = function () {
                return (0, r.pi)(
                    (0, r.pi)(
                        {},
                        {
                            style: {},
                            transform: {},
                            transformKeys: [],
                            transformOrigin: {},
                            vars: {}
                        }
                    ),
                    { attrs: {} }
                )
            }
            function ot(t, e) {
                var n = (0, o.useMemo)(
                    function () {
                        var n = rt()
                        return (
                            nt(
                                n,
                                e,
                                { enableHardwareAcceleration: !1 },
                                t.transformTemplate
                            ),
                            (0, r.pi)((0, r.pi)({}, n.attrs), {
                                style: (0, r.pi)({}, n.style)
                            })
                        )
                    },
                    [e]
                )
                if (t.style) {
                    var i = {}
                    H(i, t.style, t),
                        (n.style = (0, r.pi)((0, r.pi)({}, i), n.style))
                }
                return n
            }
            function it(t) {
                void 0 === t && (t = !1)
                return function (e, n, i, a, s, u) {
                    var l = s.latestValues,
                        c = (j(e) ? ot : Y)(n, l, u),
                        d = (function (t, e, n) {
                            var r = {}
                            for (var o in t)
                                (K(o) ||
                                    (!0 === n && X(o)) ||
                                    (!e && !X(o)) ||
                                    (t.draggable && o.startsWith("onDrag"))) &&
                                    (r[o] = t[o])
                            return r
                        })(n, "string" == typeof e, t),
                        p = (0, r.pi)((0, r.pi)((0, r.pi)({}, d), c), {
                            ref: a
                        })
                    return (
                        i && (p["data-projection-id"] = i),
                        (0, o.createElement)(e, p)
                    )
                }
            }
            var at = /([a-z])([A-Z])/g,
                st = function (t) {
                    return t.replace(at, "$1-$2").toLowerCase()
                }
            function ut(t, e, n, r) {
                var o = e.style,
                    i = e.vars
                for (var a in (Object.assign(
                    t.style,
                    o,
                    r && r.getProjectionStyles(n)
                ),
                i))
                    t.style.setProperty(a, i[a])
            }
            var lt = new Set([
                "baseFrequency",
                "diffuseConstant",
                "kernelMatrix",
                "kernelUnitLength",
                "keySplines",
                "keyTimes",
                "limitingConeAngle",
                "markerHeight",
                "markerWidth",
                "numOctaves",
                "targetX",
                "targetY",
                "surfaceScale",
                "specularConstant",
                "specularExponent",
                "stdDeviation",
                "tableValues",
                "viewBox",
                "gradientTransform",
                "pathLength"
            ])
            function ct(t, e, n, r) {
                for (var o in (ut(t, e, void 0, r), e.attrs))
                    t.setAttribute(lt.has(o) ? o : st(o), e.attrs[o])
            }
            function dt(t) {
                var e = t.style,
                    n = {}
                for (var r in e) (I(e[r]) || B(r, t)) && (n[r] = e[r])
                return n
            }
            function pt(t) {
                var e = dt(t)
                for (var n in t) {
                    if (I(t[n]))
                        e[
                            "x" === n || "y" === n
                                ? "attr" + n.toUpperCase()
                                : n
                        ] = t[n]
                }
                return e
            }
            function ft(t) {
                return "object" == typeof t && "function" == typeof t.start
            }
            var vt = n(7125)
            function ht(t) {
                var e = I(t) ? t.get() : t
                return (0, vt.p)(e) ? e.toValue() : e
            }
            function mt(t, e, n, r) {
                var o = t.scrapeMotionValuesFromProps,
                    i = t.createRenderState,
                    a = t.onMount,
                    s = { latestValues: yt(e, n, r, o), renderState: i() }
                return (
                    a &&
                        (s.mount = function (t) {
                            return a(e, t, s)
                        }),
                    s
                )
            }
            var gt = function (t) {
                return function (e, n) {
                    var r = (0, o.useContext)(f),
                        i = (0, o.useContext)(v)
                    return n
                        ? mt(t, e, r, i)
                        : (0, P.h)(function () {
                              return mt(t, e, r, i)
                          })
                }
            }
            function yt(t, e, n, o) {
                var i = {},
                    a = !1 === (null == n ? void 0 : n.initial),
                    s = o(t)
                for (var u in s) i[u] = ht(s[u])
                var l = t.initial,
                    c = t.animate,
                    d = (0, S.O6)(t),
                    p = (0, S.e8)(t)
                e &&
                    p &&
                    !d &&
                    !1 !== t.inherit &&
                    (null != l || (l = e.initial), null != c || (c = e.animate))
                var f = a || !1 === l,
                    v = f ? c : l
                v &&
                    "boolean" != typeof v &&
                    !ft(v) &&
                    (Array.isArray(v) ? v : [v]).forEach(function (e) {
                        var n = (0, S.oQ)(t, e)
                        if (n) {
                            var o = n.transitionEnd
                            n.transition
                            var a = (0, r._T)(n, [
                                "transitionEnd",
                                "transition"
                            ])
                            for (var s in a) {
                                var u = a[s]
                                if (Array.isArray(u))
                                    u = u[f ? u.length - 1 : 0]
                                null !== u && (i[s] = u)
                            }
                            for (var s in o) i[s] = o[s]
                        }
                    })
                return i
            }
            var xt,
                bt = {
                    useVisualState: gt({
                        scrapeMotionValuesFromProps: pt,
                        createRenderState: rt,
                        onMount: function (t, e, n) {
                            var r = n.renderState,
                                o = n.latestValues
                            try {
                                r.dimensions =
                                    "function" == typeof e.getBBox
                                        ? e.getBBox()
                                        : e.getBoundingClientRect()
                            } catch (i) {
                                r.dimensions = {
                                    x: 0,
                                    y: 0,
                                    width: 0,
                                    height: 0
                                }
                            }
                            nt(
                                r,
                                o,
                                { enableHardwareAcceleration: !1 },
                                t.transformTemplate
                            ),
                                ct(e, r)
                        }
                    })
                },
                wt = {
                    useVisualState: gt({
                        scrapeMotionValuesFromProps: dt,
                        createRenderState: W
                    })
                }
            function St(t, e, n, r) {
                return (
                    void 0 === r && (r = { passive: !0 }),
                    t.addEventListener(e, n, r),
                    function () {
                        return t.removeEventListener(e, n)
                    }
                )
            }
            function Et(t, e, n, r) {
                ;(0, o.useEffect)(
                    function () {
                        var o = t.current
                        if (n && o) return St(o, e, n, r)
                    },
                    [t, e, n, r]
                )
            }
            function Ct(t) {
                return "undefined" != typeof PointerEvent &&
                    t instanceof PointerEvent
                    ? !("mouse" !== t.pointerType)
                    : t instanceof MouseEvent
            }
            function Pt(t) {
                return !!t.touches
            }
            !(function (t) {
                ;(t.Animate = "animate"),
                    (t.Hover = "whileHover"),
                    (t.Tap = "whileTap"),
                    (t.Drag = "whileDrag"),
                    (t.Focus = "whileFocus"),
                    (t.InView = "whileInView"),
                    (t.Exit = "exit")
            })(xt || (xt = {}))
            var Tt = { pageX: 0, pageY: 0 }
            function Rt(t, e) {
                void 0 === e && (e = "page")
                var n = t.touches[0] || t.changedTouches[0] || Tt
                return { x: n[e + "X"], y: n[e + "Y"] }
            }
            function At(t, e) {
                return (
                    void 0 === e && (e = "page"),
                    { x: t[e + "X"], y: t[e + "Y"] }
                )
            }
            function Mt(t, e) {
                return (
                    void 0 === e && (e = "page"),
                    { point: Pt(t) ? Rt(t, e) : At(t, e) }
                )
            }
            var Vt = function (t, e) {
                    void 0 === e && (e = !1)
                    var n,
                        r = function (e) {
                            return t(e, Mt(e))
                        }
                    return e
                        ? ((n = r),
                          function (t) {
                              var e = t instanceof MouseEvent
                              ;(!e || (e && 0 === t.button)) && n(t)
                          })
                        : r
                },
                kt = {
                    pointerdown: "mousedown",
                    pointermove: "mousemove",
                    pointerup: "mouseup",
                    pointercancel: "mousecancel",
                    pointerover: "mouseover",
                    pointerout: "mouseout",
                    pointerenter: "mouseenter",
                    pointerleave: "mouseleave"
                },
                Lt = {
                    pointerdown: "touchstart",
                    pointermove: "touchmove",
                    pointerup: "touchend",
                    pointercancel: "touchcancel"
                }
            function Zt(t) {
                return m.j && null === window.onpointerdown
                    ? t
                    : m.j && null === window.ontouchstart
                    ? Lt[t]
                    : m.j && null === window.onmousedown
                    ? kt[t]
                    : t
            }
            function jt(t, e, n, r) {
                return St(t, Zt(e), Vt(n, "pointerdown" === e), r)
            }
            function Ot(t, e, n, r) {
                return Et(t, Zt(e), n && Vt(n, "pointerdown" === e), r)
            }
            function Dt(t) {
                var e = null
                return function () {
                    return (
                        null === e &&
                        ((e = t),
                        function () {
                            e = null
                        })
                    )
                }
            }
            var Bt = Dt("dragHorizontal"),
                It = Dt("dragVertical")
            function Ft(t) {
                var e = !1
                if ("y" === t) e = It()
                else if ("x" === t) e = Bt()
                else {
                    var n = Bt(),
                        r = It()
                    n && r
                        ? (e = function () {
                              n(), r()
                          })
                        : (n && n(), r && r())
                }
                return e
            }
            function zt() {
                var t = Ft(!0)
                return !t || (t(), !1)
            }
            function Nt(t, e, n) {
                return function (r, o) {
                    var i
                    Ct(r) &&
                        !zt() &&
                        (null === (i = t.animationState) ||
                            void 0 === i ||
                            i.setActive(xt.Hover, e),
                        null == n || n(r, o))
                }
            }
            var $t = function (t, e) {
                return !!e && (t === e || $t(t, e.parentElement))
            }
            function Ut(t) {
                return (0, o.useEffect)(function () {
                    return function () {
                        return t()
                    }
                }, [])
            }
            var Wt = n(2379)
            var Ht = new Set()
            var _t = new WeakMap(),
                Yt = new WeakMap(),
                qt = function (t) {
                    var e
                    null === (e = _t.get(t.target)) || void 0 === e || e(t)
                },
                Xt = function (t) {
                    t.forEach(qt)
                }
            function Gt(t, e, n) {
                var o = (function (t) {
                    var e = t.root,
                        n = (0, r._T)(t, ["root"]),
                        o = e || document
                    Yt.has(o) || Yt.set(o, {})
                    var i = Yt.get(o),
                        a = JSON.stringify(n)
                    return (
                        i[a] ||
                            (i[a] = new IntersectionObserver(
                                Xt,
                                (0, r.pi)({ root: e }, n)
                            )),
                        i[a]
                    )
                })(e)
                return (
                    _t.set(t, n),
                    o.observe(t),
                    function () {
                        _t.delete(t), o.unobserve(t)
                    }
                )
            }
            var Kt = { some: 0, all: 1 }
            function Jt(t, e, n, r) {
                var i = r.root,
                    a = r.margin,
                    s = r.amount,
                    u = void 0 === s ? "some" : s,
                    l = r.once
                ;(0, o.useEffect)(
                    function () {
                        if (t) {
                            var r = {
                                root: null == i ? void 0 : i.current,
                                rootMargin: a,
                                threshold: "number" == typeof u ? u : Kt[u]
                            }
                            return Gt(n.getInstance(), r, function (t) {
                                var r,
                                    o = t.isIntersecting
                                if (
                                    e.isInView !== o &&
                                    ((e.isInView = o),
                                    !l || o || !e.hasEnteredView)
                                ) {
                                    o && (e.hasEnteredView = !0),
                                        null === (r = n.animationState) ||
                                            void 0 === r ||
                                            r.setActive(xt.InView, o)
                                    var i = n.getProps(),
                                        a = o
                                            ? i.onViewportEnter
                                            : i.onViewportLeave
                                    null == a || a(t)
                                }
                            })
                        }
                    },
                    [t, i, a, u]
                )
            }
            function Qt(t, e, n, r) {
                var a = r.fallback,
                    s = void 0 === a || a
                ;(0, o.useEffect)(
                    function () {
                        var r, o
                        t &&
                            s &&
                            ("production" !== i &&
                                ((r =
                                    "IntersectionObserver not available on this device. whileInView animations will trigger on mount."),
                                !1 ||
                                    Ht.has(r) ||
                                    (console.warn(r),
                                    o && console.warn(o),
                                    Ht.add(r))),
                            requestAnimationFrame(function () {
                                var t
                                e.hasEnteredView = !0
                                var r = n.getProps().onViewportEnter
                                null == r || r(null),
                                    null === (t = n.animationState) ||
                                        void 0 === t ||
                                        t.setActive(xt.InView, !0)
                            }))
                    },
                    [t]
                )
            }
            var te = function (t) {
                    return function (e) {
                        return t(e), null
                    }
                },
                ee = {
                    inView: te(function (t) {
                        var e = t.visualElement,
                            n = t.whileInView,
                            r = t.onViewportEnter,
                            i = t.onViewportLeave,
                            a = t.viewport,
                            s = void 0 === a ? {} : a,
                            u = (0, o.useRef)({
                                hasEnteredView: !1,
                                isInView: !1
                            }),
                            l = Boolean(n || r || i)
                        s.once && u.current.hasEnteredView && (l = !1),
                            ("undefined" == typeof IntersectionObserver
                                ? Qt
                                : Jt)(l, u.current, e, s)
                    }),
                    tap: te(function (t) {
                        var e = t.onTap,
                            n = t.onTapStart,
                            r = t.onTapCancel,
                            i = t.whileTap,
                            a = t.visualElement,
                            s = e || n || r || i,
                            u = (0, o.useRef)(!1),
                            l = (0, o.useRef)(null),
                            c = { passive: !(n || e || r || h) }
                        function d() {
                            var t
                            null === (t = l.current) ||
                                void 0 === t ||
                                t.call(l),
                                (l.current = null)
                        }
                        function p() {
                            var t
                            return (
                                d(),
                                (u.current = !1),
                                null === (t = a.animationState) ||
                                    void 0 === t ||
                                    t.setActive(xt.Tap, !1),
                                !zt()
                            )
                        }
                        function f(t, n) {
                            p() &&
                                ($t(a.getInstance(), t.target)
                                    ? null == e || e(t, n)
                                    : null == r || r(t, n))
                        }
                        function v(t, e) {
                            p() && (null == r || r(t, e))
                        }
                        function h(t, e) {
                            var r
                            d(),
                                u.current ||
                                    ((u.current = !0),
                                    (l.current = (0, Wt.z)(
                                        jt(window, "pointerup", f, c),
                                        jt(window, "pointercancel", v, c)
                                    )),
                                    null === (r = a.animationState) ||
                                        void 0 === r ||
                                        r.setActive(xt.Tap, !0),
                                    null == n || n(t, e))
                        }
                        Ot(a, "pointerdown", s ? h : void 0, c), Ut(d)
                    }),
                    focus: te(function (t) {
                        var e = t.whileFocus,
                            n = t.visualElement
                        Et(
                            n,
                            "focus",
                            e
                                ? function () {
                                      var t
                                      null === (t = n.animationState) ||
                                          void 0 === t ||
                                          t.setActive(xt.Focus, !0)
                                  }
                                : void 0
                        ),
                            Et(
                                n,
                                "blur",
                                e
                                    ? function () {
                                          var t
                                          null === (t = n.animationState) ||
                                              void 0 === t ||
                                              t.setActive(xt.Focus, !1)
                                      }
                                    : void 0
                            )
                    }),
                    hover: te(function (t) {
                        var e = t.onHoverStart,
                            n = t.onHoverEnd,
                            r = t.whileHover,
                            o = t.visualElement
                        Ot(o, "pointerenter", e || r ? Nt(o, !0, e) : void 0, {
                            passive: !e
                        }),
                            Ot(
                                o,
                                "pointerleave",
                                n || r ? Nt(o, !1, n) : void 0,
                                { passive: !n }
                            )
                    })
                },
                ne = 0,
                re = function () {
                    return ne++
                }
            function oe() {
                var t = (0, o.useContext)(v)
                if (null === t) return [!0, null]
                var e = t.isPresent,
                    n = t.onExitComplete,
                    r = t.register,
                    i = (0, P.h)(re)
                ;(0, o.useEffect)(function () {
                    return r(i)
                }, [])
                return !e && n
                    ? [
                          !1,
                          function () {
                              return null == n ? void 0 : n(i)
                          }
                      ]
                    : [!0]
            }
            var ie = n(227)
            function ae(t, e) {
                if (!Array.isArray(e)) return !1
                var n = e.length
                if (n !== t.length) return !1
                for (var r = 0; r < n; r++) if (e[r] !== t[r]) return !1
                return !0
            }
            var se = n(6914),
                ue = [
                    xt.Animate,
                    xt.InView,
                    xt.Focus,
                    xt.Hover,
                    xt.Tap,
                    xt.Drag,
                    xt.Exit
                ],
                le = (0, r.ev)([], (0, r.CR)(ue), !1).reverse(),
                ce = ue.length
            function de(t) {
                var e,
                    n = (function (t) {
                        return function (e) {
                            return Promise.all(
                                e.map(function (e) {
                                    var n = e.animation,
                                        r = e.options
                                    return (0, se.d5)(t, n, r)
                                })
                            )
                        }
                    })(t),
                    o =
                        (((e = {})[xt.Animate] = pe(!0)),
                        (e[xt.InView] = pe()),
                        (e[xt.Hover] = pe()),
                        (e[xt.Tap] = pe()),
                        (e[xt.Drag] = pe()),
                        (e[xt.Focus] = pe()),
                        (e[xt.Exit] = pe()),
                        e),
                    i = {},
                    a = !0,
                    s = function (e, n) {
                        var o = (0, S.x5)(t, n)
                        if (o) {
                            o.transition
                            var i = o.transitionEnd,
                                a = (0, r._T)(o, [
                                    "transition",
                                    "transitionEnd"
                                ])
                            e = (0, r.pi)((0, r.pi)((0, r.pi)({}, e), a), i)
                        }
                        return e
                    }
                function u(e, u) {
                    for (
                        var l,
                            c = t.getProps(),
                            d = t.getVariantContext(!0) || {},
                            p = [],
                            f = new Set(),
                            v = {},
                            h = 1 / 0,
                            m = function (n) {
                                var i = le[n],
                                    m = o[i],
                                    g =
                                        null !== (l = c[i]) && void 0 !== l
                                            ? l
                                            : d[i],
                                    y = (0, S.$L)(g),
                                    x = i === u ? m.isActive : null
                                !1 === x && (h = n)
                                var b = g === d[i] && g !== c[i] && y
                                if (
                                    (b &&
                                        a &&
                                        t.manuallyAnimateOnMount &&
                                        (b = !1),
                                    (m.protectedKeys = (0, r.pi)({}, v)),
                                    (!m.isActive && null === x) ||
                                        (!g && !m.prevProp) ||
                                        ft(g) ||
                                        "boolean" == typeof g)
                                )
                                    return "continue"
                                var w = (function (t, e) {
                                        if ("string" == typeof e) return e !== t
                                        if ((0, S.A0)(e)) return !ae(e, t)
                                        return !1
                                    })(m.prevProp, g),
                                    E =
                                        w ||
                                        (i === u && m.isActive && !b && y) ||
                                        (n > h && y),
                                    C = Array.isArray(g) ? g : [g],
                                    P = C.reduce(s, {})
                                !1 === x && (P = {})
                                var T = m.prevResolvedValues,
                                    R = void 0 === T ? {} : T,
                                    A = (0, r.pi)((0, r.pi)({}, R), P),
                                    M = function (t) {
                                        ;(E = !0),
                                            f.delete(t),
                                            (m.needsAnimating[t] = !0)
                                    }
                                for (var V in A) {
                                    var k = P[V],
                                        L = R[V]
                                    v.hasOwnProperty(V) ||
                                        (k !== L
                                            ? (0, ie.C)(k) && (0, ie.C)(L)
                                                ? !ae(k, L) || w
                                                    ? M(V)
                                                    : (m.protectedKeys[V] = !0)
                                                : void 0 !== k
                                                ? M(V)
                                                : f.add(V)
                                            : void 0 !== k && f.has(V)
                                            ? M(V)
                                            : (m.protectedKeys[V] = !0))
                                }
                                ;(m.prevProp = g),
                                    (m.prevResolvedValues = P),
                                    m.isActive &&
                                        (v = (0, r.pi)((0, r.pi)({}, v), P)),
                                    a && t.blockInitialAnimation && (E = !1),
                                    E &&
                                        !b &&
                                        p.push.apply(
                                            p,
                                            (0, r.ev)(
                                                [],
                                                (0, r.CR)(
                                                    C.map(function (t) {
                                                        return {
                                                            animation: t,
                                                            options: (0, r.pi)(
                                                                { type: i },
                                                                e
                                                            )
                                                        }
                                                    })
                                                ),
                                                !1
                                            )
                                        )
                            },
                            g = 0;
                        g < ce;
                        g++
                    )
                        m(g)
                    if (((i = (0, r.pi)({}, v)), f.size)) {
                        var y = {}
                        f.forEach(function (e) {
                            var n = t.getBaseTarget(e)
                            void 0 !== n && (y[e] = n)
                        }),
                            p.push({ animation: y })
                    }
                    var x = Boolean(p.length)
                    return (
                        a &&
                            !1 === c.initial &&
                            !t.manuallyAnimateOnMount &&
                            (x = !1),
                        (a = !1),
                        x ? n(p) : Promise.resolve()
                    )
                }
                return {
                    isAnimated: function (t) {
                        return void 0 !== i[t]
                    },
                    animateChanges: u,
                    setActive: function (e, n, r) {
                        var i
                        if (o[e].isActive === n) return Promise.resolve()
                        null === (i = t.variantChildren) ||
                            void 0 === i ||
                            i.forEach(function (t) {
                                var r
                                return null === (r = t.animationState) ||
                                    void 0 === r
                                    ? void 0
                                    : r.setActive(e, n)
                            }),
                            (o[e].isActive = n)
                        var a = u(r, e)
                        for (var s in o) o[s].protectedKeys = {}
                        return a
                    },
                    setAnimateFunction: function (e) {
                        n = e(t)
                    },
                    getState: function () {
                        return o
                    }
                }
            }
            function pe(t) {
                return (
                    void 0 === t && (t = !1),
                    {
                        isActive: t,
                        protectedKeys: {},
                        needsAnimating: {},
                        prevResolvedValues: {}
                    }
                )
            }
            var fe = {
                    animation: te(function (t) {
                        var e = t.visualElement,
                            n = t.animate
                        e.animationState || (e.animationState = de(e)),
                            ft(n) &&
                                (0, o.useEffect)(
                                    function () {
                                        return n.subscribe(e)
                                    },
                                    [n]
                                )
                    }),
                    exit: te(function (t) {
                        var e = t.custom,
                            n = t.visualElement,
                            i = (0, r.CR)(oe(), 2),
                            a = i[0],
                            s = i[1],
                            u = (0, o.useContext)(v)
                        ;(0, o.useEffect)(
                            function () {
                                var t, r
                                n.isPresent = a
                                var o =
                                    null === (t = n.animationState) ||
                                    void 0 === t
                                        ? void 0
                                        : t.setActive(xt.Exit, !a, {
                                              custom:
                                                  null !==
                                                      (r =
                                                          null == u
                                                              ? void 0
                                                              : u.custom) &&
                                                  void 0 !== r
                                                      ? r
                                                      : e
                                          })
                                !a && (null == o || o.then(s))
                            },
                            [a]
                        )
                    })
                },
                ve = n(931),
                he = n(9947)
            const me = (t) => t.hasOwnProperty("x") && t.hasOwnProperty("y"),
                ge = (t) => me(t) && t.hasOwnProperty("z")
            var ye = n(179)
            const xe = (t, e) => Math.abs(t - e)
            function be(t, e) {
                if ((0, ye.e)(t) && (0, ye.e)(e)) return xe(t, e)
                if (me(t) && me(e)) {
                    const n = xe(t.x, e.x),
                        r = xe(t.y, e.y),
                        o = ge(t) && ge(e) ? xe(t.z, e.z) : 0
                    return Math.sqrt(
                        Math.pow(n, 2) + Math.pow(r, 2) + Math.pow(o, 2)
                    )
                }
            }
            var we = (function () {
                function t(t, e, n) {
                    var o = this,
                        i = (void 0 === n ? {} : n).transformPagePoint
                    if (
                        ((this.startEvent = null),
                        (this.lastMoveEvent = null),
                        (this.lastMoveEventInfo = null),
                        (this.handlers = {}),
                        (this.updatePoint = function () {
                            if (o.lastMoveEvent && o.lastMoveEventInfo) {
                                var t = Ce(o.lastMoveEventInfo, o.history),
                                    e = null !== o.startEvent,
                                    n = be(t.offset, { x: 0, y: 0 }) >= 3
                                if (e || n) {
                                    var i = t.point,
                                        a = (0, ve.$B)().timestamp
                                    o.history.push(
                                        (0, r.pi)((0, r.pi)({}, i), {
                                            timestamp: a
                                        })
                                    )
                                    var s = o.handlers,
                                        u = s.onStart,
                                        l = s.onMove
                                    e ||
                                        (u && u(o.lastMoveEvent, t),
                                        (o.startEvent = o.lastMoveEvent)),
                                        l && l(o.lastMoveEvent, t)
                                }
                            }
                        }),
                        (this.handlePointerMove = function (t, e) {
                            ;(o.lastMoveEvent = t),
                                (o.lastMoveEventInfo = Se(
                                    e,
                                    o.transformPagePoint
                                )),
                                Ct(t) && 0 === t.buttons
                                    ? o.handlePointerUp(t, e)
                                    : ve.ZP.update(o.updatePoint, !0)
                        }),
                        (this.handlePointerUp = function (t, e) {
                            o.end()
                            var n = o.handlers,
                                r = n.onEnd,
                                i = n.onSessionEnd,
                                a = Ce(Se(e, o.transformPagePoint), o.history)
                            o.startEvent && r && r(t, a), i && i(t, a)
                        }),
                        !(Pt(t) && t.touches.length > 1))
                    ) {
                        ;(this.handlers = e), (this.transformPagePoint = i)
                        var a = Se(Mt(t), this.transformPagePoint),
                            s = a.point,
                            u = (0, ve.$B)().timestamp
                        this.history = [
                            (0, r.pi)((0, r.pi)({}, s), { timestamp: u })
                        ]
                        var l = e.onSessionStart
                        l && l(t, Ce(a, this.history)),
                            (this.removeListeners = (0, Wt.z)(
                                jt(
                                    window,
                                    "pointermove",
                                    this.handlePointerMove
                                ),
                                jt(window, "pointerup", this.handlePointerUp),
                                jt(
                                    window,
                                    "pointercancel",
                                    this.handlePointerUp
                                )
                            ))
                    }
                }
                return (
                    (t.prototype.updateHandlers = function (t) {
                        this.handlers = t
                    }),
                    (t.prototype.end = function () {
                        this.removeListeners && this.removeListeners(),
                            ve.qY.update(this.updatePoint)
                    }),
                    t
                )
            })()
            function Se(t, e) {
                return e ? { point: e(t.point) } : t
            }
            function Ee(t, e) {
                return { x: t.x - e.x, y: t.y - e.y }
            }
            function Ce(t, e) {
                var n = t.point
                return {
                    point: n,
                    delta: Ee(n, Te(e)),
                    offset: Ee(n, Pe(e)),
                    velocity: Re(e, 0.1)
                }
            }
            function Pe(t) {
                return t[0]
            }
            function Te(t) {
                return t[t.length - 1]
            }
            function Re(t, e) {
                if (t.length < 2) return { x: 0, y: 0 }
                for (
                    var n = t.length - 1, r = null, o = Te(t);
                    n >= 0 &&
                    ((r = t[n]), !(o.timestamp - r.timestamp > (0, he.w)(e)));

                )
                    n--
                if (!r) return { x: 0, y: 0 }
                var i = (o.timestamp - r.timestamp) / 1e3
                if (0 === i) return { x: 0, y: 0 }
                var a = { x: (o.x - r.x) / i, y: (o.y - r.y) / i }
                return a.x === 1 / 0 && (a.x = 0), a.y === 1 / 0 && (a.y = 0), a
            }
            var Ae = n(9552),
                Me = n(1759),
                Ve = n(6179)
            function ke(t) {
                return t.max - t.min
            }
            function Le(t, e, n) {
                return (
                    void 0 === e && (e = 0),
                    void 0 === n && (n = 0.01),
                    be(t, e) < n
                )
            }
            function Ze(t, e, n, r) {
                void 0 === r && (r = 0.5),
                    (t.origin = r),
                    (t.originPoint = (0, Ae.C)(e.min, e.max, t.origin)),
                    (t.scale = ke(n) / ke(e)),
                    (Le(t.scale, 1, 1e-4) || isNaN(t.scale)) && (t.scale = 1),
                    (t.translate =
                        (0, Ae.C)(n.min, n.max, t.origin) - t.originPoint),
                    (Le(t.translate) || isNaN(t.translate)) && (t.translate = 0)
            }
            function je(t, e, n, r) {
                Ze(t.x, e.x, n.x, null == r ? void 0 : r.originX),
                    Ze(t.y, e.y, n.y, null == r ? void 0 : r.originY)
            }
            function Oe(t, e, n) {
                ;(t.min = n.min + e.min), (t.max = t.min + ke(e))
            }
            function De(t, e, n) {
                ;(t.min = e.min - n.min), (t.max = t.min + ke(e))
            }
            function Be(t, e, n) {
                De(t.x, e.x, n.x), De(t.y, e.y, n.y)
            }
            function Ie(t, e, n) {
                return {
                    min: void 0 !== e ? t.min + e : void 0,
                    max: void 0 !== n ? t.max + n - (t.max - t.min) : void 0
                }
            }
            function Fe(t, e) {
                var n,
                    o = e.min - t.min,
                    i = e.max - t.max
                return (
                    e.max - e.min < t.max - t.min &&
                        ((o = (n = (0, r.CR)([i, o], 2))[0]), (i = n[1])),
                    { min: o, max: i }
                )
            }
            var ze = 0.35
            function Ne(t, e, n) {
                return { min: $e(t, e), max: $e(t, n) }
            }
            function $e(t, e) {
                var n
                return "number" == typeof t
                    ? t
                    : null !== (n = t[e]) && void 0 !== n
                    ? n
                    : 0
            }
            function Ue(t) {
                return [t("x"), t("y")]
            }
            function We(t) {
                var e = t.top
                return {
                    x: { min: t.left, max: t.right },
                    y: { min: e, max: t.bottom }
                }
            }
            function He(t) {
                return void 0 === t || 1 === t
            }
            function _e(t) {
                var e = t.scale,
                    n = t.scaleX,
                    r = t.scaleY
                return !He(e) || !He(n) || !He(r)
            }
            function Ye(t) {
                return (
                    _e(t) ||
                    qe(t.x) ||
                    qe(t.y) ||
                    t.z ||
                    t.rotate ||
                    t.rotateX ||
                    t.rotateY
                )
            }
            function qe(t) {
                return t && "0%" !== t
            }
            function Xe(t, e, n) {
                return n + e * (t - n)
            }
            function Ge(t, e, n, r, o) {
                return void 0 !== o && (t = Xe(t, o, r)), Xe(t, n, r) + e
            }
            function Ke(t, e, n, r, o) {
                void 0 === e && (e = 0),
                    void 0 === n && (n = 1),
                    (t.min = Ge(t.min, e, n, r, o)),
                    (t.max = Ge(t.max, e, n, r, o))
            }
            function Je(t, e) {
                var n = e.x,
                    r = e.y
                Ke(t.x, n.translate, n.scale, n.originPoint),
                    Ke(t.y, r.translate, r.scale, r.originPoint)
            }
            function Qe(t, e) {
                ;(t.min = t.min + e), (t.max = t.max + e)
            }
            function tn(t, e, n) {
                var o = (0, r.CR)(n, 3),
                    i = o[0],
                    a = o[1],
                    s = o[2],
                    u = void 0 !== e[s] ? e[s] : 0.5,
                    l = (0, Ae.C)(t.min, t.max, u)
                Ke(t, e[i], e[a], l, e.scale)
            }
            var en = ["x", "scaleX", "originX"],
                nn = ["y", "scaleY", "originY"]
            function rn(t, e) {
                tn(t.x, e, en), tn(t.y, e, nn)
            }
            function on(t, e) {
                return We(
                    (function (t, e) {
                        if (!e) return t
                        var n = e({ x: t.left, y: t.top }),
                            r = e({ x: t.right, y: t.bottom })
                        return { top: n.y, left: n.x, bottom: r.y, right: r.x }
                    })(t.getBoundingClientRect(), e)
                )
            }
            var an = n(5638),
                sn = new WeakMap(),
                un = (function () {
                    function t(t) {
                        ;(this.openGlobalLock = null),
                            (this.isDragging = !1),
                            (this.currentDirection = null),
                            (this.originPoint = { x: 0, y: 0 }),
                            (this.constraints = !1),
                            (this.hasMutatedConstraints = !1),
                            (this.elastic = {
                                x: { min: 0, max: 0 },
                                y: { min: 0, max: 0 }
                            }),
                            (this.visualElement = t)
                    }
                    return (
                        (t.prototype.start = function (t, e) {
                            var n = this,
                                r = (void 0 === e ? {} : e).snapToCursor,
                                o = void 0 !== r && r
                            if (!1 !== this.visualElement.isPresent) {
                                this.panSession = new we(
                                    t,
                                    {
                                        onSessionStart: function (t) {
                                            n.stopAnimation(),
                                                o &&
                                                    n.snapToCursor(
                                                        Mt(t, "page").point
                                                    )
                                        },
                                        onStart: function (t, e) {
                                            var r,
                                                o = n.getProps(),
                                                i = o.drag,
                                                a = o.dragPropagation,
                                                s = o.onDragStart
                                            ;(!i ||
                                                a ||
                                                (n.openGlobalLock &&
                                                    n.openGlobalLock(),
                                                (n.openGlobalLock = Ft(i)),
                                                n.openGlobalLock)) &&
                                                ((n.isDragging = !0),
                                                (n.currentDirection = null),
                                                n.resolveConstraints(),
                                                n.visualElement.projection &&
                                                    ((n.visualElement.projection.isAnimationBlocked =
                                                        !0),
                                                    (n.visualElement.projection.target =
                                                        void 0)),
                                                Ue(function (t) {
                                                    var e,
                                                        r,
                                                        o =
                                                            n
                                                                .getAxisMotionValue(
                                                                    t
                                                                )
                                                                .get() || 0
                                                    if (J.aQ.test(o)) {
                                                        var i =
                                                            null ===
                                                                (r =
                                                                    null ===
                                                                        (e =
                                                                            n
                                                                                .visualElement
                                                                                .projection) ||
                                                                    void 0 === e
                                                                        ? void 0
                                                                        : e.layout) ||
                                                            void 0 === r
                                                                ? void 0
                                                                : r.actual[t]
                                                        if (i)
                                                            o =
                                                                ke(i) *
                                                                (parseFloat(o) /
                                                                    100)
                                                    }
                                                    n.originPoint[t] = o
                                                }),
                                                null == s || s(t, e),
                                                null ===
                                                    (r =
                                                        n.visualElement
                                                            .animationState) ||
                                                    void 0 === r ||
                                                    r.setActive(xt.Drag, !0))
                                        },
                                        onMove: function (t, e) {
                                            var r = n.getProps(),
                                                o = r.dragPropagation,
                                                i = r.dragDirectionLock,
                                                a = r.onDirectionLock,
                                                s = r.onDrag
                                            if (o || n.openGlobalLock) {
                                                var u = e.offset
                                                if (
                                                    i &&
                                                    null === n.currentDirection
                                                )
                                                    return (
                                                        (n.currentDirection =
                                                            (function (t, e) {
                                                                void 0 === e &&
                                                                    (e = 10)
                                                                var n = null
                                                                Math.abs(t.y) >
                                                                e
                                                                    ? (n = "y")
                                                                    : Math.abs(
                                                                          t.x
                                                                      ) > e &&
                                                                      (n = "x")
                                                                return n
                                                            })(u)),
                                                        void (
                                                            null !==
                                                                n.currentDirection &&
                                                            (null == a ||
                                                                a(
                                                                    n.currentDirection
                                                                ))
                                                        )
                                                    )
                                                n.updateAxis("x", e.point, u),
                                                    n.updateAxis(
                                                        "y",
                                                        e.point,
                                                        u
                                                    ),
                                                    n.visualElement.syncRender(),
                                                    null == s || s(t, e)
                                            }
                                        },
                                        onSessionEnd: function (t, e) {
                                            return n.stop(t, e)
                                        }
                                    },
                                    {
                                        transformPagePoint:
                                            this.visualElement.getTransformPagePoint()
                                    }
                                )
                            }
                        }),
                        (t.prototype.stop = function (t, e) {
                            var n = this.isDragging
                            if ((this.cancel(), n)) {
                                var r = e.velocity
                                this.startAnimation(r)
                                var o = this.getProps().onDragEnd
                                null == o || o(t, e)
                            }
                        }),
                        (t.prototype.cancel = function () {
                            var t, e
                            ;(this.isDragging = !1),
                                this.visualElement.projection &&
                                    (this.visualElement.projection.isAnimationBlocked =
                                        !1),
                                null === (t = this.panSession) ||
                                    void 0 === t ||
                                    t.end(),
                                (this.panSession = void 0),
                                !this.getProps().dragPropagation &&
                                    this.openGlobalLock &&
                                    (this.openGlobalLock(),
                                    (this.openGlobalLock = null)),
                                null ===
                                    (e = this.visualElement.animationState) ||
                                    void 0 === e ||
                                    e.setActive(xt.Drag, !1)
                        }),
                        (t.prototype.updateAxis = function (t, e, n) {
                            var r = this.getProps().drag
                            if (n && ln(t, r, this.currentDirection)) {
                                var o,
                                    i,
                                    a,
                                    s,
                                    u,
                                    l = this.getAxisMotionValue(t),
                                    c = this.originPoint[t] + n[t]
                                this.constraints &&
                                    this.constraints[t] &&
                                    ((o = c),
                                    (i = this.constraints[t]),
                                    (a = this.elastic[t]),
                                    (s = i.min),
                                    (u = i.max),
                                    void 0 !== s && o < s
                                        ? (o = a
                                              ? (0, Ae.C)(s, o, a.min)
                                              : Math.max(o, s))
                                        : void 0 !== u &&
                                          o > u &&
                                          (o = a
                                              ? (0, Ae.C)(u, o, a.max)
                                              : Math.min(o, u)),
                                    (c = o)),
                                    l.set(c)
                            }
                        }),
                        (t.prototype.resolveConstraints = function () {
                            var t = this,
                                e = this.getProps(),
                                n = e.dragConstraints,
                                r = e.dragElastic,
                                o = (this.visualElement.projection || {})
                                    .layout,
                                i = this.constraints
                            n && w(n)
                                ? this.constraints ||
                                  (this.constraints =
                                      this.resolveRefConstraints())
                                : (this.constraints =
                                      !(!n || !o) &&
                                      (function (t, e) {
                                          var n = e.top,
                                              r = e.left,
                                              o = e.bottom,
                                              i = e.right
                                          return {
                                              x: Ie(t.x, r, i),
                                              y: Ie(t.y, n, o)
                                          }
                                      })(o.actual, n)),
                                (this.elastic = (function (t) {
                                    return (
                                        void 0 === t && (t = ze),
                                        !1 === t
                                            ? (t = 0)
                                            : !0 === t && (t = ze),
                                        {
                                            x: Ne(t, "left", "right"),
                                            y: Ne(t, "top", "bottom")
                                        }
                                    )
                                })(r)),
                                i !== this.constraints &&
                                    o &&
                                    this.constraints &&
                                    !this.hasMutatedConstraints &&
                                    Ue(function (e) {
                                        t.getAxisMotionValue(e) &&
                                            (t.constraints[e] = (function (
                                                t,
                                                e
                                            ) {
                                                var n = {}
                                                return (
                                                    void 0 !== e.min &&
                                                        (n.min = e.min - t.min),
                                                    void 0 !== e.max &&
                                                        (n.max = e.max - t.min),
                                                    n
                                                )
                                            })(o.actual[e], t.constraints[e]))
                                    })
                        }),
                        (t.prototype.resolveRefConstraints = function () {
                            var t = this.getProps(),
                                e = t.dragConstraints,
                                n = t.onMeasureDragConstraints
                            if (!e || !w(e)) return !1
                            var r = e.current
                            ;(0, u.k)(
                                null !== r,
                                "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop."
                            )
                            var o = this.visualElement.projection
                            if (!o || !o.layout) return !1
                            var i = (function (t, e, n) {
                                    var r = on(t, n),
                                        o = e.scroll
                                    return o && (Qe(r.x, o.x), Qe(r.y, o.y)), r
                                })(
                                    r,
                                    o.root,
                                    this.visualElement.getTransformPagePoint()
                                ),
                                a = (function (t, e) {
                                    return { x: Fe(t.x, e.x), y: Fe(t.y, e.y) }
                                })(o.layout.actual, i)
                            if (n) {
                                var s = n(
                                    (function (t) {
                                        var e = t.x,
                                            n = t.y
                                        return {
                                            top: n.min,
                                            right: e.max,
                                            bottom: n.max,
                                            left: e.min
                                        }
                                    })(a)
                                )
                                ;(this.hasMutatedConstraints = !!s),
                                    s && (a = We(s))
                            }
                            return a
                        }),
                        (t.prototype.startAnimation = function (t) {
                            var e = this,
                                n = this.getProps(),
                                o = n.drag,
                                i = n.dragMomentum,
                                a = n.dragElastic,
                                s = n.dragTransition,
                                u = n.dragSnapToOrigin,
                                l = n.onDragTransitionEnd,
                                c = this.constraints || {},
                                d = Ue(function (n) {
                                    var l
                                    if (ln(n, o, e.currentDirection)) {
                                        var d =
                                            null !==
                                                (l =
                                                    null == c
                                                        ? void 0
                                                        : c[n]) && void 0 !== l
                                                ? l
                                                : {}
                                        u && (d = { min: 0, max: 0 })
                                        var p = a ? 200 : 1e6,
                                            f = a ? 40 : 1e7,
                                            v = (0, r.pi)(
                                                (0, r.pi)(
                                                    {
                                                        type: "inertia",
                                                        velocity: i ? t[n] : 0,
                                                        bounceStiffness: p,
                                                        bounceDamping: f,
                                                        timeConstant: 750,
                                                        restDelta: 1,
                                                        restSpeed: 10
                                                    },
                                                    s
                                                ),
                                                d
                                            )
                                        return e.startAxisValueAnimation(n, v)
                                    }
                                })
                            return Promise.all(d).then(l)
                        }),
                        (t.prototype.startAxisValueAnimation = function (t, e) {
                            var n = this.getAxisMotionValue(t)
                            return (0, an.b8)(t, n, 0, e)
                        }),
                        (t.prototype.stopAnimation = function () {
                            var t = this
                            Ue(function (e) {
                                return t.getAxisMotionValue(e).stop()
                            })
                        }),
                        (t.prototype.getAxisMotionValue = function (t) {
                            var e,
                                n,
                                r = "_drag" + t.toUpperCase(),
                                o = this.visualElement.getProps()[r]
                            return (
                                o ||
                                this.visualElement.getValue(
                                    t,
                                    null !==
                                        (n =
                                            null ===
                                                (e =
                                                    this.visualElement.getProps()
                                                        .initial) ||
                                            void 0 === e
                                                ? void 0
                                                : e[t]) && void 0 !== n
                                        ? n
                                        : 0
                                )
                            )
                        }),
                        (t.prototype.snapToCursor = function (t) {
                            var e = this
                            Ue(function (n) {
                                if (
                                    ln(n, e.getProps().drag, e.currentDirection)
                                ) {
                                    var r = e.visualElement.projection,
                                        o = e.getAxisMotionValue(n)
                                    if (r && r.layout) {
                                        var i = r.layout.actual[n],
                                            a = i.min,
                                            s = i.max
                                        o.set(t[n] - (0, Ae.C)(a, s, 0.5))
                                    }
                                }
                            })
                        }),
                        (t.prototype.scalePositionWithinConstraints =
                            function () {
                                var t,
                                    e = this,
                                    n = this.getProps(),
                                    r = n.drag,
                                    o = n.dragConstraints,
                                    i = this.visualElement.projection
                                if (w(o) && i && this.constraints) {
                                    this.stopAnimation()
                                    var a = { x: 0, y: 0 }
                                    Ue(function (t) {
                                        var n,
                                            r,
                                            o,
                                            i,
                                            s,
                                            u = e.getAxisMotionValue(t)
                                        if (u) {
                                            var l = u.get()
                                            a[t] =
                                                ((n = { min: l, max: l }),
                                                (r = e.constraints[t]),
                                                (o = 0.5),
                                                (i = ke(n)),
                                                (s = ke(r)) > i
                                                    ? (o = (0, Me.Y)(
                                                          r.min,
                                                          r.max - i,
                                                          n.min
                                                      ))
                                                    : i > s &&
                                                      (o = (0, Me.Y)(
                                                          n.min,
                                                          n.max - s,
                                                          r.min
                                                      )),
                                                (0, Ve.u)(0, 1, o))
                                        }
                                    })
                                    var s =
                                        this.visualElement.getProps()
                                            .transformTemplate
                                    ;(this.visualElement.getInstance().style.transform =
                                        s ? s({}, "") : "none"),
                                        null === (t = i.root) ||
                                            void 0 === t ||
                                            t.updateScroll(),
                                        i.updateLayout(),
                                        this.resolveConstraints(),
                                        Ue(function (t) {
                                            if (ln(t, r, null)) {
                                                var n = e.getAxisMotionValue(t),
                                                    o = e.constraints[t],
                                                    i = o.min,
                                                    s = o.max
                                                n.set((0, Ae.C)(i, s, a[t]))
                                            }
                                        })
                                }
                            }),
                        (t.prototype.addListeners = function () {
                            var t,
                                e = this
                            sn.set(this.visualElement, this)
                            var n = jt(
                                    this.visualElement.getInstance(),
                                    "pointerdown",
                                    function (t) {
                                        var n = e.getProps(),
                                            r = n.drag,
                                            o = n.dragListener
                                        r && (void 0 === o || o) && e.start(t)
                                    }
                                ),
                                r = function () {
                                    w(e.getProps().dragConstraints) &&
                                        (e.constraints =
                                            e.resolveRefConstraints())
                                },
                                o = this.visualElement.projection,
                                i = o.addEventListener("measure", r)
                            o &&
                                !o.layout &&
                                (null === (t = o.root) ||
                                    void 0 === t ||
                                    t.updateScroll(),
                                o.updateLayout()),
                                r()
                            var a = St(window, "resize", function () {
                                return e.scalePositionWithinConstraints()
                            })
                            return (
                                o.addEventListener("didUpdate", function (t) {
                                    var n = t.delta,
                                        r = t.hasLayoutChanged
                                    e.isDragging &&
                                        r &&
                                        (Ue(function (t) {
                                            var r = e.getAxisMotionValue(t)
                                            r &&
                                                ((e.originPoint[t] +=
                                                    n[t].translate),
                                                r.set(r.get() + n[t].translate))
                                        }),
                                        e.visualElement.syncRender())
                                }),
                                function () {
                                    a(), n(), i()
                                }
                            )
                        }),
                        (t.prototype.getProps = function () {
                            var t = this.visualElement.getProps(),
                                e = t.drag,
                                n = void 0 !== e && e,
                                o = t.dragDirectionLock,
                                i = void 0 !== o && o,
                                a = t.dragPropagation,
                                s = void 0 !== a && a,
                                u = t.dragConstraints,
                                l = void 0 !== u && u,
                                c = t.dragElastic,
                                d = void 0 === c ? ze : c,
                                p = t.dragMomentum,
                                f = void 0 === p || p
                            return (0, r.pi)((0, r.pi)({}, t), {
                                drag: n,
                                dragDirectionLock: i,
                                dragPropagation: s,
                                dragConstraints: l,
                                dragElastic: d,
                                dragMomentum: f
                            })
                        }),
                        t
                    )
                })()
            function ln(t, e, n) {
                return !((!0 !== e && e !== t) || (null !== n && n !== t))
            }
            var cn = {
                    pan: te(function (t) {
                        var e = t.onPan,
                            n = t.onPanStart,
                            r = t.onPanEnd,
                            i = t.onPanSessionStart,
                            a = t.visualElement,
                            s = e || n || r || i,
                            u = (0, o.useRef)(null),
                            l = (0, o.useContext)(p).transformPagePoint,
                            c = {
                                onSessionStart: i,
                                onStart: n,
                                onMove: e,
                                onEnd: function (t, e) {
                                    ;(u.current = null), r && r(t, e)
                                }
                            }
                        ;(0, o.useEffect)(function () {
                            null !== u.current && u.current.updateHandlers(c)
                        }),
                            Ot(
                                a,
                                "pointerdown",
                                s &&
                                    function (t) {
                                        u.current = new we(t, c, {
                                            transformPagePoint: l
                                        })
                                    }
                            ),
                            Ut(function () {
                                return u.current && u.current.end()
                            })
                    }),
                    drag: te(function (t) {
                        var e = t.dragControls,
                            n = t.visualElement,
                            r = (0, P.h)(function () {
                                return new un(n)
                            })
                        ;(0, o.useEffect)(
                            function () {
                                return e && e.subscribe(r)
                            },
                            [r, e]
                        ),
                            (0, o.useEffect)(
                                function () {
                                    return r.addListeners()
                                },
                                [r]
                            )
                    })
                },
                dn = n(2502),
                pn = n(7248),
                fn = [
                    "LayoutMeasure",
                    "BeforeLayoutMeasure",
                    "LayoutUpdate",
                    "ViewportBoxUpdate",
                    "Update",
                    "Render",
                    "AnimationComplete",
                    "LayoutAnimationComplete",
                    "AnimationStart",
                    "LayoutAnimationStart",
                    "SetAxisTarget",
                    "Unmount"
                ]
            var vn = function (t) {
                    var e = t.treeType,
                        n = void 0 === e ? "" : e,
                        o = t.build,
                        i = t.getBaseTarget,
                        a = t.makeTargetAnimatable,
                        s = t.measureViewportBox,
                        u = t.render,
                        l = t.readValueFromInstance,
                        c = t.removeValueFromRenderState,
                        d = t.sortNodePosition,
                        p = t.scrapeMotionValuesFromProps
                    return function (t, e) {
                        var f = t.parent,
                            v = t.props,
                            h = t.presenceId,
                            m = t.blockInitialAnimation,
                            g = t.visualState,
                            y = t.shouldReduceMotion
                        void 0 === e && (e = {})
                        var x,
                            b,
                            w = !1,
                            E = g.latestValues,
                            C = g.renderState,
                            P = (function () {
                                var t = fn.map(function () {
                                        return new pn.L()
                                    }),
                                    e = {},
                                    n = {
                                        clearAllListeners: function () {
                                            return t.forEach(function (t) {
                                                return t.clear()
                                            })
                                        },
                                        updatePropListeners: function (t) {
                                            fn.forEach(function (r) {
                                                var o,
                                                    i = "on" + r,
                                                    a = t[i]
                                                null === (o = e[r]) ||
                                                    void 0 === o ||
                                                    o.call(e),
                                                    a && (e[r] = n[i](a))
                                            })
                                        }
                                    }
                                return (
                                    t.forEach(function (t, e) {
                                        ;(n["on" + fn[e]] = function (e) {
                                            return t.add(e)
                                        }),
                                            (n["notify" + fn[e]] = function () {
                                                for (
                                                    var e = [], n = 0;
                                                    n < arguments.length;
                                                    n++
                                                )
                                                    e[n] = arguments[n]
                                                return t.notify.apply(
                                                    t,
                                                    (0, r.ev)(
                                                        [],
                                                        (0, r.CR)(e),
                                                        !1
                                                    )
                                                )
                                            })
                                    }),
                                    n
                                )
                            })(),
                            T = new Map(),
                            R = new Map(),
                            A = {},
                            M = (0, r.pi)({}, E)
                        function V() {
                            x && w && (k(), u(x, C, v.style, z.projection))
                        }
                        function k() {
                            o(z, C, E, e, v)
                        }
                        function L() {
                            P.notifyUpdate(E)
                        }
                        function Z(t, e) {
                            var n = e.onChange(function (e) {
                                    ;(E[t] = e),
                                        v.onUpdate && ve.ZP.update(L, !1, !0)
                                }),
                                r = e.onRenderRequest(z.scheduleRender)
                            R.set(t, function () {
                                n(), r()
                            })
                        }
                        var j = p(v)
                        for (var O in j) {
                            var D = j[O]
                            void 0 !== E[O] && I(D) && D.set(E[O], !1)
                        }
                        var B = (0, S.O6)(v),
                            F = (0, S.e8)(v),
                            z = (0, r.pi)(
                                (0, r.pi)(
                                    {
                                        treeType: n,
                                        current: null,
                                        depth: f ? f.depth + 1 : 0,
                                        parent: f,
                                        children: new Set(),
                                        presenceId: h,
                                        shouldReduceMotion: y,
                                        variantChildren: F ? new Set() : void 0,
                                        isVisible: void 0,
                                        manuallyAnimateOnMount: Boolean(
                                            null == f ? void 0 : f.isMounted()
                                        ),
                                        blockInitialAnimation: m,
                                        isMounted: function () {
                                            return Boolean(x)
                                        },
                                        mount: function (t) {
                                            ;(w = !0),
                                                (x = z.current = t),
                                                z.projection &&
                                                    z.projection.mount(t),
                                                F &&
                                                    f &&
                                                    !B &&
                                                    (b =
                                                        null == f
                                                            ? void 0
                                                            : f.addVariantChild(
                                                                  z
                                                              )),
                                                T.forEach(function (t, e) {
                                                    return Z(e, t)
                                                }),
                                                null == f || f.children.add(z),
                                                z.setProps(v)
                                        },
                                        unmount: function () {
                                            var t
                                            null === (t = z.projection) ||
                                                void 0 === t ||
                                                t.unmount(),
                                                ve.qY.update(L),
                                                ve.qY.render(V),
                                                R.forEach(function (t) {
                                                    return t()
                                                }),
                                                null == b || b(),
                                                null == f ||
                                                    f.children.delete(z),
                                                P.clearAllListeners(),
                                                (x = void 0),
                                                (w = !1)
                                        },
                                        addVariantChild: function (t) {
                                            var e,
                                                n = z.getClosestVariantNode()
                                            if (n)
                                                return (
                                                    null ===
                                                        (e =
                                                            n.variantChildren) ||
                                                        void 0 === e ||
                                                        e.add(t),
                                                    function () {
                                                        return n.variantChildren.delete(
                                                            t
                                                        )
                                                    }
                                                )
                                        },
                                        sortNodePosition: function (t) {
                                            return d && n === t.treeType
                                                ? d(
                                                      z.getInstance(),
                                                      t.getInstance()
                                                  )
                                                : 0
                                        },
                                        getClosestVariantNode: function () {
                                            return F
                                                ? z
                                                : null == f
                                                ? void 0
                                                : f.getClosestVariantNode()
                                        },
                                        getLayoutId: function () {
                                            return v.layoutId
                                        },
                                        getInstance: function () {
                                            return x
                                        },
                                        getStaticValue: function (t) {
                                            return E[t]
                                        },
                                        setStaticValue: function (t, e) {
                                            return (E[t] = e)
                                        },
                                        getLatestValues: function () {
                                            return E
                                        },
                                        setVisibility: function (t) {
                                            z.isVisible !== t &&
                                                ((z.isVisible = t),
                                                z.scheduleRender())
                                        },
                                        makeTargetAnimatable: function (t, e) {
                                            return (
                                                void 0 === e && (e = !0),
                                                a(z, t, v, e)
                                            )
                                        },
                                        measureViewportBox: function () {
                                            return s(x, v)
                                        },
                                        addValue: function (t, e) {
                                            z.hasValue(t) && z.removeValue(t),
                                                T.set(t, e),
                                                (E[t] = e.get()),
                                                Z(t, e)
                                        },
                                        removeValue: function (t) {
                                            var e
                                            T.delete(t),
                                                null === (e = R.get(t)) ||
                                                    void 0 === e ||
                                                    e(),
                                                R.delete(t),
                                                delete E[t],
                                                c(t, C)
                                        },
                                        hasValue: function (t) {
                                            return T.has(t)
                                        },
                                        getValue: function (t, e) {
                                            var n = T.get(t)
                                            return (
                                                void 0 === n &&
                                                    void 0 !== e &&
                                                    ((n = (0, dn.B)(e)),
                                                    z.addValue(t, n)),
                                                n
                                            )
                                        },
                                        forEachValue: function (t) {
                                            return T.forEach(t)
                                        },
                                        readValue: function (t) {
                                            var n
                                            return null !== (n = E[t]) &&
                                                void 0 !== n
                                                ? n
                                                : l(x, t, e)
                                        },
                                        setBaseTarget: function (t, e) {
                                            M[t] = e
                                        },
                                        getBaseTarget: function (t) {
                                            if (i) {
                                                var e = i(v, t)
                                                if (void 0 !== e && !I(e))
                                                    return e
                                            }
                                            return M[t]
                                        }
                                    },
                                    P
                                ),
                                {
                                    build: function () {
                                        return k(), C
                                    },
                                    scheduleRender: function () {
                                        ve.ZP.render(V, !1, !0)
                                    },
                                    syncRender: V,
                                    setProps: function (t) {
                                        ;(t.transformTemplate ||
                                            v.transformTemplate) &&
                                            z.scheduleRender(),
                                            (v = t),
                                            P.updatePropListeners(t),
                                            (A = (function (t, e, n) {
                                                var r
                                                for (var o in e) {
                                                    var i = e[o],
                                                        a = n[o]
                                                    if (I(i)) t.addValue(o, i)
                                                    else if (I(a))
                                                        t.addValue(
                                                            o,
                                                            (0, dn.B)(i)
                                                        )
                                                    else if (a !== i)
                                                        if (t.hasValue(o)) {
                                                            var s =
                                                                t.getValue(o)
                                                            !s.hasAnimated &&
                                                                s.set(i)
                                                        } else
                                                            t.addValue(
                                                                o,
                                                                (0, dn.B)(
                                                                    null !==
                                                                        (r =
                                                                            t.getStaticValue(
                                                                                o
                                                                            )) &&
                                                                        void 0 !==
                                                                            r
                                                                        ? r
                                                                        : i
                                                                )
                                                            )
                                                }
                                                for (var o in n)
                                                    void 0 === e[o] &&
                                                        t.removeValue(o)
                                                return e
                                            })(z, p(v), A))
                                    },
                                    getProps: function () {
                                        return v
                                    },
                                    getVariant: function (t) {
                                        var e
                                        return null === (e = v.variants) ||
                                            void 0 === e
                                            ? void 0
                                            : e[t]
                                    },
                                    getDefaultTransition: function () {
                                        return v.transition
                                    },
                                    getTransformPagePoint: function () {
                                        return v.transformPagePoint
                                    },
                                    getVariantContext: function (t) {
                                        if ((void 0 === t && (t = !1), t))
                                            return null == f
                                                ? void 0
                                                : f.getVariantContext()
                                        if (!B) {
                                            var e =
                                                (null == f
                                                    ? void 0
                                                    : f.getVariantContext()) ||
                                                {}
                                            return (
                                                void 0 !== v.initial &&
                                                    (e.initial = v.initial),
                                                e
                                            )
                                        }
                                        for (var n = {}, r = 0; r < mn; r++) {
                                            var o = hn[r],
                                                i = v[o]
                                            ;((0, S.$L)(i) || !1 === i) &&
                                                (n[o] = i)
                                        }
                                        return n
                                    }
                                }
                            )
                        return z
                    }
                },
                hn = (0, r.ev)(["initial"], (0, r.CR)(ue), !1),
                mn = hn.length,
                gn = n(9241)
            function yn(t) {
                return "string" == typeof t && t.startsWith("var(--")
            }
            var xn = /var\((--[a-zA-Z0-9-_]+),? ?([a-zA-Z0-9 ()%#.,-]+)?\)/
            function bn(t, e, n) {
                void 0 === n && (n = 1),
                    (0, u.k)(
                        n <= 4,
                        'Max CSS variable fallback depth detected in property "'.concat(
                            t,
                            '". This may indicate a circular fallback dependency.'
                        )
                    )
                var o = (0, r.CR)(
                        (function (t) {
                            var e = xn.exec(t)
                            if (!e) return [,]
                            var n = (0, r.CR)(e, 3)
                            return [n[1], n[2]]
                        })(t),
                        2
                    ),
                    i = o[0],
                    a = o[1]
                if (i) {
                    var s = window.getComputedStyle(e).getPropertyValue(i)
                    return s ? s.trim() : yn(a) ? bn(a, e, n + 1) : a
                }
            }
            var wn,
                Sn = n(9707),
                En = n(5466),
                Cn = new Set([
                    "width",
                    "height",
                    "top",
                    "left",
                    "right",
                    "bottom",
                    "x",
                    "y"
                ]),
                Pn = function (t) {
                    return Cn.has(t)
                },
                Tn = function (t, e) {
                    t.set(e, !1), t.set(e)
                },
                Rn = function (t) {
                    return t === Sn.Rx || t === J.px
                }
            !(function (t) {
                ;(t.width = "width"),
                    (t.height = "height"),
                    (t.left = "left"),
                    (t.right = "right"),
                    (t.top = "top"),
                    (t.bottom = "bottom")
            })(wn || (wn = {}))
            var An = function (t, e) {
                    return parseFloat(t.split(", ")[e])
                },
                Mn = function (t, e) {
                    return function (n, r) {
                        var o = r.transform
                        if ("none" === o || !o) return 0
                        var i = o.match(/^matrix3d\((.+)\)$/)
                        if (i) return An(i[1], e)
                        var a = o.match(/^matrix\((.+)\)$/)
                        return a ? An(a[1], t) : 0
                    }
                },
                Vn = new Set(["x", "y", "z"]),
                kn = D.Gl.filter(function (t) {
                    return !Vn.has(t)
                })
            var Ln = {
                    width: function (t, e) {
                        var n = t.x,
                            r = e.paddingLeft,
                            o = void 0 === r ? "0" : r,
                            i = e.paddingRight,
                            a = void 0 === i ? "0" : i
                        return n.max - n.min - parseFloat(o) - parseFloat(a)
                    },
                    height: function (t, e) {
                        var n = t.y,
                            r = e.paddingTop,
                            o = void 0 === r ? "0" : r,
                            i = e.paddingBottom,
                            a = void 0 === i ? "0" : i
                        return n.max - n.min - parseFloat(o) - parseFloat(a)
                    },
                    top: function (t, e) {
                        var n = e.top
                        return parseFloat(n)
                    },
                    left: function (t, e) {
                        var n = e.left
                        return parseFloat(n)
                    },
                    bottom: function (t, e) {
                        var n = t.y,
                            r = e.top
                        return parseFloat(r) + (n.max - n.min)
                    },
                    right: function (t, e) {
                        var n = t.x,
                            r = e.left
                        return parseFloat(r) + (n.max - n.min)
                    },
                    x: Mn(4, 13),
                    y: Mn(5, 14)
                },
                Zn = function (t, e, n, o) {
                    void 0 === n && (n = {}),
                        void 0 === o && (o = {}),
                        (e = (0, r.pi)({}, e)),
                        (o = (0, r.pi)({}, o))
                    var i = Object.keys(e).filter(Pn),
                        a = [],
                        s = !1,
                        l = []
                    if (
                        (i.forEach(function (r) {
                            var i = t.getValue(r)
                            if (t.hasValue(r)) {
                                var c,
                                    d = n[r],
                                    p = (0, En.C)(d),
                                    f = e[r]
                                if ((0, ie.C)(f)) {
                                    var v = f.length,
                                        h = null === f[0] ? 1 : 0
                                    ;(d = f[h]), (p = (0, En.C)(d))
                                    for (var m = h; m < v; m++)
                                        c
                                            ? (0, u.k)(
                                                  (0, En.C)(f[m]) === c,
                                                  "All keyframes must be of the same type"
                                              )
                                            : ((c = (0, En.C)(f[m])),
                                              (0, u.k)(
                                                  c === p || (Rn(p) && Rn(c)),
                                                  "Keyframes must be of the same dimension as the current value"
                                              ))
                                } else c = (0, En.C)(f)
                                if (p !== c)
                                    if (Rn(p) && Rn(c)) {
                                        var g = i.get()
                                        "string" == typeof g &&
                                            i.set(parseFloat(g)),
                                            "string" == typeof f
                                                ? (e[r] = parseFloat(f))
                                                : Array.isArray(f) &&
                                                  c === J.px &&
                                                  (e[r] = f.map(parseFloat))
                                    } else
                                        (null == p ? void 0 : p.transform) &&
                                        (null == c ? void 0 : c.transform) &&
                                        (0 === d || 0 === f)
                                            ? 0 === d
                                                ? i.set(c.transform(d))
                                                : (e[r] = p.transform(f))
                                            : (s ||
                                                  ((a = (function (t) {
                                                      var e = []
                                                      return (
                                                          kn.forEach(function (
                                                              n
                                                          ) {
                                                              var r =
                                                                  t.getValue(n)
                                                              void 0 !== r &&
                                                                  (e.push([
                                                                      n,
                                                                      r.get()
                                                                  ]),
                                                                  r.set(
                                                                      n.startsWith(
                                                                          "scale"
                                                                      )
                                                                          ? 1
                                                                          : 0
                                                                  ))
                                                          }),
                                                          e.length &&
                                                              t.syncRender(),
                                                          e
                                                      )
                                                  })(t)),
                                                  (s = !0)),
                                              l.push(r),
                                              (o[r] =
                                                  void 0 !== o[r]
                                                      ? o[r]
                                                      : e[r]),
                                              Tn(i, f))
                            }
                        }),
                        l.length)
                    ) {
                        var c =
                                l.indexOf("height") >= 0
                                    ? window.pageYOffset
                                    : null,
                            d = (function (t, e, n) {
                                var r = e.measureViewportBox(),
                                    o = e.getInstance(),
                                    i = getComputedStyle(o),
                                    a = i.display,
                                    s = {}
                                "none" === a &&
                                    e.setStaticValue(
                                        "display",
                                        t.display || "block"
                                    ),
                                    n.forEach(function (t) {
                                        s[t] = Ln[t](r, i)
                                    }),
                                    e.syncRender()
                                var u = e.measureViewportBox()
                                return (
                                    n.forEach(function (n) {
                                        var r = e.getValue(n)
                                        Tn(r, s[n]), (t[n] = Ln[n](u, i))
                                    }),
                                    t
                                )
                            })(e, t, l)
                        return (
                            a.length &&
                                a.forEach(function (e) {
                                    var n = (0, r.CR)(e, 2),
                                        o = n[0],
                                        i = n[1]
                                    t.getValue(o).set(i)
                                }),
                            t.syncRender(),
                            null !== c && window.scrollTo({ top: c }),
                            { target: d, transitionEnd: o }
                        )
                    }
                    return { target: e, transitionEnd: o }
                }
            function jn(t, e, n, r) {
                return (function (t) {
                    return Object.keys(t).some(Pn)
                })(e)
                    ? Zn(t, e, n, r)
                    : { target: e, transitionEnd: r }
            }
            var On = function (t, e, n, o) {
                    var i = (function (t, e, n) {
                        var o,
                            i = (0, r._T)(e, []),
                            a = t.getInstance()
                        if (!(a instanceof Element))
                            return { target: i, transitionEnd: n }
                        for (var s in (n && (n = (0, r.pi)({}, n)),
                        t.forEachValue(function (t) {
                            var e = t.get()
                            if (yn(e)) {
                                var n = bn(e, a)
                                n && t.set(n)
                            }
                        }),
                        i)) {
                            var u = i[s]
                            if (yn(u)) {
                                var l = bn(u, a)
                                l &&
                                    ((i[s] = l),
                                    n &&
                                        ((null !== (o = n[s]) &&
                                            void 0 !== o) ||
                                            (n[s] = u)))
                            }
                        }
                        return { target: i, transitionEnd: n }
                    })(t, e, o)
                    return jn(t, (e = i.target), n, (o = i.transitionEnd))
                },
                Dn = n(7245)
            var Bn = {
                    treeType: "dom",
                    readValueFromInstance: function (t, e) {
                        if ((0, D._c)(e)) {
                            var n = (0, Dn.A)(e)
                            return (n && n.default) || 0
                        }
                        var r,
                            o = ((r = t), window.getComputedStyle(r))
                        return (z(e) ? o.getPropertyValue(e) : o[e]) || 0
                    },
                    sortNodePosition: function (t, e) {
                        return 2 & t.compareDocumentPosition(e) ? 1 : -1
                    },
                    getBaseTarget: function (t, e) {
                        var n
                        return null === (n = t.style) || void 0 === n
                            ? void 0
                            : n[e]
                    },
                    measureViewportBox: function (t, e) {
                        return on(t, e.transformPagePoint)
                    },
                    resetTransform: function (t, e, n) {
                        var r = n.transformTemplate
                        ;(e.style.transform = r ? r({}, "") : "none"),
                            t.scheduleRender()
                    },
                    restoreTransform: function (t, e) {
                        t.style.transform = e.style.transform
                    },
                    removeValueFromRenderState: function (t, e) {
                        var n = e.vars,
                            r = e.style
                        delete n[t], delete r[t]
                    },
                    makeTargetAnimatable: function (t, e, n, o) {
                        var i = n.transformValues
                        void 0 === o && (o = !0)
                        var a = e.transition,
                            s = e.transitionEnd,
                            u = (0, r._T)(e, ["transition", "transitionEnd"]),
                            l = (0, gn.P$)(u, a || {}, t)
                        if (
                            (i &&
                                (s && (s = i(s)),
                                u && (u = i(u)),
                                l && (l = i(l))),
                            o)
                        ) {
                            ;(0, gn.GJ)(t, u, l)
                            var c = On(t, u, l, s)
                            ;(s = c.transitionEnd), (u = c.target)
                        }
                        return (0, r.pi)({ transition: a, transitionEnd: s }, u)
                    },
                    scrapeMotionValuesFromProps: dt,
                    build: function (t, e, n, r, o) {
                        void 0 !== t.isVisible &&
                            (e.style.visibility = t.isVisible
                                ? "visible"
                                : "hidden"),
                            U(e, n, r, o.transformTemplate)
                    },
                    render: ut
                },
                In = vn(Bn),
                Fn = vn(
                    (0, r.pi)((0, r.pi)({}, Bn), {
                        getBaseTarget: function (t, e) {
                            return t[e]
                        },
                        readValueFromInstance: function (t, e) {
                            var n
                            return (0, D._c)(e)
                                ? (null === (n = (0, Dn.A)(e)) || void 0 === n
                                      ? void 0
                                      : n.default) || 0
                                : ((e = lt.has(e) ? e : st(e)),
                                  t.getAttribute(e))
                        },
                        scrapeMotionValuesFromProps: pt,
                        build: function (t, e, n, r, o) {
                            nt(e, n, r, o.transformTemplate)
                        },
                        render: ct
                    })
                ),
                zn = function (t, e) {
                    return j(t)
                        ? Fn(e, { enableHardwareAcceleration: !1 })
                        : In(e, { enableHardwareAcceleration: !0 })
                }
            function Nn(t, e) {
                return e.max === e.min ? 0 : (t / (e.max - e.min)) * 100
            }
            var $n = {
                    correct: function (t, e) {
                        if (!e.target) return t
                        if ("string" == typeof t) {
                            if (!J.px.test(t)) return t
                            t = parseFloat(t)
                        }
                        var n = Nn(t, e.target.x),
                            r = Nn(t, e.target.y)
                        return "".concat(n, "% ").concat(r, "%")
                    }
                },
                Un = n(1928),
                Wn = "_$css",
                Hn = {
                    correct: function (t, e) {
                        var n = e.treeScale,
                            r = e.projectionDelta,
                            o = t,
                            i = t.includes("var("),
                            a = []
                        i &&
                            (t = t.replace(xn, function (t) {
                                return a.push(t), Wn
                            }))
                        var s = Un.P.parse(t)
                        if (s.length > 5) return o
                        var u = Un.P.createTransformer(t),
                            l = "number" != typeof s[0] ? 1 : 0,
                            c = r.x.scale * n.x,
                            d = r.y.scale * n.y
                        ;(s[0 + l] /= c), (s[1 + l] /= d)
                        var p = (0, Ae.C)(c, d, 0.5)
                        "number" == typeof s[2 + l] && (s[2 + l] /= p),
                            "number" == typeof s[3 + l] && (s[3 + l] /= p)
                        var f = u(s)
                        if (i) {
                            var v = 0
                            f = f.replace(Wn, function () {
                                var t = a[v]
                                return v++, t
                            })
                        }
                        return f
                    }
                },
                _n = (function (t) {
                    function e() {
                        return (null !== t && t.apply(this, arguments)) || this
                    }
                    return (
                        (0, r.ZT)(e, t),
                        (e.prototype.componentDidMount = function () {
                            var t,
                                e = this,
                                n = this.props,
                                o = n.visualElement,
                                i = n.layoutGroup,
                                a = n.switchLayoutGroup,
                                s = n.layoutId,
                                u = o.projection
                            ;(t = Yn),
                                Object.assign(O, t),
                                u &&
                                    ((null == i ? void 0 : i.group) &&
                                        i.group.add(u),
                                    (null == a ? void 0 : a.register) &&
                                        s &&
                                        a.register(u),
                                    u.root.didUpdate(),
                                    u.addEventListener(
                                        "animationComplete",
                                        function () {
                                            e.safeToRemove()
                                        }
                                    ),
                                    u.setOptions(
                                        (0, r.pi)((0, r.pi)({}, u.options), {
                                            onExitComplete: function () {
                                                return e.safeToRemove()
                                            }
                                        })
                                    )),
                                (T.hasEverUpdated = !0)
                        }),
                        (e.prototype.getSnapshotBeforeUpdate = function (t) {
                            var e = this,
                                n = this.props,
                                r = n.layoutDependency,
                                o = n.visualElement,
                                i = n.drag,
                                a = n.isPresent,
                                s = o.projection
                            return s
                                ? ((s.isPresent = a),
                                  i || t.layoutDependency !== r || void 0 === r
                                      ? s.willUpdate()
                                      : this.safeToRemove(),
                                  t.isPresent !== a &&
                                      (a
                                          ? s.promote()
                                          : s.relegate() ||
                                            ve.ZP.postRender(function () {
                                                var t
                                                ;(null === (t = s.getStack()) ||
                                                void 0 === t
                                                    ? void 0
                                                    : t.members.length) ||
                                                    e.safeToRemove()
                                            })),
                                  null)
                                : null
                        }),
                        (e.prototype.componentDidUpdate = function () {
                            var t = this.props.visualElement.projection
                            t &&
                                (t.root.didUpdate(),
                                !t.currentAnimation &&
                                    t.isLead() &&
                                    this.safeToRemove())
                        }),
                        (e.prototype.componentWillUnmount = function () {
                            var t = this.props,
                                e = t.visualElement,
                                n = t.layoutGroup,
                                r = t.switchLayoutGroup,
                                o = e.projection
                            o &&
                                (o.scheduleCheckAfterUnmount(),
                                (null == n ? void 0 : n.group) &&
                                    n.group.remove(o),
                                (null == r ? void 0 : r.deregister) &&
                                    r.deregister(o))
                        }),
                        (e.prototype.safeToRemove = function () {
                            var t = this.props.safeToRemove
                            null == t || t()
                        }),
                        (e.prototype.render = function () {
                            return null
                        }),
                        e
                    )
                })(o.Component)
            var Yn = {
                    borderRadius: (0, r.pi)((0, r.pi)({}, $n), {
                        applyTo: [
                            "borderTopLeftRadius",
                            "borderTopRightRadius",
                            "borderBottomLeftRadius",
                            "borderBottomRightRadius"
                        ]
                    }),
                    borderTopLeftRadius: $n,
                    borderTopRightRadius: $n,
                    borderBottomLeftRadius: $n,
                    borderBottomRightRadius: $n,
                    boxShadow: Hn
                },
                qn = {
                    measureLayout: function (t) {
                        var e = (0, r.CR)(oe(), 2),
                            n = e[0],
                            i = e[1],
                            a = (0, o.useContext)(A)
                        return o.createElement(
                            _n,
                            (0, r.pi)({}, t, {
                                layoutGroup: a,
                                switchLayoutGroup: (0, o.useContext)(M),
                                isPresent: n,
                                safeToRemove: i
                            })
                        )
                    }
                }
            var Xn = n(3401),
                Gn = ["TopLeft", "TopRight", "BottomLeft", "BottomRight"],
                Kn = Gn.length,
                Jn = function (t) {
                    return "string" == typeof t ? parseFloat(t) : t
                },
                Qn = function (t) {
                    return "number" == typeof t || J.px.test(t)
                }
            function tr(t, e) {
                var n
                return null !== (n = t[e]) && void 0 !== n ? n : t.borderRadius
            }
            var er = rr(0, 0.5, Xn.Bn),
                nr = rr(0.5, 0.95, Xn.GE)
            function rr(t, e, n) {
                return function (r) {
                    return r < t ? 0 : r > e ? 1 : n((0, Me.Y)(t, e, r))
                }
            }
            function or(t, e) {
                ;(t.min = e.min), (t.max = e.max)
            }
            function ir(t, e) {
                or(t.x, e.x), or(t.y, e.y)
            }
            function ar(t, e, n, r, o) {
                return (
                    (t = Xe((t -= e), 1 / n, r)),
                    void 0 !== o && (t = Xe(t, 1 / o, r)),
                    t
                )
            }
            function sr(t, e, n, o, i) {
                var a = (0, r.CR)(n, 3),
                    s = a[0],
                    u = a[1],
                    l = a[2]
                !(function (t, e, n, r, o, i, a) {
                    if (
                        (void 0 === e && (e = 0),
                        void 0 === n && (n = 1),
                        void 0 === r && (r = 0.5),
                        void 0 === i && (i = t),
                        void 0 === a && (a = t),
                        J.aQ.test(e) &&
                            ((e = parseFloat(e)),
                            (e = (0, Ae.C)(a.min, a.max, e / 100) - a.min)),
                        "number" == typeof e)
                    ) {
                        var s = (0, Ae.C)(i.min, i.max, r)
                        t === i && (s -= e),
                            (t.min = ar(t.min, e, n, s, o)),
                            (t.max = ar(t.max, e, n, s, o))
                    }
                })(t, e[s], e[u], e[l], e.scale, o, i)
            }
            var ur = ["x", "scaleX", "originX"],
                lr = ["y", "scaleY", "originY"]
            function cr(t, e, n, r) {
                sr(
                    t.x,
                    e,
                    ur,
                    null == n ? void 0 : n.x,
                    null == r ? void 0 : r.x
                ),
                    sr(
                        t.y,
                        e,
                        lr,
                        null == n ? void 0 : n.y,
                        null == r ? void 0 : r.y
                    )
            }
            function dr(t) {
                return 0 === t.translate && 1 === t.scale
            }
            function pr(t) {
                return dr(t.x) && dr(t.y)
            }
            function fr(t, e) {
                return (
                    t.x.min === e.x.min &&
                    t.x.max === e.x.max &&
                    t.y.min === e.y.min &&
                    t.y.max === e.y.max
                )
            }
            var vr = n(6270),
                hr = (function () {
                    function t() {
                        this.members = []
                    }
                    return (
                        (t.prototype.add = function (t) {
                            ;(0, vr.y4)(this.members, t), t.scheduleRender()
                        }),
                        (t.prototype.remove = function (t) {
                            if (
                                ((0, vr.cl)(this.members, t),
                                t === this.prevLead && (this.prevLead = void 0),
                                t === this.lead)
                            ) {
                                var e = this.members[this.members.length - 1]
                                e && this.promote(e)
                            }
                        }),
                        (t.prototype.relegate = function (t) {
                            var e,
                                n = this.members.findIndex(function (e) {
                                    return t === e
                                })
                            if (0 === n) return !1
                            for (var r = n; r >= 0; r--) {
                                var o = this.members[r]
                                if (!1 !== o.isPresent) {
                                    e = o
                                    break
                                }
                            }
                            return !!e && (this.promote(e), !0)
                        }),
                        (t.prototype.promote = function (t, e) {
                            var n,
                                r = this.lead
                            t !== r &&
                                ((this.prevLead = r),
                                (this.lead = t),
                                t.show(),
                                r &&
                                    (r.instance && r.scheduleRender(),
                                    t.scheduleRender(),
                                    (t.resumeFrom = r),
                                    e && (t.resumeFrom.preserveOpacity = !0),
                                    r.snapshot &&
                                        ((t.snapshot = r.snapshot),
                                        (t.snapshot.latestValues =
                                            r.animationValues ||
                                            r.latestValues),
                                        (t.snapshot.isShared = !0)),
                                    (null === (n = t.root) || void 0 === n
                                        ? void 0
                                        : n.isUpdating) &&
                                        (t.isLayoutDirty = !0),
                                    !1 === t.options.crossfade && r.hide()))
                        }),
                        (t.prototype.exitAnimationComplete = function () {
                            this.members.forEach(function (t) {
                                var e, n, r, o, i
                                null === (n = (e = t.options).onExitComplete) ||
                                    void 0 === n ||
                                    n.call(e),
                                    null ===
                                        (i =
                                            null === (r = t.resumingFrom) ||
                                            void 0 === r
                                                ? void 0
                                                : (o = r.options)
                                                      .onExitComplete) ||
                                        void 0 === i ||
                                        i.call(o)
                            })
                        }),
                        (t.prototype.scheduleRender = function () {
                            this.members.forEach(function (t) {
                                t.instance && t.scheduleRender(!1)
                            })
                        }),
                        (t.prototype.removeLeadSnapshot = function () {
                            this.lead &&
                                this.lead.snapshot &&
                                (this.lead.snapshot = void 0)
                        }),
                        t
                    )
                })()
            function mr(t, e, n) {
                var r = t.x.translate / e.x,
                    o = t.y.translate / e.y,
                    i = "translate3d(".concat(r, "px, ").concat(o, "px, 0) ")
                if (
                    ((i += "scale("
                        .concat(1 / e.x, ", ")
                        .concat(1 / e.y, ") ")),
                    n)
                ) {
                    var a = n.rotate,
                        s = n.rotateX,
                        u = n.rotateY
                    a && (i += "rotate(".concat(a, "deg) ")),
                        s && (i += "rotateX(".concat(s, "deg) ")),
                        u && (i += "rotateY(".concat(u, "deg) "))
                }
                var l = t.x.scale * e.x,
                    c = t.y.scale * e.y
                return "translate3d(0px, 0px, 0) scale(1, 1) scale(1, 1)" ===
                    (i += "scale(".concat(l, ", ").concat(c, ")"))
                    ? "none"
                    : i
            }
            var gr = function (t, e) {
                    return t.depth - e.depth
                },
                yr = (function () {
                    function t() {
                        ;(this.children = []), (this.isDirty = !1)
                    }
                    return (
                        (t.prototype.add = function (t) {
                            ;(0, vr.y4)(this.children, t), (this.isDirty = !0)
                        }),
                        (t.prototype.remove = function (t) {
                            ;(0, vr.cl)(this.children, t), (this.isDirty = !0)
                        }),
                        (t.prototype.forEach = function (t) {
                            this.isDirty && this.children.sort(gr),
                                (this.isDirty = !1),
                                this.children.forEach(t)
                        }),
                        t
                    )
                })()
            function xr(t) {
                var e = t.attachResizeListener,
                    n = t.defaultParent,
                    o = t.measureScroll,
                    i = t.checkIsScrollRoot,
                    a = t.resetTransform
                return (function () {
                    function t(t, e, o) {
                        var i = this
                        void 0 === e && (e = {}),
                            void 0 === o && (o = null == n ? void 0 : n()),
                            (this.children = new Set()),
                            (this.options = {}),
                            (this.isTreeAnimating = !1),
                            (this.isAnimationBlocked = !1),
                            (this.isLayoutDirty = !1),
                            (this.updateManuallyBlocked = !1),
                            (this.updateBlockedByResize = !1),
                            (this.isUpdating = !1),
                            (this.isSVG = !1),
                            (this.needsReset = !1),
                            (this.shouldResetTransform = !1),
                            (this.treeScale = { x: 1, y: 1 }),
                            (this.eventHandlers = new Map()),
                            (this.potentialNodes = new Map()),
                            (this.checkUpdateFailed = function () {
                                i.isUpdating &&
                                    ((i.isUpdating = !1), i.clearAllSnapshots())
                            }),
                            (this.updateProjection = function () {
                                i.nodes.forEach(Tr), i.nodes.forEach(Rr)
                            }),
                            (this.hasProjected = !1),
                            (this.isVisible = !0),
                            (this.animationProgress = 0),
                            (this.sharedNodes = new Map()),
                            (this.id = t),
                            (this.latestValues = e),
                            (this.root = o ? o.root || o : this),
                            (this.path = o
                                ? (0, r.ev)(
                                      (0, r.ev)([], (0, r.CR)(o.path), !1),
                                      [o],
                                      !1
                                  )
                                : []),
                            (this.parent = o),
                            (this.depth = o ? o.depth + 1 : 0),
                            t && this.root.registerPotentialNode(t, this)
                        for (var a = 0; a < this.path.length; a++)
                            this.path[a].shouldResetTransform = !0
                        this.root === this && (this.nodes = new yr())
                    }
                    return (
                        (t.prototype.addEventListener = function (t, e) {
                            return (
                                this.eventHandlers.has(t) ||
                                    this.eventHandlers.set(t, new pn.L()),
                                this.eventHandlers.get(t).add(e)
                            )
                        }),
                        (t.prototype.notifyListeners = function (t) {
                            for (var e = [], n = 1; n < arguments.length; n++)
                                e[n - 1] = arguments[n]
                            var o = this.eventHandlers.get(t)
                            null == o ||
                                o.notify.apply(
                                    o,
                                    (0, r.ev)([], (0, r.CR)(e), !1)
                                )
                        }),
                        (t.prototype.hasListeners = function (t) {
                            return this.eventHandlers.has(t)
                        }),
                        (t.prototype.registerPotentialNode = function (t, e) {
                            this.potentialNodes.set(t, e)
                        }),
                        (t.prototype.mount = function (t, n) {
                            var o,
                                i = this
                            if ((void 0 === n && (n = !1), !this.instance)) {
                                ;(this.isSVG =
                                    t instanceof SVGElement &&
                                    "svg" !== t.tagName),
                                    (this.instance = t)
                                var a = this.options,
                                    s = a.layoutId,
                                    u = a.layout,
                                    l = a.visualElement
                                if (
                                    (l && !l.getInstance() && l.mount(t),
                                    this.root.nodes.add(this),
                                    null === (o = this.parent) ||
                                        void 0 === o ||
                                        o.children.add(this),
                                    this.id &&
                                        this.root.potentialNodes.delete(
                                            this.id
                                        ),
                                    n && (u || s) && (this.isLayoutDirty = !0),
                                    e)
                                ) {
                                    var c,
                                        d = function () {
                                            return (i.root.updateBlockedByResize =
                                                !1)
                                        }
                                    e(t, function () {
                                        ;(i.root.updateBlockedByResize = !0),
                                            clearTimeout(c),
                                            (c = window.setTimeout(d, 250)),
                                            T.hasAnimatedSinceResize &&
                                                ((T.hasAnimatedSinceResize =
                                                    !1),
                                                i.nodes.forEach(Pr))
                                    })
                                }
                                s && this.root.registerSharedNode(s, this),
                                    !1 !== this.options.animate &&
                                        l &&
                                        (s || u) &&
                                        this.addEventListener(
                                            "didUpdate",
                                            function (t) {
                                                var e,
                                                    n,
                                                    o,
                                                    a,
                                                    s,
                                                    u = t.delta,
                                                    c = t.hasLayoutChanged,
                                                    d =
                                                        t.hasRelativeTargetChanged,
                                                    p = t.layout
                                                if (i.isTreeAnimationBlocked())
                                                    return (
                                                        (i.target = void 0),
                                                        void (i.relativeTarget =
                                                            void 0)
                                                    )
                                                var f =
                                                        null !==
                                                            (n =
                                                                null !==
                                                                    (e =
                                                                        i
                                                                            .options
                                                                            .transition) &&
                                                                void 0 !== e
                                                                    ? e
                                                                    : l.getDefaultTransition()) &&
                                                        void 0 !== n
                                                            ? n
                                                            : Zr,
                                                    v = l.getProps(),
                                                    h =
                                                        v.onLayoutAnimationStart,
                                                    m =
                                                        v.onLayoutAnimationComplete,
                                                    g =
                                                        !i.targetLayout ||
                                                        !fr(
                                                            i.targetLayout,
                                                            p
                                                        ) ||
                                                        d,
                                                    y = !c && d
                                                if (
                                                    (null ===
                                                        (o = i.resumeFrom) ||
                                                    void 0 === o
                                                        ? void 0
                                                        : o.instance) ||
                                                    y ||
                                                    (c &&
                                                        (g ||
                                                            !i.currentAnimation))
                                                ) {
                                                    i.resumeFrom &&
                                                        ((i.resumingFrom =
                                                            i.resumeFrom),
                                                        (i.resumingFrom.resumingFrom =
                                                            void 0)),
                                                        i.setAnimationOrigin(
                                                            u,
                                                            y
                                                        )
                                                    var x = (0, r.pi)(
                                                        (0, r.pi)(
                                                            {},
                                                            (0, an.ev)(
                                                                f,
                                                                "layout"
                                                            )
                                                        ),
                                                        {
                                                            onPlay: h,
                                                            onComplete: m
                                                        }
                                                    )
                                                    l.shouldReduceMotion &&
                                                        ((x.delay = 0),
                                                        (x.type = !1)),
                                                        i.startAnimation(x)
                                                } else
                                                    c ||
                                                        0 !==
                                                            i.animationProgress ||
                                                        i.finishAnimation(),
                                                        i.isLead() &&
                                                            (null ===
                                                                (s = (a =
                                                                    i.options)
                                                                    .onExitComplete) ||
                                                                void 0 === s ||
                                                                s.call(a))
                                                i.targetLayout = p
                                            }
                                        )
                            }
                        }),
                        (t.prototype.unmount = function () {
                            var t, e
                            this.options.layoutId && this.willUpdate(),
                                this.root.nodes.remove(this),
                                null === (t = this.getStack()) ||
                                    void 0 === t ||
                                    t.remove(this),
                                null === (e = this.parent) ||
                                    void 0 === e ||
                                    e.children.delete(this),
                                (this.instance = void 0),
                                ve.qY.preRender(this.updateProjection)
                        }),
                        (t.prototype.blockUpdate = function () {
                            this.updateManuallyBlocked = !0
                        }),
                        (t.prototype.unblockUpdate = function () {
                            this.updateManuallyBlocked = !1
                        }),
                        (t.prototype.isUpdateBlocked = function () {
                            return (
                                this.updateManuallyBlocked ||
                                this.updateBlockedByResize
                            )
                        }),
                        (t.prototype.isTreeAnimationBlocked = function () {
                            var t
                            return (
                                this.isAnimationBlocked ||
                                (null === (t = this.parent) || void 0 === t
                                    ? void 0
                                    : t.isTreeAnimationBlocked()) ||
                                !1
                            )
                        }),
                        (t.prototype.startUpdate = function () {
                            var t
                            this.isUpdateBlocked() ||
                                ((this.isUpdating = !0),
                                null === (t = this.nodes) ||
                                    void 0 === t ||
                                    t.forEach(Ar))
                        }),
                        (t.prototype.willUpdate = function (t) {
                            var e, n, r
                            if (
                                (void 0 === t && (t = !0),
                                this.root.isUpdateBlocked())
                            )
                                null ===
                                    (n = (e = this.options).onExitComplete) ||
                                    void 0 === n ||
                                    n.call(e)
                            else if (
                                (!this.root.isUpdating &&
                                    this.root.startUpdate(),
                                !this.isLayoutDirty)
                            ) {
                                this.isLayoutDirty = !0
                                for (var o = 0; o < this.path.length; o++) {
                                    var i = this.path[o]
                                    ;(i.shouldResetTransform = !0),
                                        i.updateScroll()
                                }
                                var a = this.options,
                                    s = a.layoutId,
                                    u = a.layout
                                if (void 0 !== s || u) {
                                    var l =
                                        null ===
                                            (r = this.options.visualElement) ||
                                        void 0 === r
                                            ? void 0
                                            : r.getProps().transformTemplate
                                    ;(this.prevTransformTemplateValue =
                                        null == l
                                            ? void 0
                                            : l(this.latestValues, "")),
                                        this.updateSnapshot(),
                                        t && this.notifyListeners("willUpdate")
                                }
                            }
                        }),
                        (t.prototype.didUpdate = function () {
                            if (this.isUpdateBlocked())
                                return (
                                    this.unblockUpdate(),
                                    this.clearAllSnapshots(),
                                    void this.nodes.forEach(Er)
                                )
                            this.isUpdating &&
                                ((this.isUpdating = !1),
                                this.potentialNodes.size &&
                                    (this.potentialNodes.forEach(jr),
                                    this.potentialNodes.clear()),
                                this.nodes.forEach(Cr),
                                this.nodes.forEach(br),
                                this.nodes.forEach(wr),
                                this.clearAllSnapshots(),
                                ve.iW.update(),
                                ve.iW.preRender(),
                                ve.iW.render())
                        }),
                        (t.prototype.clearAllSnapshots = function () {
                            this.nodes.forEach(Sr), this.sharedNodes.forEach(Mr)
                        }),
                        (t.prototype.scheduleUpdateProjection = function () {
                            ve.ZP.preRender(this.updateProjection, !1, !0)
                        }),
                        (t.prototype.scheduleCheckAfterUnmount = function () {
                            var t = this
                            ve.ZP.postRender(function () {
                                t.isLayoutDirty
                                    ? t.root.didUpdate()
                                    : t.root.checkUpdateFailed()
                            })
                        }),
                        (t.prototype.updateSnapshot = function () {
                            if (!this.snapshot && this.instance) {
                                var t = this.measure(),
                                    e = this.removeTransform(
                                        this.removeElementScroll(t)
                                    )
                                Dr(e),
                                    (this.snapshot = {
                                        measured: t,
                                        layout: e,
                                        latestValues: {}
                                    })
                            }
                        }),
                        (t.prototype.updateLayout = function () {
                            var t
                            if (
                                this.instance &&
                                (this.updateScroll(),
                                (this.options.alwaysMeasureLayout &&
                                    this.isLead()) ||
                                    this.isLayoutDirty)
                            ) {
                                if (
                                    this.resumeFrom &&
                                    !this.resumeFrom.instance
                                )
                                    for (var e = 0; e < this.path.length; e++) {
                                        this.path[e].updateScroll()
                                    }
                                var n = this.measure()
                                Dr(n)
                                var r = this.layout
                                ;(this.layout = {
                                    measured: n,
                                    actual: this.removeElementScroll(n)
                                }),
                                    (this.layoutCorrected = {
                                        x: { min: 0, max: 0 },
                                        y: { min: 0, max: 0 }
                                    }),
                                    (this.isLayoutDirty = !1),
                                    (this.projectionDelta = void 0),
                                    this.notifyListeners(
                                        "measure",
                                        this.layout.actual
                                    ),
                                    null === (t = this.options.visualElement) ||
                                        void 0 === t ||
                                        t.notifyLayoutMeasure(
                                            this.layout.actual,
                                            null == r ? void 0 : r.actual
                                        )
                            }
                        }),
                        (t.prototype.updateScroll = function () {
                            this.options.layoutScroll &&
                                this.instance &&
                                ((this.isScrollRoot = i(this.instance)),
                                (this.scroll = o(this.instance)))
                        }),
                        (t.prototype.resetTransform = function () {
                            var t
                            if (a) {
                                var e =
                                        this.isLayoutDirty ||
                                        this.shouldResetTransform,
                                    n =
                                        this.projectionDelta &&
                                        !pr(this.projectionDelta),
                                    r =
                                        null ===
                                            (t = this.options.visualElement) ||
                                        void 0 === t
                                            ? void 0
                                            : t.getProps().transformTemplate,
                                    o =
                                        null == r
                                            ? void 0
                                            : r(this.latestValues, ""),
                                    i = o !== this.prevTransformTemplateValue
                                e &&
                                    (n || Ye(this.latestValues) || i) &&
                                    (a(this.instance, o),
                                    (this.shouldResetTransform = !1),
                                    this.scheduleRender())
                            }
                        }),
                        (t.prototype.measure = function () {
                            var t = this.options.visualElement
                            if (!t)
                                return {
                                    x: { min: 0, max: 0 },
                                    y: { min: 0, max: 0 }
                                }
                            var e = t.measureViewportBox(),
                                n = this.root.scroll
                            return n && (Qe(e.x, n.x), Qe(e.y, n.y)), e
                        }),
                        (t.prototype.removeElementScroll = function (t) {
                            var e = {
                                x: { min: 0, max: 0 },
                                y: { min: 0, max: 0 }
                            }
                            ir(e, t)
                            for (var n = 0; n < this.path.length; n++) {
                                var r = this.path[n],
                                    o = r.scroll,
                                    i = r.options,
                                    a = r.isScrollRoot
                                if (r !== this.root && o && i.layoutScroll) {
                                    if (a) {
                                        ir(e, t)
                                        var s = this.root.scroll
                                        s && (Qe(e.x, -s.x), Qe(e.y, -s.y))
                                    }
                                    Qe(e.x, o.x), Qe(e.y, o.y)
                                }
                            }
                            return e
                        }),
                        (t.prototype.applyTransform = function (t, e) {
                            void 0 === e && (e = !1)
                            var n = {
                                x: { min: 0, max: 0 },
                                y: { min: 0, max: 0 }
                            }
                            ir(n, t)
                            for (var r = 0; r < this.path.length; r++) {
                                var o = this.path[r]
                                !e &&
                                    o.options.layoutScroll &&
                                    o.scroll &&
                                    o !== o.root &&
                                    rn(n, { x: -o.scroll.x, y: -o.scroll.y }),
                                    Ye(o.latestValues) && rn(n, o.latestValues)
                            }
                            return (
                                Ye(this.latestValues) &&
                                    rn(n, this.latestValues),
                                n
                            )
                        }),
                        (t.prototype.removeTransform = function (t) {
                            var e,
                                n = {
                                    x: { min: 0, max: 0 },
                                    y: { min: 0, max: 0 }
                                }
                            ir(n, t)
                            for (var r = 0; r < this.path.length; r++) {
                                var o = this.path[r]
                                if (o.instance && Ye(o.latestValues)) {
                                    _e(o.latestValues) && o.updateSnapshot()
                                    var i = {
                                        x: { min: 0, max: 0 },
                                        y: { min: 0, max: 0 }
                                    }
                                    ir(i, o.measure()),
                                        cr(
                                            n,
                                            o.latestValues,
                                            null === (e = o.snapshot) ||
                                                void 0 === e
                                                ? void 0
                                                : e.layout,
                                            i
                                        )
                                }
                            }
                            return (
                                Ye(this.latestValues) &&
                                    cr(n, this.latestValues),
                                n
                            )
                        }),
                        (t.prototype.setTargetDelta = function (t) {
                            ;(this.targetDelta = t),
                                this.root.scheduleUpdateProjection()
                        }),
                        (t.prototype.setOptions = function (t) {
                            var e
                            this.options = (0, r.pi)(
                                (0, r.pi)((0, r.pi)({}, this.options), t),
                                {
                                    crossfade:
                                        null === (e = t.crossfade) ||
                                        void 0 === e ||
                                        e
                                }
                            )
                        }),
                        (t.prototype.clearMeasurements = function () {
                            ;(this.scroll = void 0),
                                (this.layout = void 0),
                                (this.snapshot = void 0),
                                (this.prevTransformTemplateValue = void 0),
                                (this.targetDelta = void 0),
                                (this.target = void 0),
                                (this.isLayoutDirty = !1)
                        }),
                        (t.prototype.resolveTargetDelta = function () {
                            var t,
                                e,
                                n,
                                r,
                                o = this.options,
                                i = o.layout,
                                a = o.layoutId
                            this.layout &&
                                (i || a) &&
                                (this.targetDelta ||
                                    this.relativeTarget ||
                                    ((this.relativeParent =
                                        this.getClosestProjectingParent()),
                                    this.relativeParent &&
                                        this.relativeParent.layout &&
                                        ((this.relativeTarget = {
                                            x: { min: 0, max: 0 },
                                            y: { min: 0, max: 0 }
                                        }),
                                        (this.relativeTargetOrigin = {
                                            x: { min: 0, max: 0 },
                                            y: { min: 0, max: 0 }
                                        }),
                                        Be(
                                            this.relativeTargetOrigin,
                                            this.layout.actual,
                                            this.relativeParent.layout.actual
                                        ),
                                        ir(
                                            this.relativeTarget,
                                            this.relativeTargetOrigin
                                        ))),
                                (this.relativeTarget || this.targetDelta) &&
                                    (this.target ||
                                        ((this.target = {
                                            x: { min: 0, max: 0 },
                                            y: { min: 0, max: 0 }
                                        }),
                                        (this.targetWithTransforms = {
                                            x: { min: 0, max: 0 },
                                            y: { min: 0, max: 0 }
                                        })),
                                    this.relativeTarget &&
                                    this.relativeTargetOrigin &&
                                    (null === (t = this.relativeParent) ||
                                    void 0 === t
                                        ? void 0
                                        : t.target)
                                        ? ((e = this.target),
                                          (n = this.relativeTarget),
                                          (r = this.relativeParent.target),
                                          Oe(e.x, n.x, r.x),
                                          Oe(e.y, n.y, r.y))
                                        : this.targetDelta
                                        ? (Boolean(this.resumingFrom)
                                              ? (this.target =
                                                    this.applyTransform(
                                                        this.layout.actual
                                                    ))
                                              : ir(
                                                    this.target,
                                                    this.layout.actual
                                                ),
                                          Je(this.target, this.targetDelta))
                                        : ir(this.target, this.layout.actual),
                                    this.attemptToResolveRelativeTarget &&
                                        ((this.attemptToResolveRelativeTarget =
                                            !1),
                                        (this.relativeParent =
                                            this.getClosestProjectingParent()),
                                        this.relativeParent &&
                                            Boolean(
                                                this.relativeParent.resumingFrom
                                            ) === Boolean(this.resumingFrom) &&
                                            !this.relativeParent.options
                                                .layoutScroll &&
                                            this.relativeParent.target &&
                                            ((this.relativeTarget = {
                                                x: { min: 0, max: 0 },
                                                y: { min: 0, max: 0 }
                                            }),
                                            (this.relativeTargetOrigin = {
                                                x: { min: 0, max: 0 },
                                                y: { min: 0, max: 0 }
                                            }),
                                            Be(
                                                this.relativeTargetOrigin,
                                                this.target,
                                                this.relativeParent.target
                                            ),
                                            ir(
                                                this.relativeTarget,
                                                this.relativeTargetOrigin
                                            )))))
                        }),
                        (t.prototype.getClosestProjectingParent = function () {
                            if (this.parent && !Ye(this.parent.latestValues))
                                return (this.parent.relativeTarget ||
                                    this.parent.targetDelta) &&
                                    this.parent.layout
                                    ? this.parent
                                    : this.parent.getClosestProjectingParent()
                        }),
                        (t.prototype.calcProjection = function () {
                            var t,
                                e = this.options,
                                n = e.layout,
                                r = e.layoutId
                            if (
                                ((this.isTreeAnimating = Boolean(
                                    (null === (t = this.parent) || void 0 === t
                                        ? void 0
                                        : t.isTreeAnimating) ||
                                        this.currentAnimation ||
                                        this.pendingAnimation
                                )),
                                this.isTreeAnimating ||
                                    (this.targetDelta = this.relativeTarget =
                                        void 0),
                                this.layout && (n || r))
                            ) {
                                var o = this.getLead()
                                ir(this.layoutCorrected, this.layout.actual),
                                    (function (t, e, n, r) {
                                        var o, i
                                        void 0 === r && (r = !1)
                                        var a = n.length
                                        if (a) {
                                            var s, u
                                            e.x = e.y = 1
                                            for (var l = 0; l < a; l++)
                                                (u = (s = n[l])
                                                    .projectionDelta),
                                                    "contents" !==
                                                        (null ===
                                                            (i =
                                                                null ===
                                                                    (o =
                                                                        s.instance) ||
                                                                void 0 === o
                                                                    ? void 0
                                                                    : o.style) ||
                                                        void 0 === i
                                                            ? void 0
                                                            : i.display) &&
                                                        (r &&
                                                            s.options
                                                                .layoutScroll &&
                                                            s.scroll &&
                                                            s !== s.root &&
                                                            rn(t, {
                                                                x: -s.scroll.x,
                                                                y: -s.scroll.y
                                                            }),
                                                        u &&
                                                            ((e.x *= u.x.scale),
                                                            (e.y *= u.y.scale),
                                                            Je(t, u)),
                                                        r &&
                                                            Ye(
                                                                s.latestValues
                                                            ) &&
                                                            rn(
                                                                t,
                                                                s.latestValues
                                                            ))
                                        }
                                    })(
                                        this.layoutCorrected,
                                        this.treeScale,
                                        this.path,
                                        Boolean(this.resumingFrom) || this !== o
                                    )
                                var i = o.target
                                if (i) {
                                    this.projectionDelta ||
                                        ((this.projectionDelta = {
                                            x: {
                                                translate: 0,
                                                scale: 1,
                                                origin: 0,
                                                originPoint: 0
                                            },
                                            y: {
                                                translate: 0,
                                                scale: 1,
                                                origin: 0,
                                                originPoint: 0
                                            }
                                        }),
                                        (this.projectionDeltaWithTransform = {
                                            x: {
                                                translate: 0,
                                                scale: 1,
                                                origin: 0,
                                                originPoint: 0
                                            },
                                            y: {
                                                translate: 0,
                                                scale: 1,
                                                origin: 0,
                                                originPoint: 0
                                            }
                                        }))
                                    var a = this.treeScale.x,
                                        s = this.treeScale.y,
                                        u = this.projectionTransform
                                    je(
                                        this.projectionDelta,
                                        this.layoutCorrected,
                                        i,
                                        this.latestValues
                                    ),
                                        (this.projectionTransform = mr(
                                            this.projectionDelta,
                                            this.treeScale
                                        )),
                                        (this.projectionTransform === u &&
                                            this.treeScale.x === a &&
                                            this.treeScale.y === s) ||
                                            ((this.hasProjected = !0),
                                            this.scheduleRender(),
                                            this.notifyListeners(
                                                "projectionUpdate",
                                                i
                                            ))
                                }
                            }
                        }),
                        (t.prototype.hide = function () {
                            this.isVisible = !1
                        }),
                        (t.prototype.show = function () {
                            this.isVisible = !0
                        }),
                        (t.prototype.scheduleRender = function (t) {
                            var e, n, r
                            void 0 === t && (t = !0),
                                null ===
                                    (n = (e = this.options).scheduleRender) ||
                                    void 0 === n ||
                                    n.call(e),
                                t &&
                                    (null === (r = this.getStack()) ||
                                        void 0 === r ||
                                        r.scheduleRender()),
                                this.resumingFrom &&
                                    !this.resumingFrom.instance &&
                                    (this.resumingFrom = void 0)
                        }),
                        (t.prototype.setAnimationOrigin = function (t, e) {
                            var n,
                                o = this
                            void 0 === e && (e = !1)
                            var i = this.snapshot,
                                a = (null == i ? void 0 : i.latestValues) || {},
                                s = (0, r.pi)({}, this.latestValues),
                                u = {
                                    x: {
                                        translate: 0,
                                        scale: 1,
                                        origin: 0,
                                        originPoint: 0
                                    },
                                    y: {
                                        translate: 0,
                                        scale: 1,
                                        origin: 0,
                                        originPoint: 0
                                    }
                                }
                            ;(this.relativeTarget = this.relativeTargetOrigin =
                                void 0),
                                (this.attemptToResolveRelativeTarget = !e)
                            var l = {
                                    x: { min: 0, max: 0 },
                                    y: { min: 0, max: 0 }
                                },
                                c = null == i ? void 0 : i.isShared,
                                d =
                                    ((null === (n = this.getStack()) ||
                                    void 0 === n
                                        ? void 0
                                        : n.members.length) || 0) <= 1,
                                p = Boolean(
                                    c &&
                                        !d &&
                                        !0 === this.options.crossfade &&
                                        !this.path.some(Lr)
                                )
                            ;(this.animationProgress = 0),
                                (this.mixTargetDelta = function (e) {
                                    var n,
                                        r,
                                        i,
                                        f,
                                        v,
                                        h = e / 1e3
                                    Vr(u.x, t.x, h),
                                        Vr(u.y, t.y, h),
                                        o.setTargetDelta(u),
                                        o.relativeTarget &&
                                            o.relativeTargetOrigin &&
                                            o.layout &&
                                            (null === (n = o.relativeParent) ||
                                            void 0 === n
                                                ? void 0
                                                : n.layout) &&
                                            (Be(
                                                l,
                                                o.layout.actual,
                                                o.relativeParent.layout.actual
                                            ),
                                            (r = o.relativeTarget),
                                            (i = o.relativeTargetOrigin),
                                            (f = l),
                                            (v = h),
                                            kr(r.x, i.x, f.x, v),
                                            kr(r.y, i.y, f.y, v)),
                                        c &&
                                            ((o.animationValues = s),
                                            (function (t, e, n, r, o, i) {
                                                var a, s, u, l
                                                o
                                                    ? ((t.opacity = (0, Ae.C)(
                                                          0,
                                                          null !==
                                                              (a = n.opacity) &&
                                                              void 0 !== a
                                                              ? a
                                                              : 1,
                                                          er(r)
                                                      )),
                                                      (t.opacityExit = (0,
                                                      Ae.C)(
                                                          null !==
                                                              (s = e.opacity) &&
                                                              void 0 !== s
                                                              ? s
                                                              : 1,
                                                          0,
                                                          nr(r)
                                                      )))
                                                    : i &&
                                                      (t.opacity = (0, Ae.C)(
                                                          null !==
                                                              (u = e.opacity) &&
                                                              void 0 !== u
                                                              ? u
                                                              : 1,
                                                          null !==
                                                              (l = n.opacity) &&
                                                              void 0 !== l
                                                              ? l
                                                              : 1,
                                                          r
                                                      ))
                                                for (var c = 0; c < Kn; c++) {
                                                    var d = "border".concat(
                                                            Gn[c],
                                                            "Radius"
                                                        ),
                                                        p = tr(e, d),
                                                        f = tr(n, d)
                                                    ;(void 0 === p &&
                                                        void 0 === f) ||
                                                        (p || (p = 0),
                                                        f || (f = 0),
                                                        0 === p ||
                                                        0 === f ||
                                                        Qn(p) === Qn(f)
                                                            ? ((t[d] = Math.max(
                                                                  (0, Ae.C)(
                                                                      Jn(p),
                                                                      Jn(f),
                                                                      r
                                                                  ),
                                                                  0
                                                              )),
                                                              (J.aQ.test(f) ||
                                                                  J.aQ.test(
                                                                      p
                                                                  )) &&
                                                                  (t[d] += "%"))
                                                            : (t[d] = f))
                                                }
                                                ;(e.rotate || n.rotate) &&
                                                    (t.rotate = (0, Ae.C)(
                                                        e.rotate || 0,
                                                        n.rotate || 0,
                                                        r
                                                    ))
                                            })(s, a, o.latestValues, h, p, d)),
                                        o.root.scheduleUpdateProjection(),
                                        o.scheduleRender(),
                                        (o.animationProgress = h)
                                }),
                                this.mixTargetDelta(0)
                        }),
                        (t.prototype.startAnimation = function (t) {
                            var e,
                                n,
                                o = this
                            this.notifyListeners("animationStart"),
                                null === (e = this.currentAnimation) ||
                                    void 0 === e ||
                                    e.stop(),
                                this.resumingFrom &&
                                    (null ===
                                        (n =
                                            this.resumingFrom
                                                .currentAnimation) ||
                                        void 0 === n ||
                                        n.stop()),
                                this.pendingAnimation &&
                                    (ve.qY.update(this.pendingAnimation),
                                    (this.pendingAnimation = void 0)),
                                (this.pendingAnimation = ve.ZP.update(
                                    function () {
                                        ;(T.hasAnimatedSinceResize = !0),
                                            (o.currentAnimation = (function (
                                                t,
                                                e,
                                                n
                                            ) {
                                                void 0 === n && (n = {})
                                                var r = I(t) ? t : (0, dn.B)(t)
                                                return (
                                                    (0, an.b8)("", r, e, n),
                                                    {
                                                        stop: function () {
                                                            return r.stop()
                                                        },
                                                        isAnimating:
                                                            function () {
                                                                return r.isAnimating()
                                                            }
                                                    }
                                                )
                                            })(
                                                0,
                                                1e3,
                                                (0, r.pi)((0, r.pi)({}, t), {
                                                    onUpdate: function (e) {
                                                        var n
                                                        o.mixTargetDelta(e),
                                                            null ===
                                                                (n =
                                                                    t.onUpdate) ||
                                                                void 0 === n ||
                                                                n.call(t, e)
                                                    },
                                                    onComplete: function () {
                                                        var e
                                                        null ===
                                                            (e =
                                                                t.onComplete) ||
                                                            void 0 === e ||
                                                            e.call(t),
                                                            o.completeAnimation()
                                                    }
                                                })
                                            )),
                                            o.resumingFrom &&
                                                (o.resumingFrom.currentAnimation =
                                                    o.currentAnimation),
                                            (o.pendingAnimation = void 0)
                                    }
                                ))
                        }),
                        (t.prototype.completeAnimation = function () {
                            var t
                            this.resumingFrom &&
                                ((this.resumingFrom.currentAnimation = void 0),
                                (this.resumingFrom.preserveOpacity = void 0)),
                                null === (t = this.getStack()) ||
                                    void 0 === t ||
                                    t.exitAnimationComplete(),
                                (this.resumingFrom =
                                    this.currentAnimation =
                                    this.animationValues =
                                        void 0),
                                this.notifyListeners("animationComplete")
                        }),
                        (t.prototype.finishAnimation = function () {
                            var t
                            this.currentAnimation &&
                                (null === (t = this.mixTargetDelta) ||
                                    void 0 === t ||
                                    t.call(this, 1e3),
                                this.currentAnimation.stop()),
                                this.completeAnimation()
                        }),
                        (t.prototype.applyTransformsToTarget = function () {
                            var t = this.getLead(),
                                e = t.targetWithTransforms,
                                n = t.target,
                                r = t.layout,
                                o = t.latestValues
                            e &&
                                n &&
                                r &&
                                (ir(e, n),
                                rn(e, o),
                                je(
                                    this.projectionDeltaWithTransform,
                                    this.layoutCorrected,
                                    e,
                                    o
                                ))
                        }),
                        (t.prototype.registerSharedNode = function (t, e) {
                            var n, r, o
                            this.sharedNodes.has(t) ||
                                this.sharedNodes.set(t, new hr()),
                                this.sharedNodes.get(t).add(e),
                                e.promote({
                                    transition:
                                        null ===
                                            (n =
                                                e.options
                                                    .initialPromotionConfig) ||
                                        void 0 === n
                                            ? void 0
                                            : n.transition,
                                    preserveFollowOpacity:
                                        null ===
                                            (o =
                                                null ===
                                                    (r =
                                                        e.options
                                                            .initialPromotionConfig) ||
                                                void 0 === r
                                                    ? void 0
                                                    : r.shouldPreserveFollowOpacity) ||
                                        void 0 === o
                                            ? void 0
                                            : o.call(r, e)
                                })
                        }),
                        (t.prototype.isLead = function () {
                            var t = this.getStack()
                            return !t || t.lead === this
                        }),
                        (t.prototype.getLead = function () {
                            var t
                            return (
                                (this.options.layoutId &&
                                    (null === (t = this.getStack()) ||
                                    void 0 === t
                                        ? void 0
                                        : t.lead)) ||
                                this
                            )
                        }),
                        (t.prototype.getPrevLead = function () {
                            var t
                            return this.options.layoutId
                                ? null === (t = this.getStack()) || void 0 === t
                                    ? void 0
                                    : t.prevLead
                                : void 0
                        }),
                        (t.prototype.getStack = function () {
                            var t = this.options.layoutId
                            if (t) return this.root.sharedNodes.get(t)
                        }),
                        (t.prototype.promote = function (t) {
                            var e = void 0 === t ? {} : t,
                                n = e.needsReset,
                                r = e.transition,
                                o = e.preserveFollowOpacity,
                                i = this.getStack()
                            i && i.promote(this, o),
                                n &&
                                    ((this.projectionDelta = void 0),
                                    (this.needsReset = !0)),
                                r && this.setOptions({ transition: r })
                        }),
                        (t.prototype.relegate = function () {
                            var t = this.getStack()
                            return !!t && t.relegate(this)
                        }),
                        (t.prototype.resetRotation = function () {
                            var t = this.options.visualElement
                            if (t) {
                                for (
                                    var e = !1, n = {}, r = 0;
                                    r < D.r$.length;
                                    r++
                                ) {
                                    var o = "rotate" + D.r$[r]
                                    t.getStaticValue(o) &&
                                        ((e = !0),
                                        (n[o] = t.getStaticValue(o)),
                                        t.setStaticValue(o, 0))
                                }
                                if (e) {
                                    for (var o in (null == t || t.syncRender(),
                                    n))
                                        t.setStaticValue(o, n[o])
                                    t.scheduleRender()
                                }
                            }
                        }),
                        (t.prototype.getProjectionStyles = function (t) {
                            var e, n, r, o, i, a
                            void 0 === t && (t = {})
                            var s = {}
                            if (!this.instance || this.isSVG) return s
                            if (!this.isVisible) return { visibility: "hidden" }
                            s.visibility = ""
                            var u =
                                null === (e = this.options.visualElement) ||
                                void 0 === e
                                    ? void 0
                                    : e.getProps().transformTemplate
                            if (this.needsReset)
                                return (
                                    (this.needsReset = !1),
                                    (s.opacity = ""),
                                    (s.pointerEvents =
                                        ht(t.pointerEvents) || ""),
                                    (s.transform = u
                                        ? u(this.latestValues, "")
                                        : "none"),
                                    s
                                )
                            var l = this.getLead()
                            if (
                                !this.projectionDelta ||
                                !this.layout ||
                                !l.target
                            ) {
                                var c = {}
                                return (
                                    this.options.layoutId &&
                                        ((c.opacity =
                                            null !==
                                                (n =
                                                    this.latestValues
                                                        .opacity) &&
                                            void 0 !== n
                                                ? n
                                                : 1),
                                        (c.pointerEvents =
                                            ht(t.pointerEvents) || "")),
                                    this.hasProjected &&
                                        !Ye(this.latestValues) &&
                                        ((c.transform = u ? u({}, "") : "none"),
                                        (this.hasProjected = !1)),
                                    c
                                )
                            }
                            var d = l.animationValues || l.latestValues
                            this.applyTransformsToTarget(),
                                (s.transform = mr(
                                    this.projectionDeltaWithTransform,
                                    this.treeScale,
                                    d
                                )),
                                u && (s.transform = u(d, s.transform))
                            var p = this.projectionDelta,
                                f = p.x,
                                v = p.y
                            for (var h in ((s.transformOrigin = ""
                                .concat(100 * f.origin, "% ")
                                .concat(100 * v.origin, "% 0")),
                            l.animationValues
                                ? (s.opacity =
                                      l === this
                                          ? null !==
                                                (o =
                                                    null !== (r = d.opacity) &&
                                                    void 0 !== r
                                                        ? r
                                                        : this.latestValues
                                                              .opacity) &&
                                            void 0 !== o
                                              ? o
                                              : 1
                                          : this.preserveOpacity
                                          ? this.latestValues.opacity
                                          : d.opacityExit)
                                : (s.opacity =
                                      l === this
                                          ? null !== (i = d.opacity) &&
                                            void 0 !== i
                                              ? i
                                              : ""
                                          : null !== (a = d.opacityExit) &&
                                            void 0 !== a
                                          ? a
                                          : 0),
                            O))
                                if (void 0 !== d[h]) {
                                    var m = O[h],
                                        g = m.correct,
                                        y = m.applyTo,
                                        x = g(d[h], l)
                                    if (y)
                                        for (
                                            var b = y.length, w = 0;
                                            w < b;
                                            w++
                                        )
                                            s[y[w]] = x
                                    else s[h] = x
                                }
                            return (
                                this.options.layoutId &&
                                    (s.pointerEvents =
                                        l === this
                                            ? ht(t.pointerEvents) || ""
                                            : "none"),
                                s
                            )
                        }),
                        (t.prototype.clearSnapshot = function () {
                            this.resumeFrom = this.snapshot = void 0
                        }),
                        (t.prototype.resetTree = function () {
                            this.root.nodes.forEach(function (t) {
                                var e
                                return null === (e = t.currentAnimation) ||
                                    void 0 === e
                                    ? void 0
                                    : e.stop()
                            }),
                                this.root.nodes.forEach(Er),
                                this.root.sharedNodes.clear()
                        }),
                        t
                    )
                })()
            }
            function br(t) {
                t.updateLayout()
            }
            function wr(t) {
                var e,
                    n,
                    r,
                    o,
                    i =
                        null !==
                            (n =
                                null === (e = t.resumeFrom) || void 0 === e
                                    ? void 0
                                    : e.snapshot) && void 0 !== n
                            ? n
                            : t.snapshot
                if (
                    t.isLead() &&
                    t.layout &&
                    i &&
                    t.hasListeners("didUpdate")
                ) {
                    var a = t.layout,
                        s = a.actual,
                        u = a.measured
                    "size" === t.options.animationType
                        ? Ue(function (t) {
                              var e = i.isShared ? i.measured[t] : i.layout[t],
                                  n = ke(e)
                              ;(e.min = s[t].min), (e.max = e.min + n)
                          })
                        : "position" === t.options.animationType &&
                          Ue(function (t) {
                              var e = i.isShared ? i.measured[t] : i.layout[t],
                                  n = ke(s[t])
                              e.max = e.min + n
                          })
                    var l = {
                        x: {
                            translate: 0,
                            scale: 1,
                            origin: 0,
                            originPoint: 0
                        },
                        y: { translate: 0, scale: 1, origin: 0, originPoint: 0 }
                    }
                    je(l, s, i.layout)
                    var c = {
                        x: {
                            translate: 0,
                            scale: 1,
                            origin: 0,
                            originPoint: 0
                        },
                        y: { translate: 0, scale: 1, origin: 0, originPoint: 0 }
                    }
                    i.isShared
                        ? je(c, t.applyTransform(u, !0), i.measured)
                        : je(c, s, i.layout)
                    var d = !pr(l),
                        p = !1
                    if (
                        !t.resumeFrom &&
                        ((t.relativeParent = t.getClosestProjectingParent()),
                        t.relativeParent && !t.relativeParent.resumeFrom)
                    ) {
                        var f = t.relativeParent,
                            v = f.snapshot,
                            h = f.layout
                        if (v && h) {
                            var m = {
                                x: { min: 0, max: 0 },
                                y: { min: 0, max: 0 }
                            }
                            Be(m, i.layout, v.layout)
                            var g = {
                                x: { min: 0, max: 0 },
                                y: { min: 0, max: 0 }
                            }
                            Be(g, s, h.actual), fr(m, g) || (p = !0)
                        }
                    }
                    t.notifyListeners("didUpdate", {
                        layout: s,
                        snapshot: i,
                        delta: c,
                        layoutDelta: l,
                        hasLayoutChanged: d,
                        hasRelativeTargetChanged: p
                    })
                } else
                    t.isLead() &&
                        (null === (o = (r = t.options).onExitComplete) ||
                            void 0 === o ||
                            o.call(r))
                t.options.transition = void 0
            }
            function Sr(t) {
                t.clearSnapshot()
            }
            function Er(t) {
                t.clearMeasurements()
            }
            function Cr(t) {
                var e = t.options.visualElement
                ;(null == e ? void 0 : e.getProps().onBeforeLayoutMeasure) &&
                    e.notifyBeforeLayoutMeasure(),
                    t.resetTransform()
            }
            function Pr(t) {
                t.finishAnimation(),
                    (t.targetDelta = t.relativeTarget = t.target = void 0)
            }
            function Tr(t) {
                t.resolveTargetDelta()
            }
            function Rr(t) {
                t.calcProjection()
            }
            function Ar(t) {
                t.resetRotation()
            }
            function Mr(t) {
                t.removeLeadSnapshot()
            }
            function Vr(t, e, n) {
                ;(t.translate = (0, Ae.C)(e.translate, 0, n)),
                    (t.scale = (0, Ae.C)(e.scale, 1, n)),
                    (t.origin = e.origin),
                    (t.originPoint = e.originPoint)
            }
            function kr(t, e, n, r) {
                ;(t.min = (0, Ae.C)(e.min, n.min, r)),
                    (t.max = (0, Ae.C)(e.max, n.max, r))
            }
            function Lr(t) {
                return (
                    t.animationValues &&
                    void 0 !== t.animationValues.opacityExit
                )
            }
            var Zr = { duration: 0.45, ease: [0.4, 0, 0.1, 1] }
            function jr(t, e) {
                for (var n = t.root, r = t.path.length - 1; r >= 0; r--)
                    if (Boolean(t.path[r].instance)) {
                        n = t.path[r]
                        break
                    }
                var o = (
                    n && n !== t.root ? n.instance : document
                ).querySelector('[data-projection-id="'.concat(e, '"]'))
                o && t.mount(o, !0)
            }
            function Or(t) {
                ;(t.min = Math.round(t.min)), (t.max = Math.round(t.max))
            }
            function Dr(t) {
                Or(t.x), Or(t.y)
            }
            var Br = xr({
                    attachResizeListener: function (t, e) {
                        return St(t, "resize", e)
                    },
                    measureScroll: function () {
                        return {
                            x:
                                document.documentElement.scrollLeft ||
                                document.body.scrollLeft,
                            y:
                                document.documentElement.scrollTop ||
                                document.body.scrollTop
                        }
                    },
                    checkIsScrollRoot: function () {
                        return !0
                    }
                }),
                Ir = { current: void 0 },
                Fr = xr({
                    measureScroll: function (t) {
                        return { x: t.scrollLeft, y: t.scrollTop }
                    },
                    defaultParent: function () {
                        if (!Ir.current) {
                            var t = new Br(0, {})
                            t.mount(window),
                                t.setOptions({ layoutScroll: !0 }),
                                (Ir.current = t)
                        }
                        return Ir.current
                    },
                    resetTransform: function (t, e) {
                        t.style.transform = null != e ? e : "none"
                    },
                    checkIsScrollRoot: function (t) {
                        return Boolean(
                            "fixed" === window.getComputedStyle(t).position
                        )
                    }
                }),
                zr = (0, r.pi)(
                    (0, r.pi)((0, r.pi)((0, r.pi)({}, fe), ee), cn),
                    qn
                ),
                Nr = L(function (t, e) {
                    return (function (t, e, n, o, i) {
                        var a = e.forwardMotionProps,
                            s = void 0 !== a && a,
                            u = j(t) ? bt : wt
                        return (0,
                        r.pi)((0, r.pi)({}, u), { preloadedFeatures: n, useRender: it(s), createVisualElement: o, projectionNodeConstructor: i, Component: t })
                    })(t, e, zr, zn, Fr)
                })
        },
        7203: (t, e, n) => {
            "use strict"
            n.d(e, { T: () => a })
            var r = n(2513),
                o = n(1928),
                i = n(7245)
            function a(t, e) {
                var n,
                    a = (0, i.A)(t)
                return (
                    a !== r.h && (a = o.P),
                    null === (n = a.getAnimatableNone) || void 0 === n
                        ? void 0
                        : n.call(a, e)
                )
            }
        },
        7245: (t, e, n) => {
            "use strict"
            n.d(e, { A: () => u })
            var r = n(677),
                o = n(9872),
                i = n(2513),
                a = n(3766),
                s = (0, r.pi)((0, r.pi)({}, a.j), {
                    color: o.$,
                    backgroundColor: o.$,
                    outlineColor: o.$,
                    fill: o.$,
                    stroke: o.$,
                    borderColor: o.$,
                    borderTopColor: o.$,
                    borderRightColor: o.$,
                    borderBottomColor: o.$,
                    borderLeftColor: o.$,
                    filter: i.h,
                    WebkitFilter: i.h
                }),
                u = function (t) {
                    return s[t]
                }
        },
        5466: (t, e, n) => {
            "use strict"
            n.d(e, { $: () => a, C: () => s })
            var r = n(9707),
                o = n(6939),
                i = n(635),
                a = [
                    r.Rx,
                    o.px,
                    o.aQ,
                    o.RW,
                    o.vw,
                    o.vh,
                    {
                        test: function (t) {
                            return "auto" === t
                        },
                        parse: function (t) {
                            return t
                        }
                    }
                ],
                s = function (t) {
                    return a.find((0, i.l)(t))
                }
        },
        3766: (t, e, n) => {
            "use strict"
            n.d(e, { j: () => s })
            var r = n(6939),
                o = n(9707),
                i = n(677),
                a = (0, i.pi)((0, i.pi)({}, o.Rx), { transform: Math.round }),
                s = {
                    borderWidth: r.px,
                    borderTopWidth: r.px,
                    borderRightWidth: r.px,
                    borderBottomWidth: r.px,
                    borderLeftWidth: r.px,
                    borderRadius: r.px,
                    radius: r.px,
                    borderTopLeftRadius: r.px,
                    borderTopRightRadius: r.px,
                    borderBottomRightRadius: r.px,
                    borderBottomLeftRadius: r.px,
                    width: r.px,
                    maxWidth: r.px,
                    height: r.px,
                    maxHeight: r.px,
                    size: r.px,
                    top: r.px,
                    right: r.px,
                    bottom: r.px,
                    left: r.px,
                    padding: r.px,
                    paddingTop: r.px,
                    paddingRight: r.px,
                    paddingBottom: r.px,
                    paddingLeft: r.px,
                    margin: r.px,
                    marginTop: r.px,
                    marginRight: r.px,
                    marginBottom: r.px,
                    marginLeft: r.px,
                    rotate: r.RW,
                    rotateX: r.RW,
                    rotateY: r.RW,
                    rotateZ: r.RW,
                    scale: o.bA,
                    scaleX: o.bA,
                    scaleY: o.bA,
                    scaleZ: o.bA,
                    skew: r.RW,
                    skewX: r.RW,
                    skewY: r.RW,
                    distance: r.px,
                    translateX: r.px,
                    translateY: r.px,
                    translateZ: r.px,
                    x: r.px,
                    y: r.px,
                    z: r.px,
                    perspective: r.px,
                    transformPerspective: r.px,
                    opacity: o.Fq,
                    originX: r.$C,
                    originY: r.$C,
                    originZ: r.px,
                    zIndex: a,
                    fillOpacity: o.Fq,
                    strokeOpacity: o.Fq,
                    numOctaves: a
                }
        },
        635: (t, e, n) => {
            "use strict"
            n.d(e, { l: () => r })
            var r = function (t) {
                return function (e) {
                    return e.test(t)
                }
            }
        },
        942: (t, e, n) => {
            "use strict"
            n.d(e, {
                Ee: () => l,
                Gl: () => o,
                _c: () => s,
                r$: () => r,
                s3: () => i
            })
            var r = ["", "X", "Y", "Z"],
                o = ["transformPerspective", "x", "y", "z"]
            function i(t, e) {
                return o.indexOf(t) - o.indexOf(e)
            }
            ;["translate", "scale", "rotate", "skew"].forEach(function (t) {
                return r.forEach(function (e) {
                    return o.push(t + e)
                })
            })
            var a = new Set(o)
            function s(t) {
                return a.has(t)
            }
            var u = new Set(["originX", "originY", "originZ"])
            function l(t) {
                return u.has(t)
            }
        },
        6914: (t, e, n) => {
            "use strict"
            n.d(e, { d5: () => u, p_: () => d })
            var r = n(677),
                o = n(5638),
                i = n(9241),
                a = n(4714),
                s = n(942)
            function u(t, e, n) {
                var r
                if (
                    (void 0 === n && (n = {}),
                    t.notifyAnimationStart(e),
                    Array.isArray(e))
                ) {
                    var o = e.map(function (e) {
                        return l(t, e, n)
                    })
                    r = Promise.all(o)
                } else if ("string" == typeof e) r = l(t, e, n)
                else {
                    var i =
                        "function" == typeof e ? (0, a.x5)(t, e, n.custom) : e
                    r = c(t, i, n)
                }
                return r.then(function () {
                    return t.notifyAnimationComplete(e)
                })
            }
            function l(t, e, n) {
                var o
                void 0 === n && (n = {})
                var i = (0, a.x5)(t, e, n.custom),
                    s = (i || {}).transition,
                    u = void 0 === s ? t.getDefaultTransition() || {} : s
                n.transitionOverride && (u = n.transitionOverride)
                var d = i
                        ? function () {
                              return c(t, i, n)
                          }
                        : function () {
                              return Promise.resolve()
                          },
                    f = (
                        null === (o = t.variantChildren) || void 0 === o
                            ? void 0
                            : o.size
                    )
                        ? function (o) {
                              void 0 === o && (o = 0)
                              var i = u.delayChildren,
                                  a = void 0 === i ? 0 : i,
                                  s = u.staggerChildren,
                                  c = u.staggerDirection
                              return (function (t, e, n, o, i, a) {
                                  void 0 === n && (n = 0)
                                  void 0 === o && (o = 0)
                                  void 0 === i && (i = 1)
                                  var s = [],
                                      u = (t.variantChildren.size - 1) * o,
                                      c =
                                          1 === i
                                              ? function (t) {
                                                    return (
                                                        void 0 === t && (t = 0),
                                                        t * o
                                                    )
                                                }
                                              : function (t) {
                                                    return (
                                                        void 0 === t && (t = 0),
                                                        u - t * o
                                                    )
                                                }
                                  return (
                                      Array.from(t.variantChildren)
                                          .sort(p)
                                          .forEach(function (t, o) {
                                              s.push(
                                                  l(
                                                      t,
                                                      e,
                                                      (0, r.pi)(
                                                          (0, r.pi)({}, a),
                                                          { delay: n + c(o) }
                                                      )
                                                  ).then(function () {
                                                      return t.notifyAnimationComplete(
                                                          e
                                                      )
                                                  })
                                              )
                                          }),
                                      Promise.all(s)
                                  )
                              })(t, e, a + o, s, c, n)
                          }
                        : function () {
                              return Promise.resolve()
                          },
                    v = u.when
                if (v) {
                    var h = (0, r.CR)(
                            "beforeChildren" === v ? [d, f] : [f, d],
                            2
                        ),
                        m = h[0],
                        g = h[1]
                    return m().then(g)
                }
                return Promise.all([d(), f(n.delay)])
            }
            function c(t, e, n) {
                var a,
                    u = void 0 === n ? {} : n,
                    l = u.delay,
                    c = void 0 === l ? 0 : l,
                    d = u.transitionOverride,
                    p = u.type,
                    v = t.makeTargetAnimatable(e),
                    h = v.transition,
                    m = void 0 === h ? t.getDefaultTransition() : h,
                    g = v.transitionEnd,
                    y = (0, r._T)(v, ["transition", "transitionEnd"])
                d && (m = d)
                var x = [],
                    b =
                        p &&
                        (null === (a = t.animationState) || void 0 === a
                            ? void 0
                            : a.getState()[p])
                for (var w in y) {
                    var S = t.getValue(w),
                        E = y[w]
                    if (!(!S || void 0 === E || (b && f(b, w)))) {
                        var C = (0, r.pi)({ delay: c }, m)
                        t.shouldReduceMotion &&
                            (0, s._c)(w) &&
                            (C = (0, r.pi)((0, r.pi)({}, C), {
                                type: !1,
                                delay: 0
                            }))
                        var P = (0, o.b8)(w, S, E, C)
                        x.push(P)
                    }
                }
                return Promise.all(x).then(function () {
                    g && (0, i.CD)(t, g)
                })
            }
            function d(t) {
                t.forEachValue(function (t) {
                    return t.stop()
                })
            }
            function p(t, e) {
                return t.sortNodePosition(e)
            }
            function f(t, e) {
                var n = t.protectedKeys,
                    r = t.needsAnimating,
                    o = n.hasOwnProperty(e) && !0 !== r[e]
                return (r[e] = !1), o
            }
        },
        9241: (t, e, n) => {
            "use strict"
            n.d(e, { GJ: () => x, P$: () => w, CD: () => m, gg: () => y })
            var r = n(677),
                o = n(1928),
                i = function (t) {
                    return /^0[^.\s]+$/.test(t)
                },
                a = n(7125),
                s = n(2502),
                u = n(7203),
                l = n(9872),
                c = n(5466),
                d = n(635),
                p = (0, r.ev)(
                    (0, r.ev)([], (0, r.CR)(c.$), !1),
                    [l.$, o.P],
                    !1
                ),
                f = function (t) {
                    return p.find((0, d.l)(t))
                },
                v = n(4714)
            function h(t, e, n) {
                t.hasValue(e)
                    ? t.getValue(e).set(n)
                    : t.addValue(e, (0, s.B)(n))
            }
            function m(t, e) {
                var n = (0, v.x5)(t, e),
                    o = n ? t.makeTargetAnimatable(n, !1) : {},
                    i = o.transitionEnd,
                    s = void 0 === i ? {} : i
                o.transition
                var u = (0, r._T)(o, ["transitionEnd", "transition"])
                for (var l in (u = (0, r.pi)((0, r.pi)({}, u), s))) {
                    h(t, l, (0, a.Y)(u[l]))
                }
            }
            function g(t, e) {
                ;(0, r.ev)([], (0, r.CR)(e), !1)
                    .reverse()
                    .forEach(function (n) {
                        var r,
                            o = t.getVariant(n)
                        o && m(t, o),
                            null === (r = t.variantChildren) ||
                                void 0 === r ||
                                r.forEach(function (t) {
                                    g(t, e)
                                })
                    })
            }
            function y(t, e) {
                return Array.isArray(e)
                    ? g(t, e)
                    : "string" == typeof e
                    ? g(t, [e])
                    : void m(t, e)
            }
            function x(t, e, n) {
                var r,
                    a,
                    l,
                    c,
                    d = Object.keys(e).filter(function (e) {
                        return !t.hasValue(e)
                    }),
                    p = d.length
                if (p)
                    for (var v = 0; v < p; v++) {
                        var h = d[v],
                            m = e[h],
                            g = null
                        Array.isArray(m) && (g = m[0]),
                            null === g &&
                                (g =
                                    null !==
                                        (a =
                                            null !== (r = n[h]) && void 0 !== r
                                                ? r
                                                : t.readValue(h)) &&
                                    void 0 !== a
                                        ? a
                                        : e[h]),
                            null != g &&
                                ("string" == typeof g &&
                                (/^\-?\d*\.?\d+$/.test(g) || i(g))
                                    ? (g = parseFloat(g))
                                    : !f(g) &&
                                      o.P.test(m) &&
                                      (g = (0, u.T)(h, m)),
                                t.addValue(h, (0, s.B)(g)),
                                (null !== (l = (c = n)[h]) && void 0 !== l) ||
                                    (c[h] = g),
                                t.setBaseTarget(h, g))
                    }
            }
            function b(t, e) {
                if (e) return (e[t] || e.default || e).from
            }
            function w(t, e, n) {
                var r,
                    o,
                    i = {}
                for (var a in t)
                    i[a] =
                        null !== (r = b(a, e)) && void 0 !== r
                            ? r
                            : null === (o = n.getValue(a)) || void 0 === o
                            ? void 0
                            : o.get()
                return i
            }
        },
        4714: (t, e, n) => {
            "use strict"
            function r(t) {
                return Array.isArray(t)
            }
            function o(t) {
                return "string" == typeof t || r(t)
            }
            function i(t, e, n, r, o) {
                var i
                return (
                    void 0 === r && (r = {}),
                    void 0 === o && (o = {}),
                    "function" == typeof e &&
                        (e = e(null != n ? n : t.custom, r, o)),
                    "string" == typeof e &&
                        (e =
                            null === (i = t.variants) || void 0 === i
                                ? void 0
                                : i[e]),
                    "function" == typeof e &&
                        (e = e(null != n ? n : t.custom, r, o)),
                    e
                )
            }
            function a(t, e, n) {
                var r = t.getProps()
                return i(
                    r,
                    e,
                    null != n ? n : r.custom,
                    (function (t) {
                        var e = {}
                        return (
                            t.forEachValue(function (t, n) {
                                return (e[n] = t.get())
                            }),
                            e
                        )
                    })(t),
                    (function (t) {
                        var e = {}
                        return (
                            t.forEachValue(function (t, n) {
                                return (e[n] = t.getVelocity())
                            }),
                            e
                        )
                    })(t)
                )
            }
            function s(t) {
                var e
                return (
                    "function" ==
                        typeof (null === (e = t.animate) || void 0 === e
                            ? void 0
                            : e.start) ||
                    o(t.initial) ||
                    o(t.animate) ||
                    o(t.whileHover) ||
                    o(t.whileDrag) ||
                    o(t.whileTap) ||
                    o(t.whileFocus) ||
                    o(t.exit)
                )
            }
            function u(t) {
                return Boolean(s(t) || t.variants)
            }
            n.d(e, {
                $L: () => o,
                A0: () => r,
                O6: () => s,
                e8: () => u,
                oQ: () => i,
                x5: () => a
            })
        },
        6270: (t, e, n) => {
            "use strict"
            function r(t, e) {
                ;-1 === t.indexOf(e) && t.push(e)
            }
            function o(t, e) {
                var n = t.indexOf(e)
                n > -1 && t.splice(n, 1)
            }
            n.d(e, { cl: () => o, y4: () => r })
        },
        9813: (t, e, n) => {
            "use strict"
            n.d(e, { j: () => r })
            var r = "undefined" != typeof document
        },
        7125: (t, e, n) => {
            "use strict"
            n.d(e, { Y: () => i, p: () => o })
            var r = n(227),
                o = function (t) {
                    return Boolean(
                        t && "object" == typeof t && t.mix && t.toValue
                    )
                },
                i = function (t) {
                    return (0, r.C)(t) ? t[t.length - 1] || 0 : t
                }
        },
        7248: (t, e, n) => {
            "use strict"
            n.d(e, { L: () => o })
            var r = n(6270),
                o = (function () {
                    function t() {
                        this.subscriptions = []
                    }
                    return (
                        (t.prototype.add = function (t) {
                            var e = this
                            return (
                                (0, r.y4)(this.subscriptions, t),
                                function () {
                                    return (0, r.cl)(e.subscriptions, t)
                                }
                            )
                        }),
                        (t.prototype.notify = function (t, e, n) {
                            var r = this.subscriptions.length
                            if (r)
                                if (1 === r) this.subscriptions[0](t, e, n)
                                else
                                    for (var o = 0; o < r; o++) {
                                        var i = this.subscriptions[o]
                                        i && i(t, e, n)
                                    }
                        }),
                        (t.prototype.getSize = function () {
                            return this.subscriptions.length
                        }),
                        (t.prototype.clear = function () {
                            this.subscriptions.length = 0
                        }),
                        t
                    )
                })()
        },
        9947: (t, e, n) => {
            "use strict"
            n.d(e, { w: () => r })
            var r = function (t) {
                return 1e3 * t
            }
        },
        4786: (t, e, n) => {
            "use strict"
            n.d(e, { h: () => o })
            var r = n(9496)
            function o(t) {
                var e = (0, r.useRef)(null)
                return null === e.current && (e.current = t()), e.current
            }
        },
        9423: (t, e, n) => {
            "use strict"
            n.d(e, { L: () => o })
            var r = n(9496),
                o = n(9813).j ? r.useLayoutEffect : r.useEffect
        },
        2502: (t, e, n) => {
            "use strict"
            n.d(e, { B: () => s })
            var r = n(931),
                o = n(8064),
                i = n(7248),
                a = (function () {
                    function t(t) {
                        var e,
                            n = this
                        ;(this.version = "6.5.1"),
                            (this.timeDelta = 0),
                            (this.lastUpdated = 0),
                            (this.updateSubscribers = new i.L()),
                            (this.velocityUpdateSubscribers = new i.L()),
                            (this.renderSubscribers = new i.L()),
                            (this.canTrackVelocity = !1),
                            (this.updateAndNotify = function (t, e) {
                                void 0 === e && (e = !0),
                                    (n.prev = n.current),
                                    (n.current = t)
                                var o = (0, r.$B)(),
                                    i = o.delta,
                                    a = o.timestamp
                                n.lastUpdated !== a &&
                                    ((n.timeDelta = i),
                                    (n.lastUpdated = a),
                                    r.ZP.postRender(n.scheduleVelocityCheck)),
                                    n.prev !== n.current &&
                                        n.updateSubscribers.notify(n.current),
                                    n.velocityUpdateSubscribers.getSize() &&
                                        n.velocityUpdateSubscribers.notify(
                                            n.getVelocity()
                                        ),
                                    e && n.renderSubscribers.notify(n.current)
                            }),
                            (this.scheduleVelocityCheck = function () {
                                return r.ZP.postRender(n.velocityCheck)
                            }),
                            (this.velocityCheck = function (t) {
                                t.timestamp !== n.lastUpdated &&
                                    ((n.prev = n.current),
                                    n.velocityUpdateSubscribers.notify(
                                        n.getVelocity()
                                    ))
                            }),
                            (this.hasAnimated = !1),
                            (this.prev = this.current = t),
                            (this.canTrackVelocity =
                                ((e = this.current), !isNaN(parseFloat(e))))
                    }
                    return (
                        (t.prototype.onChange = function (t) {
                            return this.updateSubscribers.add(t)
                        }),
                        (t.prototype.clearListeners = function () {
                            this.updateSubscribers.clear()
                        }),
                        (t.prototype.onRenderRequest = function (t) {
                            return t(this.get()), this.renderSubscribers.add(t)
                        }),
                        (t.prototype.attach = function (t) {
                            this.passiveEffect = t
                        }),
                        (t.prototype.set = function (t, e) {
                            void 0 === e && (e = !0),
                                e && this.passiveEffect
                                    ? this.passiveEffect(
                                          t,
                                          this.updateAndNotify
                                      )
                                    : this.updateAndNotify(t, e)
                        }),
                        (t.prototype.get = function () {
                            return this.current
                        }),
                        (t.prototype.getPrevious = function () {
                            return this.prev
                        }),
                        (t.prototype.getVelocity = function () {
                            return this.canTrackVelocity
                                ? (0, o.R)(
                                      parseFloat(this.current) -
                                          parseFloat(this.prev),
                                      this.timeDelta
                                  )
                                : 0
                        }),
                        (t.prototype.start = function (t) {
                            var e = this
                            return (
                                this.stop(),
                                new Promise(function (n) {
                                    ;(e.hasAnimated = !0),
                                        (e.stopAnimation = t(n))
                                }).then(function () {
                                    return e.clearAnimation()
                                })
                            )
                        }),
                        (t.prototype.stop = function () {
                            this.stopAnimation && this.stopAnimation(),
                                this.clearAnimation()
                        }),
                        (t.prototype.isAnimating = function () {
                            return !!this.stopAnimation
                        }),
                        (t.prototype.clearAnimation = function () {
                            this.stopAnimation = null
                        }),
                        (t.prototype.destroy = function () {
                            this.updateSubscribers.clear(),
                                this.renderSubscribers.clear(),
                                this.stop()
                        }),
                        t
                    )
                })()
            function s(t) {
                return new a(t)
            }
        },
        6115: (t, e, n) => {
            "use strict"
            n.d(e, { v: () => N })
            var r = n(677)
            const o = new WeakMap()
            let i
            function a({ target: t, contentRect: e, borderBoxSize: n }) {
                var r
                null === (r = o.get(t)) ||
                    void 0 === r ||
                    r.forEach((r) => {
                        r({
                            target: t,
                            contentSize: e,
                            get size() {
                                return (function (t, e) {
                                    if (e) {
                                        const { inlineSize: t, blockSize: n } =
                                            e[0]
                                        return { width: t, height: n }
                                    }
                                    return t instanceof SVGElement &&
                                        "getBBox" in t
                                        ? t.getBBox()
                                        : {
                                              width: t.offsetWidth,
                                              height: t.offsetHeight
                                          }
                                })(t, n)
                            }
                        })
                    })
            }
            function s(t) {
                t.forEach(a)
            }
            function u(t, e) {
                i ||
                    ("undefined" != typeof ResizeObserver &&
                        (i = new ResizeObserver(s)))
                const n = (function (t, e) {
                    var n
                    return (
                        "string" == typeof t
                            ? e
                                ? ((null !== (n = e[t]) && void 0 !== n) ||
                                      (e[t] = document.querySelectorAll(t)),
                                  (t = e[t]))
                                : (t = document.querySelectorAll(t))
                            : t instanceof Element && (t = [t]),
                        Array.from(t || [])
                    )
                })(t)
                return (
                    n.forEach((t) => {
                        let n = o.get(t)
                        n || ((n = new Set()), o.set(t, n)),
                            n.add(e),
                            null == i || i.observe(t)
                    }),
                    () => {
                        n.forEach((t) => {
                            const n = o.get(t)
                            null == n || n.delete(e),
                                (null == n ? void 0 : n.size) ||
                                    null == i ||
                                    i.unobserve(t)
                        })
                    }
                )
            }
            const l = new Set()
            let c
            function d(t) {
                return (
                    l.add(t),
                    c ||
                        ((c = () => {
                            const t = {
                                    width: window.innerWidth,
                                    height: window.innerHeight
                                },
                                e = { target: window, size: t, contentSize: t }
                            l.forEach((t) => t(e))
                        }),
                        window.addEventListener("resize", c)),
                    () => {
                        l.delete(t), !l.size && c && (c = void 0)
                    }
                )
            }
            const p = (t, e, n) => (e - t == 0 ? 1 : (n - t) / (e - t))
            const f = {
                x: { length: "Width", position: "Left" },
                y: { length: "Height", position: "Top" }
            }
            function v(t, e, n, r) {
                const o = n[e],
                    { length: i, position: a } = f[e],
                    s = o.current,
                    u = n.time
                ;(o.current = t["scroll" + a]),
                    (o.scrollLength = t["scroll" + i] - t["client" + i]),
                    (o.offset.length = 0),
                    (o.offset[0] = 0),
                    (o.offset[1] = o.scrollLength),
                    (o.progress = p(0, o.scrollLength, o.current))
                const l = r - u
                var c, d
                o.velocity =
                    l > 50
                        ? 0
                        : ((c = o.current - s), (d = l) ? c * (1e3 / d) : 0)
            }
            const h = (t) => t,
                m = (t, e, n) => -n * t + n * e + t
            function g(t, e) {
                const n = t[t.length - 1]
                for (let r = 1; r <= e; r++) {
                    const o = p(0, e, r)
                    t.push(m(n, 1, o))
                }
            }
            function y(t) {
                const e = [0]
                return g(e, t - 1), e
            }
            const x = (t) => "number" == typeof t
            function b(t, e) {
                return ((t) => Array.isArray(t) && !x(t[0]))(t)
                    ? t[
                          ((t, e, n) => {
                              const r = e - t
                              return ((((n - t) % r) + r) % r) + t
                          })(0, t.length, e)
                      ]
                    : t
            }
            function w(t, e = y(t.length), n = h) {
                const r = t.length,
                    o = r - e.length
                return (
                    o > 0 && g(e, o),
                    (o) => {
                        let i = 0
                        for (; i < r - 2 && !(o < e[i + 1]); i++);
                        let a =
                            ((s = 0),
                            (u = 1),
                            (l = p(e[i], e[i + 1], o)),
                            Math.min(Math.max(l, s), u))
                        var s, u, l
                        return (a = b(n, i)(a)), m(t[i], t[i + 1], a)
                    }
                )
            }
            const S = {
                    Enter: [
                        [0, 1],
                        [1, 1]
                    ],
                    Exit: [
                        [0, 0],
                        [1, 0]
                    ],
                    Any: [
                        [1, 0],
                        [0, 1]
                    ],
                    All: [
                        [0, 0],
                        [1, 1]
                    ]
                },
                E = (t) => "string" == typeof t,
                C = { start: 0, center: 0.5, end: 1 }
            function P(t, e, n = 0) {
                let r = 0
                if ((void 0 !== C[t] && (t = C[t]), E(t))) {
                    const e = parseFloat(t)
                    t.endsWith("px")
                        ? (r = e)
                        : t.endsWith("%")
                        ? (t = e / 100)
                        : t.endsWith("vw")
                        ? (r = (e / 100) * document.documentElement.clientWidth)
                        : t.endsWith("vh")
                        ? (r =
                              (e / 100) * document.documentElement.clientHeight)
                        : (t = e)
                }
                return x(t) && (r = e * t), n + r
            }
            const T = [0, 0]
            function R(t, e, n, r) {
                let o = Array.isArray(t) ? t : T,
                    i = 0,
                    a = 0
                return (
                    x(t)
                        ? (o = [t, t])
                        : E(t) &&
                          (o = (t = t.trim()).includes(" ")
                              ? t.split(" ")
                              : [t, C[t] ? t : "0"]),
                    (i = P(o[0], n, r)),
                    (a = P(o[1], e)),
                    i - a
                )
            }
            const A = { x: 0, y: 0 }
            function M(t, e, n) {
                let { offset: r = S.All } = n
                const { target: o = t, axis: i = "y" } = n,
                    a = "y" === i ? "height" : "width",
                    s =
                        o !== t
                            ? (function (t, e) {
                                  let n = { x: 0, y: 0 },
                                      r = t
                                  for (; r && r !== e; )
                                      if (r instanceof HTMLElement)
                                          (n.x += r.offsetLeft),
                                              (n.y += r.offsetTop),
                                              (r = r.offsetParent)
                                      else if (
                                          r instanceof SVGGraphicsElement &&
                                          "getBBox" in r
                                      ) {
                                          const { top: t, left: e } =
                                              r.getBBox()
                                          for (
                                              n.x += e, n.y += t;
                                              r && "svg" !== r.tagName;

                                          )
                                              r = r.parentNode
                                      }
                                  return n
                              })(o, t)
                            : A,
                    u =
                        o === t
                            ? { width: t.scrollWidth, height: t.scrollHeight }
                            : { width: o.clientWidth, height: o.clientHeight },
                    l = { width: t.clientWidth, height: t.clientHeight }
                e[i].offset.length = 0
                let c = !e[i].interpolate
                const d = r.length
                for (let p = 0; p < d; p++) {
                    const t = R(r[p], l[a], u[a], s[i])
                    c || t === e[i].interpolatorOffsets[p] || (c = !0),
                        (e[i].offset[p] = t)
                }
                c &&
                    ((e[i].interpolate = w(y(d), e[i].offset)),
                    (e[i].interpolatorOffsets = [...e[i].offset])),
                    (e[i].progress = e[i].interpolate(e[i].current))
            }
            function V(t, e, n, r = {}) {
                const o = r.axis || "y"
                return {
                    measure: () =>
                        (function (t, e = t, n) {
                            if (
                                ((n.x.targetOffset = 0),
                                (n.y.targetOffset = 0),
                                e !== t)
                            ) {
                                let r = e
                                for (; r && r != t; )
                                    (n.x.targetOffset += r.offsetLeft),
                                        (n.y.targetOffset += r.offsetTop),
                                        (r = r.offsetParent)
                            }
                            ;(n.x.targetLength =
                                e === t ? e.scrollWidth : e.clientWidth),
                                (n.y.targetLength =
                                    e === t ? e.scrollHeight : e.clientHeight),
                                (n.x.containerLength = t.clientWidth),
                                (n.y.containerLength = t.clientHeight)
                        })(t, r.target, n),
                    update: (e) => {
                        !(function (t, e, n) {
                            v(t, "x", e, n), v(t, "y", e, n), (e.time = n)
                        })(t, n, e),
                            (r.offset || r.target) && M(t, n, r)
                    },
                    notify: "function" == typeof e ? () => e(n) : k(e, n[o])
                }
            }
            function k(t, e) {
                return (
                    t.pause(),
                    t.forEachNative((t, { easing: e }) => {
                        var n, r
                        if (t.updateDuration)
                            e || (t.easing = h), t.updateDuration(1)
                        else {
                            const o = { duration: 1e3 }
                            e || (o.easing = "linear"),
                                null ===
                                    (r =
                                        null === (n = t.effect) || void 0 === n
                                            ? void 0
                                            : n.updateTiming) ||
                                    void 0 === r ||
                                    r.call(n, o)
                        }
                    }),
                    () => {
                        t.currentTime = e.progress
                    }
                )
            }
            const L = new WeakMap(),
                Z = new WeakMap(),
                j = new WeakMap(),
                O = (t) => (t === document.documentElement ? window : t)
            function D(t, e = {}) {
                var { container: n = document.documentElement } = e,
                    o = (0, r._T)(e, ["container"])
                let i = j.get(n)
                i || ((i = new Set()), j.set(n, i))
                const a = V(
                    n,
                    t,
                    {
                        time: 0,
                        x: {
                            current: 0,
                            offset: [],
                            progress: 0,
                            scrollLength: 0,
                            targetOffset: 0,
                            targetLength: 0,
                            containerLength: 0,
                            velocity: 0
                        },
                        y: {
                            current: 0,
                            offset: [],
                            progress: 0,
                            scrollLength: 0,
                            targetOffset: 0,
                            targetLength: 0,
                            containerLength: 0,
                            velocity: 0
                        }
                    },
                    o
                )
                if ((i.add(a), !L.has(n))) {
                    const t = () => {
                        const t = performance.now()
                        for (const e of i) e.measure()
                        for (const e of i) e.update(t)
                        for (const e of i) e.notify()
                    }
                    L.set(n, t)
                    const e = O(n)
                    window.addEventListener("resize", t, { passive: !0 }),
                        n !== document.documentElement &&
                            Z.set(
                                n,
                                ((l = t),
                                "function" == typeof (s = n) ? d(s) : u(s, l))
                            ),
                        e.addEventListener("scroll", t, { passive: !0 })
                }
                var s, l
                const c = L.get(n),
                    p = requestAnimationFrame(c)
                return () => {
                    var e
                    "function" != typeof t && t.stop(), cancelAnimationFrame(p)
                    const r = j.get(n)
                    if (!r) return
                    if ((r.delete(a), r.size)) return
                    const o = L.get(n)
                    L.delete(n),
                        o &&
                            (O(n).removeEventListener("scroll", o),
                            null === (e = Z.get(n)) || void 0 === e || e(),
                            window.removeEventListener("resize", o))
                }
            }
            var B = n(2502),
                I = n(4786),
                F = n(9423),
                z = function () {
                    return {
                        scrollX: (0, B.B)(0),
                        scrollY: (0, B.B)(0),
                        scrollXProgress: (0, B.B)(0),
                        scrollYProgress: (0, B.B)(0)
                    }
                }
            function N(t) {
                void 0 === t && (t = {})
                var e = t.container,
                    n = t.target,
                    o = (0, r._T)(t, ["container", "target"]),
                    i = (0, I.h)(z)
                return (
                    (0, F.L)(function () {
                        return D(function (t) {
                            var e = t.x,
                                n = t.y
                            i.scrollX.set(e.current),
                                i.scrollXProgress.set(e.progress),
                                i.scrollY.set(n.current),
                                i.scrollYProgress.set(n.progress)
                        }, (0,
                        r.pi)((0, r.pi)({}, o), { container: (null == e ? void 0 : e.current) || void 0, target: (null == n ? void 0 : n.current) || void 0 }))
                    }, []),
                    i
                )
            }
        },
        931: (t, e, n) => {
            "use strict"
            n.d(e, { qY: () => f, ZP: () => x, iW: () => v, $B: () => y })
            const r = (1 / 60) * 1e3,
                o =
                    "undefined" != typeof performance
                        ? () => performance.now()
                        : () => Date.now(),
                i =
                    "undefined" != typeof window
                        ? (t) => window.requestAnimationFrame(t)
                        : (t) => setTimeout(() => t(o()), r)
            let a = !0,
                s = !1,
                u = !1
            const l = { delta: 0, timestamp: 0 },
                c = ["read", "update", "preRender", "render", "postRender"],
                d = c.reduce(
                    (t, e) => (
                        (t[e] = (function (t) {
                            let e = [],
                                n = [],
                                r = 0,
                                o = !1,
                                i = !1
                            const a = new WeakSet(),
                                s = {
                                    schedule: (t, i = !1, s = !1) => {
                                        const u = s && o,
                                            l = u ? e : n
                                        return (
                                            i && a.add(t),
                                            -1 === l.indexOf(t) &&
                                                (l.push(t),
                                                u && o && (r = e.length)),
                                            t
                                        )
                                    },
                                    cancel: (t) => {
                                        const e = n.indexOf(t)
                                        ;-1 !== e && n.splice(e, 1), a.delete(t)
                                    },
                                    process: (u) => {
                                        if (o) i = !0
                                        else {
                                            if (
                                                ((o = !0),
                                                ([e, n] = [n, e]),
                                                (n.length = 0),
                                                (r = e.length),
                                                r)
                                            )
                                                for (let n = 0; n < r; n++) {
                                                    const r = e[n]
                                                    r(u),
                                                        a.has(r) &&
                                                            (s.schedule(r), t())
                                                }
                                            ;(o = !1),
                                                i && ((i = !1), s.process(u))
                                        }
                                    }
                                }
                            return s
                        })(() => (s = !0))),
                        t
                    ),
                    {}
                ),
                p = c.reduce((t, e) => {
                    const n = d[e]
                    return (
                        (t[e] = (t, e = !1, r = !1) => (
                            s || g(), n.schedule(t, e, r)
                        )),
                        t
                    )
                }, {}),
                f = c.reduce((t, e) => ((t[e] = d[e].cancel), t), {}),
                v = c.reduce((t, e) => ((t[e] = () => d[e].process(l)), t), {}),
                h = (t) => d[t].process(l),
                m = (t) => {
                    ;(s = !1),
                        (l.delta = a
                            ? r
                            : Math.max(Math.min(t - l.timestamp, 40), 1)),
                        (l.timestamp = t),
                        (u = !0),
                        c.forEach(h),
                        (u = !1),
                        s && ((a = !1), i(m))
                },
                g = () => {
                    ;(s = !0), (a = !0), u || i(m)
                },
                y = () => l,
                x = p
        },
        3401: (t, e, n) => {
            "use strict"
            n.d(e, {
                LU: () => g,
                G2: () => v,
                XL: () => m,
                CG: () => h,
                h9: () => x,
                yD: () => b,
                gJ: () => y,
                Z7: () => d,
                X7: () => f,
                Bn: () => p,
                YQ: () => s,
                mZ: () => c,
                Vv: () => l,
                GE: () => a
            })
            const r = (t) => (e) => 1 - t(1 - e),
                o = (t) => (e) =>
                    e <= 0.5 ? t(2 * e) / 2 : (2 - t(2 * (1 - e))) / 2,
                i = (t) => (e) => e * e * ((t + 1) * e - t),
                a = (t) => t,
                s = ((u = 2), (t) => Math.pow(t, u))
            var u
            const l = r(s),
                c = o(s),
                d = (t) => 1 - Math.sin(Math.acos(t)),
                p = r(d),
                f = o(p),
                v = i(1.525),
                h = r(v),
                m = o(v),
                g = ((t) => {
                    const e = i(t)
                    return (t) =>
                        (t *= 2) < 1
                            ? 0.5 * e(t)
                            : 0.5 * (2 - Math.pow(2, -10 * (t - 1)))
                })(1.525),
                y = (t) => {
                    if (1 === t || 0 === t) return t
                    const e = t * t
                    return t < 0.36363636363636365
                        ? 7.5625 * e
                        : t < 0.7272727272727273
                        ? 9.075 * e - 9.9 * t + 3.4
                        : t < 0.9
                        ? 12.066481994459833 * e -
                          19.63545706371191 * t +
                          8.898060941828255
                        : 10.8 * t * t - 20.52 * t + 10.72
                },
                x = r(y),
                b = (t) =>
                    t < 0.5
                        ? 0.5 * (1 - y(1 - 2 * t))
                        : 0.5 * y(2 * t - 1) + 0.5
        },
        6179: (t, e, n) => {
            "use strict"
            n.d(e, { u: () => r })
            const r = (t, e, n) => Math.min(Math.max(n, t), e)
        },
        179: (t, e, n) => {
            "use strict"
            n.d(e, { e: () => r })
            const r = (t) => "number" == typeof t
        },
        9552: (t, e, n) => {
            "use strict"
            n.d(e, { C: () => r })
            const r = (t, e, n) => -n * t + n * e + t
        },
        2379: (t, e, n) => {
            "use strict"
            n.d(e, { z: () => o })
            const r = (t, e) => (n) => e(t(n)),
                o = (...t) => t.reduce(r)
        },
        1759: (t, e, n) => {
            "use strict"
            n.d(e, { Y: () => r })
            const r = (t, e, n) => {
                const r = e - t
                return 0 === r ? 1 : (n - t) / r
            }
        },
        8064: (t, e, n) => {
            "use strict"
            function r(t, e) {
                return e ? t * (1e3 / e) : 0
            }
            n.d(e, { R: () => r })
        },
        6637: (t, e, n) => {
            "use strict"
            n.d(e, { $: () => o })
            var r = n(7522)
            const o = {
                test: (0, n(5871).i)("#"),
                parse: function (t) {
                    let e = "",
                        n = "",
                        r = "",
                        o = ""
                    return (
                        t.length > 5
                            ? ((e = t.substr(1, 2)),
                              (n = t.substr(3, 2)),
                              (r = t.substr(5, 2)),
                              (o = t.substr(7, 2)))
                            : ((e = t.substr(1, 1)),
                              (n = t.substr(2, 1)),
                              (r = t.substr(3, 1)),
                              (o = t.substr(4, 1)),
                              (e += e),
                              (n += n),
                              (r += r),
                              (o += o)),
                        {
                            red: parseInt(e, 16),
                            green: parseInt(n, 16),
                            blue: parseInt(r, 16),
                            alpha: o ? parseInt(o, 16) / 255 : 1
                        }
                    )
                },
                transform: r.m.transform
            }
        },
        4707: (t, e, n) => {
            "use strict"
            n.d(e, { J: () => s })
            var r = n(9707),
                o = n(6939),
                i = n(7818),
                a = n(5871)
            const s = {
                test: (0, a.i)("hsl", "hue"),
                parse: (0, a.d)("hue", "saturation", "lightness"),
                transform: ({
                    hue: t,
                    saturation: e,
                    lightness: n,
                    alpha: a = 1
                }) =>
                    "hsla(" +
                    Math.round(t) +
                    ", " +
                    o.aQ.transform((0, i.Nw)(e)) +
                    ", " +
                    o.aQ.transform((0, i.Nw)(n)) +
                    ", " +
                    (0, i.Nw)(r.Fq.transform(a)) +
                    ")"
            }
        },
        9872: (t, e, n) => {
            "use strict"
            n.d(e, { $: () => s })
            var r = n(7818),
                o = n(6637),
                i = n(4707),
                a = n(7522)
            const s = {
                test: (t) => a.m.test(t) || o.$.test(t) || i.J.test(t),
                parse: (t) =>
                    a.m.test(t)
                        ? a.m.parse(t)
                        : i.J.test(t)
                        ? i.J.parse(t)
                        : o.$.parse(t),
                transform: (t) =>
                    (0, r.HD)(t)
                        ? t
                        : t.hasOwnProperty("red")
                        ? a.m.transform(t)
                        : i.J.transform(t)
            }
        },
        7522: (t, e, n) => {
            "use strict"
            n.d(e, { m: () => u })
            var r = n(9707),
                o = n(7818),
                i = n(5871)
            const a = (0, o.uZ)(0, 255),
                s = Object.assign(Object.assign({}, r.Rx), {
                    transform: (t) => Math.round(a(t))
                }),
                u = {
                    test: (0, i.i)("rgb", "red"),
                    parse: (0, i.d)("red", "green", "blue"),
                    transform: ({ red: t, green: e, blue: n, alpha: i = 1 }) =>
                        "rgba(" +
                        s.transform(t) +
                        ", " +
                        s.transform(e) +
                        ", " +
                        s.transform(n) +
                        ", " +
                        (0, o.Nw)(r.Fq.transform(i)) +
                        ")"
                }
        },
        5871: (t, e, n) => {
            "use strict"
            n.d(e, { d: () => i, i: () => o })
            var r = n(7818)
            const o = (t, e) => (n) =>
                    Boolean(
                        ((0, r.HD)(n) && r.mj.test(n) && n.startsWith(t)) ||
                            (e && Object.prototype.hasOwnProperty.call(n, e))
                    ),
                i = (t, e, n) => (o) => {
                    if (!(0, r.HD)(o)) return o
                    const [i, a, s, u] = o.match(r.KP)
                    return {
                        [t]: parseFloat(i),
                        [e]: parseFloat(a),
                        [n]: parseFloat(s),
                        alpha: void 0 !== u ? parseFloat(u) : 1
                    }
                }
        },
        2513: (t, e, n) => {
            "use strict"
            n.d(e, { h: () => u })
            var r = n(1928),
                o = n(7818)
            const i = new Set(["brightness", "contrast", "saturate", "opacity"])
            function a(t) {
                let [e, n] = t.slice(0, -1).split("(")
                if ("drop-shadow" === e) return t
                const [r] = n.match(o.KP) || []
                if (!r) return t
                const a = n.replace(r, "")
                let s = i.has(e) ? 1 : 0
                return r !== n && (s *= 100), e + "(" + s + a + ")"
            }
            const s = /([a-z-]*)\(.*?\)/g,
                u = Object.assign(Object.assign({}, r.P), {
                    getAnimatableNone: (t) => {
                        const e = t.match(s)
                        return e ? e.map(a).join(" ") : t
                    }
                })
        },
        1928: (t, e, n) => {
            "use strict"
            n.d(e, { P: () => p })
            var r = n(9872),
                o = n(9707),
                i = n(7818)
            const a = "${c}",
                s = "${n}"
            function u(t) {
                "number" == typeof t && (t = `${t}`)
                const e = []
                let n = 0
                const u = t.match(i.dA)
                u &&
                    ((n = u.length),
                    (t = t.replace(i.dA, a)),
                    e.push(...u.map(r.$.parse)))
                const l = t.match(i.KP)
                return (
                    l &&
                        ((t = t.replace(i.KP, s)),
                        e.push(...l.map(o.Rx.parse))),
                    { values: e, numColors: n, tokenised: t }
                )
            }
            function l(t) {
                return u(t).values
            }
            function c(t) {
                const { values: e, numColors: n, tokenised: o } = u(t),
                    l = e.length
                return (t) => {
                    let e = o
                    for (let o = 0; o < l; o++)
                        e = e.replace(
                            o < n ? a : s,
                            o < n ? r.$.transform(t[o]) : (0, i.Nw)(t[o])
                        )
                    return e
                }
            }
            const d = (t) => ("number" == typeof t ? 0 : t)
            const p = {
                test: function (t) {
                    var e, n, r, o
                    return (
                        isNaN(t) &&
                        (0, i.HD)(t) &&
                        (null !==
                            (n =
                                null === (e = t.match(i.KP)) || void 0 === e
                                    ? void 0
                                    : e.length) && void 0 !== n
                            ? n
                            : 0) +
                            (null !==
                                (o =
                                    null === (r = t.match(i.dA)) || void 0 === r
                                        ? void 0
                                        : r.length) && void 0 !== o
                                ? o
                                : 0) >
                            0
                    )
                },
                parse: l,
                createTransformer: c,
                getAnimatableNone: function (t) {
                    const e = l(t)
                    return c(t)(e.map(d))
                }
            }
        },
        9707: (t, e, n) => {
            "use strict"
            n.d(e, { Fq: () => i, Rx: () => o, bA: () => a })
            var r = n(7818)
            const o = {
                    test: (t) => "number" == typeof t,
                    parse: parseFloat,
                    transform: (t) => t
                },
                i = Object.assign(Object.assign({}, o), {
                    transform: (0, r.uZ)(0, 1)
                }),
                a = Object.assign(Object.assign({}, o), { default: 1 })
        },
        6939: (t, e, n) => {
            "use strict"
            n.d(e, {
                $C: () => c,
                RW: () => i,
                aQ: () => a,
                px: () => s,
                vh: () => u,
                vw: () => l
            })
            var r = n(7818)
            const o = (t) => ({
                    test: (e) =>
                        (0, r.HD)(e) &&
                        e.endsWith(t) &&
                        1 === e.split(" ").length,
                    parse: parseFloat,
                    transform: (e) => `${e}${t}`
                }),
                i = o("deg"),
                a = o("%"),
                s = o("px"),
                u = o("vh"),
                l = o("vw"),
                c = Object.assign(Object.assign({}, a), {
                    parse: (t) => a.parse(t) / 100,
                    transform: (t) => a.transform(100 * t)
                })
        },
        7818: (t, e, n) => {
            "use strict"
            n.d(e, {
                HD: () => u,
                KP: () => i,
                Nw: () => o,
                dA: () => a,
                mj: () => s,
                uZ: () => r
            })
            const r = (t, e) => (n) => Math.max(Math.min(n, e), t),
                o = (t) => (t % 1 ? Number(t.toFixed(5)) : t),
                i = /(-)?([\d]*\.?[\d])+/g,
                a =
                    /(#[0-9a-f]{6}|#[0-9a-f]{3}|#(?:[0-9a-f]{2}){2,4}|(rgb|hsl)a?\((-?[\d\.]+%?[,\s]+){2,3}\s*\/*\s*[\d\.]+%?\))/gi,
                s =
                    /^(#[0-9a-f]{3}|#(?:[0-9a-f]{2}){2,4}|(rgb|hsl)a?\((-?[\d\.]+%?[,\s]+){2,3}\s*\/*\s*[\d\.]+%?\))$/i
            function u(t) {
                return "string" == typeof t
            }
        }
    }
])
