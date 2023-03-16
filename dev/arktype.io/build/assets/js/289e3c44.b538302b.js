"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [1201],
    {
        9613: (e, n, t) => {
            t.d(n, { Zo: () => l, kt: () => u })
            var r = t(9496)
            function o(e, n, t) {
                return (
                    n in e
                        ? Object.defineProperty(e, n, {
                              value: t,
                              enumerable: !0,
                              configurable: !0,
                              writable: !0
                          })
                        : (e[n] = t),
                    e
                )
            }
            function a(e, n) {
                var t = Object.keys(e)
                if (Object.getOwnPropertySymbols) {
                    var r = Object.getOwnPropertySymbols(e)
                    n &&
                        (r = r.filter(function (n) {
                            return Object.getOwnPropertyDescriptor(
                                e,
                                n
                            ).enumerable
                        })),
                        t.push.apply(t, r)
                }
                return t
            }
            function i(e) {
                for (var n = 1; n < arguments.length; n++) {
                    var t = null != arguments[n] ? arguments[n] : {}
                    n % 2
                        ? a(Object(t), !0).forEach(function (n) {
                              o(e, n, t[n])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(t)
                          )
                        : a(Object(t)).forEach(function (n) {
                              Object.defineProperty(
                                  e,
                                  n,
                                  Object.getOwnPropertyDescriptor(t, n)
                              )
                          })
                }
                return e
            }
            function s(e, n) {
                if (null == e) return {}
                var t,
                    r,
                    o = (function (e, n) {
                        if (null == e) return {}
                        var t,
                            r,
                            o = {},
                            a = Object.keys(e)
                        for (r = 0; r < a.length; r++)
                            (t = a[r]), n.indexOf(t) >= 0 || (o[t] = e[t])
                        return o
                    })(e, n)
                if (Object.getOwnPropertySymbols) {
                    var a = Object.getOwnPropertySymbols(e)
                    for (r = 0; r < a.length; r++)
                        (t = a[r]),
                            n.indexOf(t) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    t
                                ) &&
                                    (o[t] = e[t]))
                }
                return o
            }
            var p = r.createContext({}),
                c = function (e) {
                    var n = r.useContext(p),
                        t = n
                    return (
                        e &&
                            (t =
                                "function" == typeof e ? e(n) : i(i({}, n), e)),
                        t
                    )
                },
                l = function (e) {
                    var n = c(e.components)
                    return r.createElement(p.Provider, { value: n }, e.children)
                },
                d = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var n = e.children
                        return r.createElement(r.Fragment, {}, n)
                    }
                },
                m = r.forwardRef(function (e, n) {
                    var t = e.components,
                        o = e.mdxType,
                        a = e.originalType,
                        p = e.parentName,
                        l = s(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        m = c(t),
                        u = o,
                        f = m["".concat(p, ".").concat(u)] || m[u] || d[u] || a
                    return t
                        ? r.createElement(
                              f,
                              i(i({ ref: n }, l), {}, { components: t })
                          )
                        : r.createElement(f, i({ ref: n }, l))
                })
            function u(e, n) {
                var t = arguments,
                    o = n && n.mdxType
                if ("string" == typeof e || o) {
                    var a = t.length,
                        i = new Array(a)
                    i[0] = m
                    var s = {}
                    for (var p in n) hasOwnProperty.call(n, p) && (s[p] = n[p])
                    ;(s.originalType = e),
                        (s.mdxType = "string" == typeof e ? e : o),
                        (i[1] = s)
                    for (var c = 2; c < a; c++) i[c] = t[c]
                    return r.createElement.apply(null, i)
                }
                return r.createElement.apply(null, t)
            }
            m.displayName = "MDXCreateElement"
        },
        6091: (e, n, t) => {
            t.d(n, { g: () => y })
            var r = t(9346),
                o = t(7374),
                a = t(4744),
                i = t(9826),
                s = t(9496),
                p = t(4096)
            var c = function (e) {
                    var n = l[e]
                    return (
                        'import {populateDemo} from "./populateDemo"\n(async () => {\n    try {\n        ' +
                        n[0] +
                        "\n        populateDemo(" +
                        n[1] +
                        ')\n    } catch(e) {\n        populateDemo({ \n            type: {\n                definition: ""\n            },\n            data: "",\n            problems: "ParseError: " + e.originalErr.message\n          } as any)\n    }\n})()'
                    )
                },
                l = {
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
            var d = {
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
                m = {
                    type: 'import { type } from "arktype"\n\n// Define your type...\nexport const user = type({\n    name: "string",\n    device: {\n        platform: "\'android\'|\'ios\'",\n        "version?": "number"\n    }\n})\n\n// Infer it...\nexport type User = typeof user.infer\n\n// Get validated data or clear, customizable error messages.\nexport const { data, problems } = user({\n    name: "Alan Turing",\n    device: {\n        platform: "enigma"\n    }\n})\n\nif (problems) {\n    // "device/platform must be \'android\' or \'ios\' (was \'enigma\')"\n    console.log(problems.summary)\n}\n',
                    scope: 'import { scope } from "arktype"\n\n// Scopes are collections of types that can reference each other.\nexport const types = scope({\n    package: {\n        name: "string",\n        "dependencies?": "package[]",\n        "contributors?": "contributor[]"\n    },\n    contributor: {\n        // Subtypes like \'email\' are inferred like \'string\' but provide additional validation at runtime.\n        email: "email",\n        "packages?": "package[]"\n    }\n}).compile()\n\n// Cyclic types are inferred to arbitrary depth...\nexport type Package = typeof types.package.infer\n\n// And can validate cyclic data.\nconst packageData: Package = {\n    name: "arktype",\n    dependencies: [{ name: "typescript" }],\n    contributors: [{ email: "david@sharktypeio" }]\n}\npackageData.dependencies![0].dependencies = [packageData]\n\nexport const { data, problems } = types.package(packageData)\n',
                    demo: 'import { type } from "arktype"\n\n// Define your type...\nexport const pkg = type({\n    name: "string",\n    version: "semver",\n    "contributors?": "1<email[]<=10"\n})\n\n// Infer it...\nexport type Package = typeof pkg.infer\n\n// Get validated data or clear, customizable error messages.\nexport const { data, problems } = pkg({\n    name: "arktype",\n    version: "1.0.0-alpha",\n    contributors: ["david@arktype.io"]\n})\n\n// "contributors must be more than 1 items long (was 1)"\nconsole.log(problems?.summary ?? data)\n'
                },
                u = "arktype-demo",
                f = (function () {
                    var e = (0, o.Z)(
                        (0, r.Z)().mark(function e(n) {
                            var t, o
                            return (0, r.Z)().wrap(function (e) {
                                for (;;)
                                    switch ((e.prev = e.next)) {
                                        case 0:
                                            return (
                                                (o = n.embedId),
                                                e.abrupt(
                                                    "return",
                                                    p.Z.embedProject(
                                                        u,
                                                        {
                                                            files: Object.assign(
                                                                ((t = {}),
                                                                (t[o + ".ts"] =
                                                                    m[o]),
                                                                (t["index.ts"] =
                                                                    c(o)),
                                                                t),
                                                                d
                                                            ),
                                                            title: o,
                                                            description:
                                                                "ArkType " +
                                                                o +
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
                                                            openFile: o + ".ts"
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
                    return function (n) {
                        return e.apply(this, arguments)
                    }
                })(),
                y = function (e) {
                    var n = (0, s.useState)(!0),
                        t = n[0],
                        r = n[1]
                    return (
                        (0, s.useEffect)(function () {
                            g(e, r)
                        }, []),
                        s.createElement(
                            a.Z,
                            { width: "100%", height: "600px" },
                            t ? s.createElement(i.Z, null) : null,
                            s.createElement("div", { id: u })
                        )
                    )
                },
                g = (function () {
                    var e = (0, o.Z)(
                        (0, r.Z)().mark(function e(n, t) {
                            var o
                            return (0, r.Z)().wrap(function (e) {
                                for (;;)
                                    switch ((e.prev = e.next)) {
                                        case 0:
                                            return (e.next = 2), f(n)
                                        case 2:
                                            ;(o = e.sent),
                                                setTimeout(function () {
                                                    return o.applyFsDiff({
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
                                                t(!1)
                                        case 5:
                                        case "end":
                                            return e.stop()
                                    }
                            }, e)
                        })
                    )
                    return function (n, t) {
                        return e.apply(this, arguments)
                    }
                })()
        },
        6991: (e, n, t) => {
            t.r(n),
                t.d(n, {
                    assets: () => d,
                    contentTitle: () => c,
                    default: () => f,
                    frontMatter: () => p,
                    metadata: () => l,
                    toc: () => m
                })
            var r = t(4250),
                o = t(7075),
                a = (t(9496), t(9613)),
                i = t(6091),
                s = ["components"],
                p = { hide_table_of_contents: !0 },
                c = "Scopes",
                l = {
                    unversionedId: "scopes",
                    id: "version-1.0.9-alpha/scopes",
                    title: "Scopes",
                    description: "",
                    source: "@site/versioned_docs/version-1.0.9-alpha/scopes.mdx",
                    sourceDirName: ".",
                    slug: "/scopes",
                    permalink: "/docs/scopes",
                    draft: !1,
                    tags: [],
                    version: "1.0.9-alpha",
                    frontMatter: { hide_table_of_contents: !0 },
                    sidebar: "sidebar",
                    previous: { title: "Intro", permalink: "/docs/" },
                    next: { title: "API", permalink: "/docs/api" }
                },
                d = {},
                m = [],
                u = { toc: m }
            function f(e) {
                var n = e.components,
                    t = (0, o.Z)(e, s)
                return (0, a.kt)(
                    "wrapper",
                    (0, r.Z)({}, u, t, { components: n, mdxType: "MDXLayout" }),
                    (0, a.kt)("h1", { id: "scopes" }, "Scopes"),
                    (0, a.kt)(i.g, {
                        embedId: "scope",
                        mdxType: "StackBlitzDemo"
                    })
                )
            }
            f.isMDXComponent = !0
        }
    }
])
