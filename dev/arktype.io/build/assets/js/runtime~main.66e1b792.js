;(() => {
    "use strict"
    var e,
        a,
        t,
        f,
        r,
        d = {},
        c = {}
    function b(e) {
        var a = c[e]
        if (void 0 !== a) return a.exports
        var t = (c[e] = { id: e, loaded: !1, exports: {} })
        return d[e].call(t.exports, t, t.exports, b), (t.loaded = !0), t.exports
    }
    ;(b.m = d),
        (b.c = c),
        (e = []),
        (b.O = (a, t, f, r) => {
            if (!t) {
                var d = 1 / 0
                for (i = 0; i < e.length; i++) {
                    for (var [t, f, r] = e[i], c = !0, o = 0; o < t.length; o++)
                        (!1 & r || d >= r) &&
                        Object.keys(b.O).every((e) => b.O[e](t[o]))
                            ? t.splice(o--, 1)
                            : ((c = !1), r < d && (d = r))
                    if (c) {
                        e.splice(i--, 1)
                        var n = f()
                        void 0 !== n && (a = n)
                    }
                }
                return a
            }
            r = r || 0
            for (var i = e.length; i > 0 && e[i - 1][2] > r; i--)
                e[i] = e[i - 1]
            e[i] = [t, f, r]
        }),
        (b.n = (e) => {
            var a = e && e.__esModule ? () => e.default : () => e
            return b.d(a, { a: a }), a
        }),
        (t = Object.getPrototypeOf
            ? (e) => Object.getPrototypeOf(e)
            : (e) => e.__proto__),
        (b.t = function (e, f) {
            if ((1 & f && (e = this(e)), 8 & f)) return e
            if ("object" == typeof e && e) {
                if (4 & f && e.__esModule) return e
                if (16 & f && "function" == typeof e.then) return e
            }
            var r = Object.create(null)
            b.r(r)
            var d = {}
            a = a || [null, t({}), t([]), t(t)]
            for (
                var c = 2 & f && e;
                "object" == typeof c && !~a.indexOf(c);
                c = t(c)
            )
                Object.getOwnPropertyNames(c).forEach(
                    (a) => (d[a] = () => e[a])
                )
            return (d.default = () => e), b.d(r, d), r
        }),
        (b.d = (e, a) => {
            for (var t in a)
                b.o(a, t) &&
                    !b.o(e, t) &&
                    Object.defineProperty(e, t, { enumerable: !0, get: a[t] })
        }),
        (b.f = {}),
        (b.e = (e) =>
            Promise.all(
                Object.keys(b.f).reduce((a, t) => (b.f[t](e, a), a), [])
            )),
        (b.u = (e) =>
            "assets/js/" +
            ({
                4: "8946fa22",
                53: "935f2afb",
                271: "6cd820a4",
                408: "66d34ef6",
                494: "3b0dad29",
                829: "fd97db3b",
                1012: "4fe3e64e",
                1119: "7613da8a",
                1201: "289e3c44",
                1334: "9850c92c",
                1384: "ccac430f",
                2087: "44abb010",
                2216: "00cf5318",
                2234: "0656c5ce",
                2502: "29910791",
                2708: "7b812af0",
                3038: "9021a768",
                3237: "1df93b7f",
                3401: "511d152f",
                3428: "e34113ea",
                3678: "dda49074",
                4173: "4edc808e",
                4342: "ac062bb8",
                4467: "cc8f130c",
                4473: "a2100039",
                4665: "0493d4c1",
                4788: "f4951ebb",
                5348: "bc5f4b18",
                5534: "bb1d6f8b",
                5788: "f26b3285",
                5820: "4edc9ce5",
                6746: "8122d123",
                6840: "5f7bc296",
                6843: "6309a6fc",
                6900: "c1789402",
                7600: "2461ffa2",
                7760: "cb0719ba",
                7918: "17896441",
                7949: "9bd07b54",
                7957: "fa190965",
                8202: "29e92f5e",
                8404: "901af80f",
                8862: "b3ff9d4c",
                9184: "5179419d",
                9185: "38f4bd33",
                9343: "47969391",
                9443: "fad51da4",
                9452: "9118e005",
                9460: "ec95bee0",
                9514: "1be78505"
            }[e] || e) +
            "." +
            {
                4: "dc8c3d47",
                53: "d1c385fd",
                271: "ab0c3e28",
                408: "56dd9568",
                494: "80edd0d3",
                829: "ee91bc01",
                856: "a0a38202",
                1012: "821f1f37",
                1119: "f7217737",
                1201: "b538302b",
                1334: "26b31dfb",
                1384: "08ec9666",
                2087: "c6043ccf",
                2216: "37df8db0",
                2234: "d3e69d01",
                2502: "b6d3d1e5",
                2708: "0728bcc1",
                3038: "eebef4d6",
                3237: "69169617",
                3401: "1815e1bd",
                3428: "413c1cfb",
                3678: "21e820bc",
                4173: "2f826f0a",
                4342: "78dc8a09",
                4467: "eb1f3991",
                4473: "e199a28c",
                4665: "2e942907",
                4788: "601221e0",
                4975: "8941647f",
                5325: "1e7943c4",
                5348: "219ec78a",
                5534: "247e2950",
                5788: "ec47caef",
                5820: "eacd9638",
                6628: "6c5d5040",
                6746: "50e34d44",
                6840: "21424440",
                6843: "40155b98",
                6900: "210c5ca8",
                7600: "5eb9477b",
                7760: "4d601fc6",
                7918: "47f3df7e",
                7949: "5d0e81d0",
                7957: "c28ac6d2",
                8202: "0a37db7c",
                8404: "d8e450cb",
                8862: "fb44e13f",
                9184: "1e1b6ba4",
                9185: "d8ae07a1",
                9343: "8a0365ab",
                9443: "69e91882",
                9452: "faa47512",
                9460: "4144e367",
                9514: "d29d0021"
            }[e] +
            ".js"),
        (b.miniCssF = (e) => {}),
        (b.g = (function () {
            if ("object" == typeof globalThis) return globalThis
            try {
                return this || new Function("return this")()
            } catch (e) {
                if ("object" == typeof window) return window
            }
        })()),
        (b.o = (e, a) => Object.prototype.hasOwnProperty.call(e, a)),
        (f = {}),
        (r = "arktype.io:"),
        (b.l = (e, a, t, d) => {
            if (f[e]) f[e].push(a)
            else {
                var c, o
                if (void 0 !== t)
                    for (
                        var n = document.getElementsByTagName("script"), i = 0;
                        i < n.length;
                        i++
                    ) {
                        var u = n[i]
                        if (
                            u.getAttribute("src") == e ||
                            u.getAttribute("data-webpack") == r + t
                        ) {
                            c = u
                            break
                        }
                    }
                c ||
                    ((o = !0),
                    ((c = document.createElement("script")).charset = "utf-8"),
                    (c.timeout = 120),
                    b.nc && c.setAttribute("nonce", b.nc),
                    c.setAttribute("data-webpack", r + t),
                    (c.src = e)),
                    (f[e] = [a])
                var l = (a, t) => {
                        ;(c.onerror = c.onload = null), clearTimeout(s)
                        var r = f[e]
                        if (
                            (delete f[e],
                            c.parentNode && c.parentNode.removeChild(c),
                            r && r.forEach((e) => e(t)),
                            a)
                        )
                            return a(t)
                    },
                    s = setTimeout(
                        l.bind(null, void 0, { type: "timeout", target: c }),
                        12e4
                    )
                ;(c.onerror = l.bind(null, c.onerror)),
                    (c.onload = l.bind(null, c.onload)),
                    o && document.head.appendChild(c)
            }
        }),
        (b.r = (e) => {
            "undefined" != typeof Symbol &&
                Symbol.toStringTag &&
                Object.defineProperty(e, Symbol.toStringTag, {
                    value: "Module"
                }),
                Object.defineProperty(e, "__esModule", { value: !0 })
        }),
        (b.p = "/"),
        (b.gca = function (e) {
            return (
                (e =
                    {
                        17896441: "7918",
                        29910791: "2502",
                        47969391: "9343",
                        "8946fa22": "4",
                        "935f2afb": "53",
                        "6cd820a4": "271",
                        "66d34ef6": "408",
                        "3b0dad29": "494",
                        fd97db3b: "829",
                        "4fe3e64e": "1012",
                        "7613da8a": "1119",
                        "289e3c44": "1201",
                        "9850c92c": "1334",
                        ccac430f: "1384",
                        "44abb010": "2087",
                        "00cf5318": "2216",
                        "0656c5ce": "2234",
                        "7b812af0": "2708",
                        "9021a768": "3038",
                        "1df93b7f": "3237",
                        "511d152f": "3401",
                        e34113ea: "3428",
                        dda49074: "3678",
                        "4edc808e": "4173",
                        ac062bb8: "4342",
                        cc8f130c: "4467",
                        a2100039: "4473",
                        "0493d4c1": "4665",
                        f4951ebb: "4788",
                        bc5f4b18: "5348",
                        bb1d6f8b: "5534",
                        f26b3285: "5788",
                        "4edc9ce5": "5820",
                        "8122d123": "6746",
                        "5f7bc296": "6840",
                        "6309a6fc": "6843",
                        c1789402: "6900",
                        "2461ffa2": "7600",
                        cb0719ba: "7760",
                        "9bd07b54": "7949",
                        fa190965: "7957",
                        "29e92f5e": "8202",
                        "901af80f": "8404",
                        b3ff9d4c: "8862",
                        "5179419d": "9184",
                        "38f4bd33": "9185",
                        fad51da4: "9443",
                        "9118e005": "9452",
                        ec95bee0: "9460",
                        "1be78505": "9514"
                    }[e] || e),
                b.p + b.u(e)
            )
        }),
        (() => {
            var e = { 1303: 0, 532: 0 }
            ;(b.f.j = (a, t) => {
                var f = b.o(e, a) ? e[a] : void 0
                if (0 !== f)
                    if (f) t.push(f[2])
                    else if (/^(1303|532)$/.test(a)) e[a] = 0
                    else {
                        var r = new Promise((t, r) => (f = e[a] = [t, r]))
                        t.push((f[2] = r))
                        var d = b.p + b.u(a),
                            c = new Error()
                        b.l(
                            d,
                            (t) => {
                                if (
                                    b.o(e, a) &&
                                    (0 !== (f = e[a]) && (e[a] = void 0), f)
                                ) {
                                    var r =
                                            t &&
                                            ("load" === t.type
                                                ? "missing"
                                                : t.type),
                                        d = t && t.target && t.target.src
                                    ;(c.message =
                                        "Loading chunk " +
                                        a +
                                        " failed.\n(" +
                                        r +
                                        ": " +
                                        d +
                                        ")"),
                                        (c.name = "ChunkLoadError"),
                                        (c.type = r),
                                        (c.request = d),
                                        f[1](c)
                                }
                            },
                            "chunk-" + a,
                            a
                        )
                    }
            }),
                (b.O.j = (a) => 0 === e[a])
            var a = (a, t) => {
                    var f,
                        r,
                        [d, c, o] = t,
                        n = 0
                    if (d.some((a) => 0 !== e[a])) {
                        for (f in c) b.o(c, f) && (b.m[f] = c[f])
                        if (o) var i = o(b)
                    }
                    for (a && a(t); n < d.length; n++)
                        (r = d[n]), b.o(e, r) && e[r] && e[r][0](), (e[r] = 0)
                    return b.O(i)
                },
                t = (self.webpackChunkarktype_io =
                    self.webpackChunkarktype_io || [])
            t.forEach(a.bind(null, 0)), (t.push = a.bind(null, t.push.bind(t)))
        })()
})()
