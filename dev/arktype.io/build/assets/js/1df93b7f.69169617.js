"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [3237],
    {
        4221: (e, t, n) => {
            n.d(t, { g: () => h })
            var r = n(9346),
                a = n(7374),
                i = n(4744),
                l = n(9826),
                o = n(9496),
                c = n(4096)
            var s = function (e) {
                    var t = m[e]
                    return (
                        'import {populateDemo} from "./populateDemo"\n(async () => {\n    try {\n        ' +
                        t[0] +
                        "\n        populateDemo(" +
                        t[1] +
                        ')\n    } catch(e) {\n        populateDemo({ \n            type: {\n                definition: ""\n            },\n            data: "",\n            problems: "ParseError: " + e.originalErr.message\n          } as any)\n    }\n})()'
                    )
                },
                m = {
                    type: [
                        'const { user, data, problems } = await import("./type")',
                        "{ type: user, data, problems }"
                    ],
                    scope: [
                        'const { types, data, problems } = await import("./scope")',
                        "{ type: types.package, data, problems }"
                    ],
                    demo: [
                        'const { pkg, data, problems } = await import("./demo")',
                        "{ type: pkg, data, problems }"
                    ]
                }
            var p = {
                    "index.html":
                        '<head>\n    <link href="http://fonts.cdnfonts.com/css/cascadia-code" rel="stylesheet" />\n</head>\n<div id="demo">\n    <div class="section">\n        <div class="card">\n            <h3>Definition</h3>\n            <pre><code id="definition"></code></pre>\n        </div>\n    </div>\n    <div class="section">\n        <div class="card">\n            <h3>Output</h3>\n            <pre><code id="output"></code></pre>\n        </div>\n    </div>\n</div>\n',
                    "demo.css":
                        'body {\n    font-family: "Cascadia Code", sans-serif;\n    background-color: hsl(220 18% 10%);\n}\n\n#demo {\n    display: flex;\n    flex-direction: column;\n    gap: 1rem;\n    margin: -0.5rem;\n    padding: 0.5rem;\n}\n\n#input {\n    display: flex;\n    flex-direction: row;\n    flex-wrap: wrap;\n    gap: 0.5rem;\n}\n\n.section {\n    display: flex;\n    flex-direction: column;\n    flex-grow: 1;\n    gap: 0.5rem;\n}\n\np {\n    white-space: pre-wrap;\n}\n\npre {\n    white-space: pre-wrap;\n}\n\nh3 {\n    margin: 0px;\n    color: #fffff0;\n}\n\n.key {\n    color: #80cff8;\n}\n.val {\n    color: #f5cf8f;\n}\n\n.card {\n    padding: 1rem;\n    background-color: rgb(18, 18, 18);\n    color: rgb(255, 255, 255);\n    /* transition: box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms; */\n    border-radius: 1rem;\n    box-shadow: rgba(0, 0, 0, 0.2) 0px 2px 1px -1px,\n        rgba(0, 0, 0, 0.14) 0px 1px 1px 0px, rgba(0, 0, 0, 0.12) 0px 1px 3px 0px;\n    background-image: linear-gradient(\n        rgba(255, 255, 255, 0.05),\n        rgba(255, 255, 255, 0.05)\n    );\n    height: 100%;\n}\n',
                    "populateDemo.ts":
                        'import "./demo.css"\nimport type { Problems, Type } from "arktype"\nimport { stringify } from "arktype/internal/utils/serialize.js"\n\ntype PopulateDemoArgs = {\n    type: Type\n    data: unknown\n    problems: Problems\n}\nexport const populateDemo = ({ data, type, problems }: PopulateDemoArgs) => {\n    const defElement = document.querySelector("#definition")!\n    defElement.textContent = stringify(type.definition, 2)\n    defElement.innerHTML = recolor(defElement.innerHTML)\n\n    const resultElement = document.querySelector("#output")!\n    if (problems) {\n        resultElement.textContent = `\u274c problems:\n\n${problems}`\n    } else {\n        resultElement.textContent = `\u2705 data:\n\n${stringify(\n            type(data).data,\n            2\n        )}`\n        resultElement.innerHTML = recolor(resultElement.innerHTML)\n    }\n}\n\nconst recolor = (input: string) => {\n    const lines = input.split("\\n")\n    const fixedInput: string[] = []\n    for (const line of lines) {\n        if (line.includes(":")) {\n            const parts = line.split(":")\n            fixedInput.push(`${buildKey(parts[0])}: ${buildVal(parts[1])}`)\n        } else {\n            fixedInput.push(line)\n        }\n    }\n    return fixedInput.join("\\n")\n}\n\nconst buildKey = (key: string) => {\n    return `<span class=\'key\'>${key}</span>`\n}\nconst buildVal = (val: string) => {\n    const formatted = val.trim()\n    if (formatted[formatted.length - 1] === ",") {\n        return `<span class=\'val\'>${formatted.replace(",", "")}</span>,`\n    } else if (formatted[formatted.length - 1] === "{") {\n        return "{"\n    }\n    return `<span class=\'val\'>${formatted}</span>`\n}\n',
                    "tsconfig.json": JSON.stringify(
                        {
                            compilerOptions: {
                                module: "esnext",
                                target: "esnext",
                                strict: !0
                            }
                        },
                        null,
                        4
                    )
                },
                d = {
                    type: 'import { type } from "arktype"\n\n// Definitions are statically parsed and inferred as TS.\nexport const user = type({\n    name: "string",\n    device: {\n        platform: "\'android\'|\'ios\'",\n        "version?": "number"\n    }\n})\n\n// Validators return typed data or clear, customizable errors.\nexport const { data, problems } = user({\n    name: "Alan Turing",\n    device: {\n        // problems.summary: "device/platform must be \'android\' or \'ios\' (was \'enigma\')"\n        platform: "enigma"\n    }\n})\n',
                    scope: 'import { scope } from "arktype"\n\n// Scopes are collections of types that can reference each other.\nexport const types = scope({\n    package: {\n        name: "string",\n        "dependencies?": "package[]",\n        "contributors?": "contributor[]"\n    },\n    contributor: {\n        // Subtypes like \'email\' are inferred like \'string\' but provide additional validation at runtime.\n        email: "email",\n        "packages?": "package[]"\n    }\n}).compile()\n\n// Cyclic types are inferred to arbitrary depth...\nexport type Package = typeof types.package.infer\n\n// And can validate cyclic data.\nconst packageData: Package = {\n    name: "arktype",\n    dependencies: [{ name: "typescript" }],\n    contributors: [{ email: "david@sharktypeio" }]\n}\npackageData.dependencies![0].dependencies = [packageData]\n\nexport const { data, problems } = types.package(packageData)\n',
                    demo: 'import { type } from "arktype"\n\n// Define your type...\nexport const pkg = type({\n    name: "string",\n    version: "semver",\n    "contributors?": "1<email[]<=10"\n})\n\n// Infer it...\nexport type Package = typeof pkg.infer\n\n// Get validated data or clear, customizable error messages.\nexport const { data, problems } = pkg({\n    name: "arktype",\n    version: "1.0.0-alpha",\n    contributors: ["david@arktype.io"]\n})\n\n// "contributors must be more than 1 items long (was 1)"\nconsole.log(problems?.summary ?? data)\n'
                },
                u = "arktype-demo",
                f = (function () {
                    var e = (0, a.Z)(
                        (0, r.Z)().mark(function e(t) {
                            var n, a
                            return (0, r.Z)().wrap(function (e) {
                                for (;;)
                                    switch ((e.prev = e.next)) {
                                        case 0:
                                            return (
                                                (a = t.embedId),
                                                e.abrupt(
                                                    "return",
                                                    c.Z.embedProject(
                                                        u,
                                                        {
                                                            files: Object.assign(
                                                                ((n = {}),
                                                                (n[a + ".ts"] =
                                                                    d[a]),
                                                                (n["index.ts"] =
                                                                    s(a)),
                                                                n),
                                                                p
                                                            ),
                                                            title: a,
                                                            description:
                                                                "ArkType " +
                                                                a +
                                                                " demo",
                                                            template:
                                                                "typescript",
                                                            dependencies: {
                                                                arktype:
                                                                    "1.0.9-alpha"
                                                            },
                                                            settings: {
                                                                compile: {
                                                                    clearConsole:
                                                                        !1,
                                                                    trigger:
                                                                        "keystroke"
                                                                }
                                                            }
                                                        },
                                                        {
                                                            height: "100%",
                                                            openFile: a + ".ts"
                                                        }
                                                    )
                                                )
                                            )
                                        case 2:
                                        case "end":
                                            return e.stop()
                                    }
                            }, e)
                        })
                    )
                    return function (t) {
                        return e.apply(this, arguments)
                    }
                })(),
                h = function (e) {
                    var t = (0, o.useState)(!0),
                        n = t[0],
                        r = t[1]
                    return (
                        (0, o.useEffect)(function () {
                            y(e, r)
                        }, []),
                        o.createElement(
                            i.Z,
                            { width: "100%", height: "600px" },
                            n ? o.createElement(l.Z, null) : null,
                            o.createElement("div", { id: u })
                        )
                    )
                },
                y = (function () {
                    var e = (0, a.Z)(
                        (0, r.Z)().mark(function e(t, n) {
                            var a
                            return (0, r.Z)().wrap(function (e) {
                                for (;;)
                                    switch ((e.prev = e.next)) {
                                        case 0:
                                            return (e.next = 2), f(t)
                                        case 2:
                                            ;(a = e.sent),
                                                setTimeout(function () {
                                                    return a.applyFsDiff({
                                                        create: {
                                                            "tsconfig.json":
                                                                JSON.stringify(
                                                                    {
                                                                        compilerOptions:
                                                                            {
                                                                                module: "esnext",
                                                                                target: "esnext",
                                                                                strict: !0
                                                                            }
                                                                    },
                                                                    null,
                                                                    4
                                                                )
                                                        },
                                                        destroy: []
                                                    })
                                                }, 5e3),
                                                n(!1)
                                        case 5:
                                        case "end":
                                            return e.stop()
                                    }
                            }, e)
                        })
                    )
                    return function (t, n) {
                        return e.apply(this, arguments)
                    }
                })()
        },
        148: (e, t, n) => {
            n.r(t), n.d(t, { default: () => se })
            var r,
                a,
                i,
                l,
                o,
                c,
                s,
                m,
                p,
                d,
                u,
                f = n(1483),
                h = n(6837),
                y = n(4168),
                g = n(9496),
                b = n(4019),
                v = n(4744),
                E = n(1916),
                k = n(4250),
                x = n(2920),
                w = n(1941),
                Z = n(856),
                z = function (e) {
                    return g.createElement(
                        "video",
                        (0, k.Z)(
                            {
                                autoPlay: !0,
                                loop: !0,
                                controls: !0,
                                playsInline: !0,
                                muted: !0,
                                disablePictureInPicture: !0
                            },
                            e
                        )
                    )
                },
                T = n(4452),
                I = function () {
                    return (0, T.Z)("(max-width:1250px)")
                },
                C = g.createElement(
                    "div",
                    { className: "inferable-code" },
                    g.createElement(
                        Z.Z,
                        { language: "typescript" },
                        'const user = type({\n    name: "string",\n    device: {\n        platform: "\'android\'|\'ios\'",\n        "version?": "number"\n    }\n})\n\n\n// Hover to infer...\ntype User = typeof user.infer\n'
                    ),
                    g.createElement("img", {
                        height: "50%",
                        src: "/img/isomorphicHover.png"
                    })
                ),
                H = g.createElement(
                    "div",
                    { className: "inferable-code" },
                    g.createElement(
                        Z.Z,
                        { language: "typescript" },
                        "// Hover to infer...\n",
                        'const arkUser = type({\n    name: /^ark.*$/ as Infer<`ark${string}`>,\n    birthday: morph("string", (s) => new Date(s)),\n    "powerLevel?": "1<=number<9000"\n})'
                    ),
                    g.createElement("img", {
                        height: "60%",
                        src: "/img/arkUser.png"
                    })
                ),
                S = g.createElement(
                    "div",
                    { className: "inferable-code" },
                    g.createElement(
                        Z.Z,
                        { language: "typescript" },
                        "// Hover to infer...\n",
                        'const zodUser = z.object({\n    name: z.custom<`zod${string}`>(\n        (val) => typeof val === "string" && /^zod.*$/.test(val)\n    ),\n    birthday: z.preprocess(\n        (arg) => (typeof arg === "string" ? new Date(arg) : undefined),\n        z.date()\n    ),\n    powerLevel: z.number().gte(1).lt(9000).optional()\n})'
                    ),
                    g.createElement("img", {
                        height: "80%",
                        src: "/img/zodInfer.png"
                    })
                ),
                j = g.createElement(g.Fragment, null, H, S),
                D = g.createElement(
                    "div",
                    { className: "inferable-code" },
                    g.createElement(
                        Z.Z,
                        { language: "typescript" },
                        "// Hover to see internal representation...\n",
                        "export const deepLeftOrRight = union(\n    {\n        auto: {\n            discriminated: \"'left'\"\n        }\n    },\n    {\n        auto: {\n            discriminated: \"'right'\"\n        }\n    }\n)"
                    ),
                    g.createElement("img", { src: "/img/optimizedUnion.png" })
                ),
                O = g.createElement(
                    "div",
                    { className: "inferable-code" },
                    g.createElement(
                        Z.Z,
                        { language: "typescript" },
                        "// Hover to see internal representation...\n",
                        'export const numericIntersection = type(\n    "(1 <= number%2 < 100) & (0 < number%3 <= 99)"\n)',
                        "\n       \n\n\n\n\n"
                    ),
                    g.createElement("img", { src: "/img/optimizedNumber.png" })
                ),
                M = [
                    {
                        title: "Isomorphic",
                        description:
                            "Define types using TS syntax. Infer them 1:1. Use them to validate your data at runtime.",
                        image: C
                    },
                    {
                        title: "Concise",
                        description: "Say more with less",
                        image: j
                    },
                    {
                        title: "Optimized",
                        description:
                            "ArkType is not just a validator\u2014 it's a full type system. Operations are deeply computed and optimized by default",
                        image: g.createElement(g.Fragment, null, D, O)
                    },
                    {
                        title: "Type-safe",
                        description:
                            "String definitions are statically parsed with each character you type and give detailed feedback just like in your editor.",
                        image: g.createElement(
                            v.Z,
                            { width: "100%" },
                            g.createElement(z, { src: "/img/typePerf.mp4" }),
                            g.createElement(
                                "caption",
                                { style: { fontSize: ".8rem" } },
                                "Worried about performance? Don't be. This is how it feels to interact with a scope of 100 cyclic types (you may want to go fullscreen to see the details!)"
                            )
                        )
                    }
                ],
                P = function () {
                    return g.createElement(
                        x.ZP,
                        {
                            sx: { alignContent: "center" },
                            columns: I() ? 1 : 2,
                            spacing: 3
                        },
                        M.map(function (e, t) {
                            return g.createElement(N, (0, k.Z)({ key: t }, e))
                        })
                    )
                },
                N = function (e) {
                    var t,
                        n = (0, w.Z)()
                    return g.createElement(
                        v.Z,
                        { spacing: 2, maxWidth: "40em" },
                        g.createElement(
                            E.Z,
                            {
                                component: "h3",
                                variant: "h5",
                                fontWeight: "700",
                                width: "100%",
                                textAlign: "center",
                                color: n.palette.info.main
                            },
                            e.title
                        ),
                        g.createElement(
                            E.Z,
                            {
                                component: "p",
                                variant: "body1",
                                fontWeight: "300",
                                minHeight: "3rem"
                            },
                            e.description
                        ),
                        g.createElement(
                            "div",
                            null,
                            null != (t = e.image) ? t : null
                        )
                    )
                },
                $ = n(9332),
                F = n(1401),
                L = n(8352),
                A = n(8176),
                W = n(949),
                U = n(4221),
                q = n(7192),
                V = n(5579),
                _ = function () {
                    var e = (0, $.TH)().pathname,
                        t = (0, w.Z)().palette,
                        n = "dark" === (0, b.I)().colorMode,
                        r = (0, g.useState)(e.includes("try")),
                        a = r[0],
                        i = r[1],
                        l = n ? "#ffffff00" : "#000000aa"
                    return g.createElement(
                        v.Z,
                        { alignItems: "start", width: "100%" },
                        g.createElement(
                            A.Z,
                            {
                                variant: "contained",
                                sx: {
                                    backgroundColor: l,
                                    backdropFilter: "blur(4px)",
                                    borderRadius: "2rem",
                                    fontSize: "1.5rem",
                                    fontFamily: '"Cascadia Code", sans-serif',
                                    textTransform: "none",
                                    color: t.primary.main,
                                    "&:hover": {
                                        backgroundColor: l,
                                        color: t.secondary.main,
                                        backdropFilter: "blur(6px)"
                                    },
                                    zIndex: 1
                                },
                                onClick: function () {
                                    return i(!a)
                                },
                                endIcon: g.createElement(
                                    "div",
                                    { style: { display: "flex" } },
                                    a
                                        ? g.createElement(F.Z, null)
                                        : g.createElement(L.Z, null)
                                )
                            },
                            a ? "$ wq!" : "$ code demo.ts",
                            g.createElement(
                                W.E.div,
                                {
                                    animate: { opacity: 0 },
                                    transition: {
                                        duration: 0.5,
                                        repeatType: "mirror",
                                        repeat: 1 / 0
                                    }
                                },
                                "_"
                            )
                        ),
                        g.createElement(
                            v.Z,
                            { width: "100%" },
                            a
                                ? g.createElement(U.g, { embedId: "demo" })
                                : g.createElement(z, {
                                      src: "/img/arktype.mp4",
                                      style: {
                                          width: "100%",
                                          marginTop: "-2.8rem"
                                      }
                                  })
                        ),
                        g.createElement(
                            "sub",
                            null,
                            g.createElement("code", null, "typescript@4.9.5"),
                            " in VS Code\u2014 no extensions or plugins required (",
                            g.createElement(
                                "a",
                                {
                                    href: "https://github.com/arktypeio/arktype#how",
                                    target: "_blank"
                                },
                                "how?"
                            ),
                            ")"
                        )
                    )
                },
                R = n(1430),
                B = n(8070),
                G = n(31),
                J = n(6115),
                K = n(84),
                Y = function () {
                    var e = (0, J.v)().scrollY,
                        t = (0, K._)(),
                        n = { position: "absolute", top: 60, width: 386 }
                    return (
                        e.onChange(function (e) {
                            t.start(
                                e
                                    ? {
                                          position: "fixed",
                                          top: "50%",
                                          width: 250
                                      }
                                    : n
                            )
                        }),
                        g.createElement(
                            W.E.div,
                            { style: { right: 0 }, initial: n, animate: t },
                            g.createElement(X, null)
                        )
                    )
                },
                Q = function () {
                    return g.createElement(
                        "div",
                        { style: { width: "100%" } },
                        g.createElement(X, null)
                    )
                },
                X = function () {
                    return g.createElement(
                        R.Z,
                        {
                            style: {
                                height: "8rem",
                                margin: ".5rem",
                                padding: ".7rem 1rem 0rem",
                                backgroundColor: "#ffffff00",
                                backdropFilter: "blur(1px)",
                                borderRadius: "2rem",
                                zIndex: 1,
                                fontFamily: '"Cascadia Code", sans-serif'
                            },
                            elevation: 8
                        },
                        g.createElement(
                            G.Z,
                            { className: "installationTabs" },
                            g.createElement(
                                B.Z,
                                { value: "node", default: !0 },
                                g.createElement(
                                    G.Z,
                                    { className: "subTabs" },
                                    g.createElement(
                                        B.Z,
                                        {
                                            value: "npm",
                                            attributes: { className: "npmTab" }
                                        },
                                        g.createElement(
                                            Z.Z,
                                            { language: "bash" },
                                            "npm install arktype"
                                        )
                                    ),
                                    g.createElement(
                                        B.Z,
                                        {
                                            value: "pnpm",
                                            attributes: { className: "pnpmTab" }
                                        },
                                        g.createElement(
                                            Z.Z,
                                            { language: "bash" },
                                            "pnpm add arktype"
                                        )
                                    ),
                                    g.createElement(
                                        B.Z,
                                        {
                                            value: "yarn",
                                            attributes: { className: "yarnTab" }
                                        },
                                        g.createElement(
                                            Z.Z,
                                            { language: "bash" },
                                            "yarn add arktype"
                                        )
                                    )
                                )
                            ),
                            g.createElement(
                                B.Z,
                                { value: "bun", label: "bun" },
                                g.createElement(
                                    Z.Z,
                                    { language: "bash" },
                                    "bun install arktype"
                                )
                            ),
                            g.createElement(
                                B.Z,
                                { value: "deno", label: "deno" },
                                g.createElement(
                                    Z.Z,
                                    { language: "typescript" },
                                    'import { type } from "https://deno.land/x/arktype/main.ts"'
                                )
                            )
                        )
                    )
                },
                ee = function () {
                    var e = (0, b.I)().colorMode
                    return g.createElement(
                        "main",
                        {
                            style: { display: "flex", justifyContent: "center" }
                        },
                        g.createElement(
                            v.Z,
                            {
                                justifyContent: "center",
                                alignItems: "center",
                                padding: "1rem 0rem 1rem",
                                spacing: 1,
                                width: "100%",
                                maxWidth: "60rem"
                            },
                            g.createElement(_, null),
                            (0, T.Z)("(min-width:1420px)")
                                ? g.createElement(Y, null)
                                : g.createElement(Q, null),
                            g.createElement(
                                E.Z,
                                {
                                    color:
                                        "dark" === e
                                            ? "primary.light"
                                            : "primary.dark",
                                    style: {
                                        marginTop: "2rem",
                                        marginBottom: "2rem"
                                    },
                                    fontSize: "1.3rem"
                                },
                                g.createElement(
                                    "p",
                                    null,
                                    "ArkType is a runtime validation library that can infer",
                                    " ",
                                    g.createElement(
                                        "b",
                                        null,
                                        "TypeScript definitions 1:1"
                                    ),
                                    " and reuse them as",
                                    " ",
                                    g.createElement(
                                        "b",
                                        null,
                                        "highly-optimized validators"
                                    ),
                                    " for your data."
                                ),
                                g.createElement(
                                    "p",
                                    null,
                                    "With each character you type, you'll get",
                                    " ",
                                    g.createElement(
                                        "b",
                                        null,
                                        "immediate feedback from your editor"
                                    ),
                                    " in the form of either a fully-inferred ",
                                    g.createElement("code", null, "Type"),
                                    " or a specific and helpful ",
                                    g.createElement("code", null, "ParseError"),
                                    "."
                                ),
                                g.createElement(
                                    "p",
                                    null,
                                    "This result exactly mirrors what you can expect to happen at runtime down to the punctuation of the error message- ",
                                    g.createElement(
                                        "b",
                                        null,
                                        "no plugins required"
                                    ),
                                    "."
                                )
                            ),
                            g.createElement(P, null)
                        )
                    )
                },
                te = ["title", "titleId"]
            function ne() {
                return (
                    (ne = Object.assign
                        ? Object.assign.bind()
                        : function (e) {
                              for (var t = 1; t < arguments.length; t++) {
                                  var n = arguments[t]
                                  for (var r in n)
                                      Object.prototype.hasOwnProperty.call(
                                          n,
                                          r
                                      ) && (e[r] = n[r])
                              }
                              return e
                          }),
                    ne.apply(this, arguments)
                )
            }
            function re(e, t) {
                if (null == e) return {}
                var n,
                    r,
                    a = (function (e, t) {
                        if (null == e) return {}
                        var n,
                            r,
                            a = {},
                            i = Object.keys(e)
                        for (r = 0; r < i.length; r++)
                            (n = i[r]), t.indexOf(n) >= 0 || (a[n] = e[n])
                        return a
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var i = Object.getOwnPropertySymbols(e)
                    for (r = 0; r < i.length; r++)
                        (n = i[r]),
                            t.indexOf(n) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    n
                                ) &&
                                    (a[n] = e[n]))
                }
                return a
            }
            const ae = function (e) {
                var t = e.title,
                    n = e.titleId,
                    f = re(e, te)
                return g.createElement(
                    "svg",
                    ne({ viewBox: "0 0 375 375", "aria-labelledby": n }, f),
                    t ? g.createElement("title", { id: n }, t) : null,
                    r ||
                        (r = g.createElement("path", {
                            fill: "#4b3621",
                            d: "M5.314 281.357h27.799l9.62-38.835a5.288 5.337 0 0 1 5.156-4.077h212.609a5.288 5.337 0 0 1 5.156 4.077l9.461 38.3 37.844-4.775c1.754-.268 3.508.43 4.678 1.824 1.169 1.34 1.542 3.218 1.063 4.935l-10.63 37.548a5.295 5.344 0 0 1-5.103 3.916H5.315c-2.923 0-5.316-2.414-5.316-5.364V286.72c0-2.95 2.391-5.364 5.315-5.364Zm127.566-32.184H52.035l-7.972 32.184h88.817zm31.89 0h-21.26v32.184h21.26zm91.582 0h-80.95v32.184h88.923zM10.63 313.542h288.35l7.283-25.855-34.55 4.344c-.212.054-.425.054-.637.054H10.629v21.457z"
                        })),
                    a ||
                        (a = g.createElement("path", {
                            fill: "none",
                            d: "M106.994 267.84a5.281 5.33 0 0 0 4.624 2.789c.904 0 1.754-.215 2.604-.697a5.358 5.358 0 0 0 2.073-7.296c-1.435-2.574-4.624-3.54-7.229-2.092-2.55 1.449-3.507 4.72-2.072 7.296zm-43.212-2.575c0 2.95 2.338 5.364 5.262 5.364h.052c2.924 0 5.316-2.414 5.316-5.364 0-2.95-2.392-5.364-5.316-5.364-2.923 0-5.314 2.413-5.314 5.364zm127.671.805c.425 2.628 2.658 4.56 5.262 4.56.266 0 .531 0 .797-.054 2.87-.43 4.943-3.165 4.465-6.115-.426-2.95-3.083-4.989-6.006-4.506h-.053c-2.87.428-4.89 3.165-4.465 6.114zm21.155-.805c0 2.95 2.391 5.364 5.315 5.364 2.924 0 5.369-2.414 5.369-5.364 0-2.95-2.392-5.364-5.316-5.364h-.053c-2.923 0-5.315 2.413-5.315 5.364zm-127.566 0c0 2.95 2.339 5.364 5.262 5.364h.053c2.923 0 5.316-2.414 5.316-5.364 0-2.95-2.392-5.364-5.316-5.364s-5.315 2.413-5.315 5.364zm152.866 5.203a5.232 5.28 0 0 0 1.276.161 5.284 5.284 0 0 0 5.156-4.077c.744-2.843-.957-5.793-3.827-6.49h-.053c-2.87-.698-5.74 1.018-6.432 3.916a5.39 5.39 0 0 0 3.88 6.49z"
                        })),
                    i ||
                        (i = g.createElement("path", {
                            fill: "none",
                            d: "M182.736 249.173h73.616l6.644 26.82h-80.26Zm55.172 21.295a5.232 5.28 0 0 0 1.276.161 5.284 5.284 0 0 0 5.156-4.077c.744-2.843-.957-5.793-3.827-6.49h-.053c-2.87-.698-5.74 1.018-6.432 3.916a5.39 5.39 0 0 0 3.88 6.49zm-19.985.161c2.923 0 5.369-2.414 5.369-5.364 0-2.95-2.392-5.364-5.316-5.364h-.053c-2.923 0-5.315 2.413-5.315 5.364 0 2.95 2.392 5.364 5.315 5.364zm-21.208 0c.266 0 .532 0 .798-.053 2.87-.43 4.943-3.165 4.464-6.115-.425-2.95-3.082-4.989-6.006-4.506h-.053c-2.87.43-4.89 3.165-4.464 6.115.424 2.627 2.657 4.56 5.262 4.56z"
                        })),
                    l ||
                        (l = g.createElement("path", {
                            fill: "none",
                            d: "M182.736 249.173v26.82h80.26l1.329 5.364H175.4v-32.184zm-17.966 0h-13.925v26.82h13.925z"
                        })),
                    o ||
                        (o = g.createElement("path", {
                            fill: "none",
                            d: "M150.845 249.173v26.82h13.925v5.364h-21.26v-32.184zm-92.805 0h74.84v26.82H51.397Zm48.954 18.667a5.281 5.33 0 0 0 4.624 2.789c.904 0 1.754-.215 2.604-.697a5.358 5.358 0 0 0 2.073-7.296c-1.435-2.574-4.624-3.54-7.229-2.092-2.55 1.449-3.507 4.72-2.072 7.296zm-16.69 2.79h.053c2.923 0 5.316-2.415 5.316-5.365s-2.392-5.364-5.316-5.364-5.315 2.413-5.315 5.364c0 2.95 2.34 5.364 5.262 5.364zm-21.26 0h.052c2.924 0 5.316-2.415 5.316-5.365s-2.392-5.364-5.316-5.364c-2.923 0-5.315 2.413-5.315 5.364 0 2.95 2.34 5.364 5.262 5.364z"
                        })),
                    c ||
                        (c = g.createElement("path", {
                            fill: "none",
                            d: "M52.035 249.173h6.006l-6.644 26.82h81.483v5.364H44.062Zm-34.071 42.912h253.111c.213 0 .426 0 .638-.053l34.55-4.345-5.773 20.49H17.964Z"
                        })),
                    s ||
                        (s = g.createElement("path", {
                            fill: "none",
                            d: "m300.49 308.178-1.51 5.364zM17.964 292.085v16.093H300.49l-1.51 5.364H10.63v-21.457z"
                        })),
                    m ||
                        (m = g.createElement("path", {
                            fill: "none",
                            d: "M10.934 302.813v-10.728l131.358.01 131.358.01 15.636-1.955c8.6-1.076 15.786-1.805 15.968-1.621.182.184-1.236 5.887-3.152 12.674l-3.485 12.34H10.934Z"
                        })),
                    p ||
                        (p = g.createElement("path", {
                            fill: "#eb9f2e",
                            d: "M11.237 302.813v-10.728l132.573-.01 132.573-.01 12.453-1.519c14.274-1.741 15.793-1.814 15.794-.759 0 .422-1.407 5.939-3.128 12.26l-3.13 11.495H11.238Z"
                        })),
                    d ||
                        (d = g.createElement("path", {
                            fill: "none",
                            d: "M44.664 280.591c.009-.253 1.734-7.356 3.834-15.785l3.817-15.326 40.205-.157 40.205-.158v31.886h-44.04c-24.221 0-44.031-.207-44.021-.46zm28.34-11.294c1.408-1.335 1.898-4.63 1.03-6.916-.493-1.295-3.389-2.786-5.41-2.786-2.105 0-5.147 3.07-5.147 5.194 0 1.889 1.463 4.981 2.569 5.43 2.048.832 5.606.36 6.959-.922zm21.261 0c1.407-1.335 1.898-4.63 1.029-6.916-.493-1.295-3.389-2.786-5.41-2.786-2.105 0-5.147 3.07-5.147 5.194 0 1.889 1.463 4.981 2.569 5.43 2.049.832 5.606.36 6.959-.922zm20.992.12c1.898-1.506 2.42-4.01 1.367-6.554-.942-2.274-2.512-3.268-5.167-3.268-2.42 0-5.46 2.891-5.46 5.194 0 1.889 1.463 4.981 2.57 5.43 1.852.752 5.245.346 6.69-.802zm28.401-4.305v-15.938h20.653v31.876h-20.653z"
                        })),
                    u ||
                        (u = g.createElement("path", {
                            fill: "#eb9f2e",
                            d: "M175.852 265.112v-15.938h80.135l.6 2.299c.33 1.264 1.993 7.953 3.694 14.865 1.702 6.912 3.237 13.05 3.413 13.64.301 1.015-2.064 1.073-43.761 1.073h-44.08Zm24.73 4.138c1.832-2.02 2.163-3.777 1.165-6.189-1.626-3.926-5.907-4.728-8.933-1.674-1.989 2.007-2.257 4.073-.877 6.765 1.064 2.077 1.647 2.365 4.918 2.429 1.832.036 2.801-.31 3.727-1.33zm21.246 0c1.735-1.934 2.089-3.992 1.098-6.384-1.495-3.61-5.994-4.363-8.852-1.479-1.988 2.007-2.256 4.073-.877 6.765 1.064 2.077 1.647 2.365 4.918 2.429 1.836.036 2.796-.308 3.713-1.33zm21.259.047c1.038-.985 1.406-2.009 1.406-3.917 0-3.434-1.442-5.155-4.685-5.594-2.255-.305-2.757-.131-4.397 1.524-2.067 2.086-2.35 4.117-.954 6.842 1.06 2.067 1.651 2.365 4.833 2.429 1.666.034 2.817-.356 3.797-1.284zm-99.429-4.185v-15.938h20.653v31.876h-20.653zm-78.814 15.479c-10.775-.094-19.59-.408-19.59-.699 0-.797 7.103-29.51 7.366-29.774.125-.127 18.2-.322 40.166-.434l39.939-.204v31.571l-24.146-.145c-13.28-.079-32.961-.22-43.735-.315Zm7.764-10.585c1.609-.87 2.585-4.818 1.772-7.171-1.21-3.501-6.312-4.384-9.2-1.593-1.966 1.902-2.253 4.697-.776 7.579.84 1.64 1.212 1.808 3.988 1.808 1.684 0 3.58-.28 4.216-.623zm21.26 0c1.61-.87 2.585-4.818 1.772-7.171-1.21-3.501-6.312-4.384-9.2-1.593-1.966 1.902-2.253 4.697-.776 7.579.84 1.64 1.212 1.808 3.988 1.808 1.684 0 3.581-.28 4.216-.623zm21.833-.587c1.661-1.676 2.08-3.852 1.24-6.424-.847-2.588-2.125-3.4-5.354-3.4-4.654 0-7.006 4.654-4.663 9.226.855 1.668 1.184 1.808 4.252 1.808 2.501 0 3.623-.3 4.525-1.21z"
                        }))
                )
            }
            var ie = function () {
                    for (
                        var e,
                            t,
                            n,
                            r =
                                ((e = (0, g.useState)({
                                    width: globalThis.innerWidth,
                                    height: globalThis.innerHeight
                                })),
                                (t = e[0]),
                                (n = e[1]),
                                (0, g.useEffect)(function () {
                                    var e = function () {
                                        n({
                                            width: window.innerWidth,
                                            height: window.innerHeight
                                        })
                                    }
                                    return (
                                        window.addEventListener("resize", e),
                                        function () {
                                            window.removeEventListener(
                                                "resize",
                                                e
                                            )
                                        }
                                    )
                                }, []),
                                t).width / 16,
                            a = [],
                            i = 0;
                        i < r;
                        i++
                    )
                        a.push(i % 2 ? 2 : 0)
                    return g.createElement(
                        W.E.div,
                        {
                            style: {
                                position: "absolute",
                                bottom: -20,
                                opacity: 0.4,
                                zIndex: 1
                            },
                            initial: { left: "-5%" },
                            animate: { left: "100%", y: a },
                            transition: {
                                duration: r,
                                repeat: 1 / 0,
                                ease: "linear",
                                delay: 1
                            }
                        },
                        g.createElement(ae, { style: { width: 100 } })
                    )
                },
                le = function (e) {
                    var t = e.name
                    return g.createElement("img", {
                        style: { height: "100%" },
                        src: "/img/integrationLogos/" + t + ".svg"
                    })
                },
                oe = function (e) {
                    var t = e.names
                    return g.createElement(
                        "div",
                        {
                            style: {
                                position: "relative",
                                height: "100%",
                                width: 200
                            }
                        },
                        g.createElement(
                            W.E.div,
                            {
                                style: {
                                    position: "absolute",
                                    height: 70,
                                    opacity: 0.1
                                },
                                initial: { top: 55, left: 70 }
                            },
                            g.createElement(le, { name: t[0] })
                        ),
                        g.createElement(
                            W.E.div,
                            {
                                style: {
                                    position: "absolute",
                                    height: 60,
                                    opacity: 0.25
                                },
                                initial: { top: 30, left: 130 }
                            },
                            g.createElement(le, { name: t[1] })
                        ),
                        g.createElement(
                            W.E.div,
                            {
                                style: {
                                    position: "absolute",
                                    height: 50,
                                    opacity: 0.25
                                },
                                initial: { top: 100, left: 30 }
                            },
                            g.createElement(le, { name: t[2] })
                        ),
                        g.createElement(
                            W.E.div,
                            {
                                style: {
                                    position: "absolute",
                                    height: 45,
                                    opacity: 0.25
                                },
                                initial: { top: 20, left: 50 }
                            },
                            g.createElement(le, { name: t[3] })
                        )
                    )
                },
                ce = function (e) {
                    var t = e.title,
                        n = e.tagline
                    return g.createElement(
                        "header",
                        {
                            style: {
                                height: "10rem",
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center"
                            }
                        },
                        g.createElement(oe, {
                            names: ["typescript", "vscode", "intellij", "vim"]
                        }),
                        g.createElement(
                            v.Z,
                            { flexGrow: 1 },
                            g.createElement(
                                E.Z,
                                {
                                    component: "h1",
                                    variant: "h2",
                                    color: "secondary"
                                },
                                t
                            ),
                            g.createElement(
                                E.Z,
                                {
                                    component: "h2",
                                    variant: "h6",
                                    color: "common.white",
                                    style: {
                                        whiteSpace: "nowrap",
                                        fontSize: I() ? "1rem" : "unset"
                                    }
                                },
                                n
                            )
                        ),
                        g.createElement(oe, {
                            names: ["javascript", "chromium", "node", "deno"]
                        }),
                        g.createElement(ie, null)
                    )
                }
            const se = function () {
                var e = (0, f.Z)().siteConfig
                return g.createElement(
                    y.Z,
                    { title: e.title, description: e.tagline },
                    g.createElement(
                        h.Z,
                        {
                            theme: (0, q.Z)(
                                (0, V.Z)({
                                    palette: {
                                        primary: {
                                            dark: "#085b92",
                                            light: "#80cff8",
                                            main: "#009EFF"
                                        },
                                        secondary: {
                                            main: "#eb9f2e",
                                            dark: "#4b3621",
                                            light: "#f5cf8f"
                                        },
                                        common: {
                                            white: "#fffff0",
                                            black: "#1b1b1b"
                                        }
                                    },
                                    typography: {
                                        fontFamily: "'Raleway', sans-serif"
                                    }
                                })
                            )
                        },
                        g.createElement(ce, {
                            title: e.title,
                            tagline: e.tagline
                        }),
                        g.createElement(ee, null)
                    )
                )
            }
        }
    }
])
