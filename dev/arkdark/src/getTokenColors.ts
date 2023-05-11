import { Palette, pallete } from "./sharedPalette.js"

const { background, foreground, comment, red, orange } = pallete

export const getTokenColors = (palette: Palette, useItalics: boolean) => {
    const { variables, keywordsAndTokens, primitives, functions, types } =
        palette
    return [
        {
            name: "Global settings",
            settings: {
                background: background,
                foreground: foreground
            }
        },
        {
            name: "Comment",
            scope: "comment",
            settings: {
                foreground: comment
            }
        },
        {
            name: "String",
            scope: "string",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "String Quoted",
            scope: "string.quoted",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Support Constant Math",
            scope: "support.constant.math",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Number",
            scope: ["constant.numeric", "constant.character.numeric"],
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Built-in constant",
            scope: [
                "constant.language",
                "punctuation.definition.constant",
                "variable.other.constant"
            ],
            settings: {
                foreground: foreground
            }
        },
        {
            name: "User-defined constant",
            scope: ["constant.character", "constant.other"],
            settings: {
                foreground: functions
            }
        },
        {
            name: "Constant Character Escape",
            scope: "constant.character.escape",
            settings: {
                foreground: variables
            }
        },
        {
            name: "RegExp String",
            scope: ["string.regexp", "string.regexp keyword.other"],
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Comma in functions",
            scope: "meta.function punctuation.separator.comma",
            settings: {
                foreground: foreground
            }
        },
        {
            name: "Variable",
            scope: "variable",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Keyword",
            scope: ["punctuation.accessor", "keyword"],
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Storage",
            scope: "storage",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Storage type",
            scope: [
                "storage.type",
                "meta.var.expr storage.type",
                "meta.class meta.method.declaration meta.var.expr storage.type.js"
            ],
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Class name",
            scope: ["entity.name.class", "meta.class entity.name.type.class"],
            settings: {
                foreground: functions
            }
        },
        {
            name: "Inherited class",
            scope: "entity.other.inherited-class",
            settings: {
                foreground: variables
            }
        },
        {
            name: "Function name",
            scope: "entity.name.function",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Function Parameters",
            scope: "variable.parameter",
            settings: {
                foreground: foreground
            }
        },
        {
            name: "Meta Tag",
            scope: ["punctuation.definition.tag", "meta.tag"],
            settings: {
                foreground: foreground
            }
        },
        {
            name: "HTML Tag names",
            scope: [
                "support.class.component",
                "meta.tag.other.html",
                "meta.tag.other.js",
                "meta.tag.other.tsx",
                "meta.tag.tsx",
                "meta.tag.html"
            ],
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "HTML Tag names",
            scope: [
                "entity.name.tag.tsx",
                "entity.name.tag.js",
                "entity.name.tag"
            ],
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Tag attribute",
            scope: "entity.other.attribute-name",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Entity Name Tag Custom",
            scope: "entity.name.tag.custom",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Library (function & constant)",
            scope: ["support.function", "support.constant"],
            settings: {
                foreground: functions
            }
        },
        {
            name: "Support Constant Property Value meta",
            scope: "support.constant.meta.property-value",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Library class/type",
            scope: ["support.type", "support.class"],
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Support Variable DOM",
            scope: "support.variable.dom",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Invalid",
            scope: "invalid",
            settings: {
                background: red,
                foreground: foreground
            }
        },
        {
            name: "Invalid deprecated",
            scope: "invalid.deprecated",
            settings: {
                foreground: foreground,
                background: red
            }
        },
        {
            name: "Keyword Operator",
            scope: "keyword.operator",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Keyword Operator Relational",
            scope: "keyword.operator.relational",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Keyword Operator Assignment",
            scope: "keyword.operator.assignment",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Double-Slashed Comment",
            scope: "comment.line.double-slash",
            settings: {
                foreground: comment
            }
        },
        {
            name: "Null",
            scope: "constant.language.null",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Meta Brace",
            scope: "meta.brace",
            settings: {
                foreground: foreground
            }
        },
        {
            name: "Meta Delimiter Period",
            scope: "meta.delimiter.period",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Boolean",
            scope: "constant.language.boolean",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Object Comma",
            scope: "object.comma",
            settings: {
                foreground: foreground
            }
        },
        {
            name: "Variable Parameter Function",
            scope: "variable.parameter.function",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Support Type Property Name & entity name tags",
            scope: [
                "support.type.vendokeywordsAndTokens.property-name",
                "support.constant.vendokeywordsAndTokens.property-value",
                "support.type.property-name",
                "meta.property-list entity.name.tag"
            ],
            settings: {
                foreground: variables
            }
        },
        {
            name: "Entity Name tag reference in stylesheets",
            scope: "meta.property-list entity.name.tag.reference",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Constant Other Color RGB Value Punctuation Definition Constant",
            scope: "constant.other.color.rgb-value punctuation.definition.constant",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Constant Other Color",
            scope: "constant.other.color",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Keyword Other Unit",
            scope: "keyword.other.unit",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Meta Selector",
            scope: "meta.selector",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Entity Other Attribute Name Id",
            scope: "entity.other.attribute-name.id",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Meta Property Name",
            scope: "meta.property-name",
            settings: {
                foreground: variables
            }
        },
        {
            name: "Doctypes",
            scope: ["entity.name.tag.doctype", "meta.tag.sgml.doctype"],
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Punctuation Definition Parameters",
            scope: "punctuation.definition.parameters",
            settings: {
                foreground: foreground
            }
        },
        {
            name: "Keyword Control Operator",
            scope: "keyword.control.operator",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Keyword Operator Logical",
            scope: "keyword.operator.logical",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Variable Instances",
            scope: [
                "variable.instance",
                "variable.other.instance",
                "variable.reaedwrite.instance",
                "variable.other.readwrite.instance"
            ],
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Variable Property Other",
            scope: [
                "variable.other.property",
                "variable.other.object.property"
            ],
            settings: {
                foreground: variables
            }
        },
        {
            name: "Entity Name Function",
            scope: "entity.name.function",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Keyword Operator Comparison",
            scope: "keyword.operator.comparison",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Support Constant, `new` keyword, Special Method Keyword",
            scope: [
                "support.constant",
                "keyword.other.special-method",
                "keyword.other.new"
            ],
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Support Function",
            scope: "support.function",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Invalid Broken",
            scope: "invalid.broken",
            settings: {
                background: red,
                foreground: background
            }
        },
        {
            name: "Invalid Unimplemented",
            scope: "invalid.unimplemented",
            settings: {
                background: orange,
                foreground: foreground
            }
        },
        {
            name: "Invalid Illegal",
            scope: "invalid.illegal",
            settings: {
                foreground: foreground,
                background: red
            }
        },
        {
            name: "Language Variable",
            scope: "variable.language",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Support Variable Property",
            scope: "support.variable.property",
            settings: {
                foreground: variables
            }
        },
        {
            name: "Variable Function",
            scope: "variable.function",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Variable Interpolation",
            scope: "variable.interpolation",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Meta Function Call",
            scope: "meta.function-call",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Punctuation Section Embedded",
            scope: "punctuation.section.embedded",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Template Strings",
            scope: "string.template meta.template.expression",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Italics",
            scope: "italic",
            settings: {
                foreground: keywordsAndTokens,
                fontStyle: "italic"
            }
        },
        {
            name: "Bold",
            scope: "bold",
            settings: {
                foreground: functions,
                fontStyle: "bold"
            }
        },
        {
            name: "Quote",
            scope: "quote",
            settings: {
                foreground: primitives,
                fontStyle: "italic"
            }
        },
        {
            name: "Raw Code",
            scope: "raw",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "C# Readwrite Variables",
            scope: "variable.other.readwrite.cs",
            settings: {
                foreground: foreground
            }
        },
        {
            name: "C# Classes & Storage types",
            scope: ["entity.name.type.class.cs", "storage.type.cs"],
            settings: {
                foreground: functions
            }
        },
        {
            name: "C# Namespaces",
            scope: "entity.name.type.namespace.cs",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Tag names in Stylesheets",
            scope: [
                "entity.name.tag.css",
                "entity.name.tag.less",
                "entity.name.tag.custom.css"
            ],
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Wildcard(*) selector in Stylesheets",
            scope: [
                "entity.name.tag.wildcard.css",
                "entity.name.tag.wildcard.less",
                "entity.name.tag.wildcard.scss",
                "entity.name.tag.wildcard.sass"
            ],
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "CSS Keyword Other Unit",
            scope: "keyword.other.unit.css",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Attribute Name for CSS",
            scope: "meta.attribute-selector.css entity.other.attribute-name.attribute",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Elixir Classes",
            scope: [
                "source.elixir support.type.elixir",
                "source.elixir meta.module.elixir entity.name.class.elixir"
            ],
            settings: {
                foreground: functions
            }
        },
        {
            name: "Elixir Functions",
            scope: "source.elixir entity.name.function",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Elixir Constants",
            scope: [
                "source.elixir constant.other.symbol.elixir",
                "source.elixir constant.other.keywords.elixir"
            ],
            settings: {
                foreground: functions
            }
        },
        {
            name: "Elixir String Punctuations",
            scope: "source.elixir punctuation.definition.string",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Elixir",
            scope: [
                "source.elixir variable.other.readwrite.module.elixir",
                "source.elixir variable.other.readwrite.module.elixir punctuation.definition.variable.elixir"
            ],
            settings: {
                foreground: functions
            }
        },
        {
            name: "Elixir Binary Punctuations",
            scope: "source.elixir .punctuation.binary.elixir",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Go Function Calls",
            scope: "source.go meta.function-call.go",
            settings: {
                foreground: functions
            }
        },
        {
            name: "ID Attribute Name in HTML",
            scope: "entity.other.attribute-name.id.html",
            settings: {
                foreground: functions
            }
        },
        {
            name: "HTML Punctuation Definition Tag",
            scope: "punctuation.definition.tag.html",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "HTML Doctype",
            scope: "meta.tag.sgml.doctype.html",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "JavaScript Classes",
            scope: "meta.class entity.name.type.class.js",
            settings: {
                foreground: functions
            }
        },
        {
            name: "JavaScript Method Declaration e.g. `constructor`",
            scope: "meta.method.declaration storage.type.js",
            settings: {
                foreground: functions,
                fontStyle: "normal"
            }
        },
        {
            name: "JavaScript Terminator",
            scope: "terminator.js",
            settings: {
                foreground: foreground
            }
        },
        {
            name: "JavaScript Meta Punctuation Definition",
            scope: "meta.js punctuation.definition.js",
            settings: {
                foreground: foreground
            }
        },
        {
            name: "Entity Names in Code Documentations",
            scope: [
                "entity.name.type.instance.jsdoc",
                "entity.name.type.instance.phpdoc"
            ],
            settings: {
                foreground: foreground
            }
        },
        {
            name: "Other Variables in Code Documentations",
            scope: ["variable.other.jsdoc", "variable.other.phpdoc"],
            settings: {
                foreground: variables
            }
        },
        {
            name: "JavaScript module import",
            scope: [
                "variable.other.meta.import.js",
                "meta.import.js variable.other"
            ],
            settings: {
                foreground: foreground
            }
        },
        {
            name: "JavaScript Variable Parameter Function",
            scope: "variable.parameter.function.js",
            settings: {
                foreground: variables
            }
        },
        {
            name: "JavaScript Variable Other ReadWrite",
            scope: "variable.other.readwrite.js",
            settings: {
                foreground: foreground
            }
        },
        {
            name: "JavaScript[React] Variable Other Object",
            scope: [
                "variable.other.object.js",
                "variable.other.object.jsx",
                "variable.object.property.js",
                "variable.object.property.jsx"
            ],
            settings: {
                foreground: foreground
            }
        },
        {
            name: "JavaScript Variables",
            scope: ["variable.js", "variable.other.js"],
            settings: {
                foreground: foreground
            }
        },
        {
            name: "JavaScript Entity Name Type",
            scope: ["entity.name.type.js", "entity.name.type.module.js"],
            settings: {
                foreground: functions
            }
        },
        {
            name: "JavaScript Support Classes",
            scope: "support.class.js",
            settings: {
                foreground: foreground
            }
        },
        {
            name: "JSON Property Names and JS/TS object literal keys",
            scope: [
                "support.type.property-name.json",
                "meta.object-literal.key"
            ],
            settings: {
                foreground: variables
            }
        },
        {
            name: "JSON Support Constants",
            scope: "support.constant.json",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "JSON Property values (string)",
            scope: "meta.structure.dictionary.value.json string.quoted.double",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Strings in JSON values",
            scope: "string.quoted.double.json punctuation.definition.string.json",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Specific JSON Property values like null",
            scope: "meta.structure.dictionary.json meta.structure.dictionary.value constant.language",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Ruby Variables",
            scope: "variable.other.ruby",
            settings: {
                foreground: foreground
            }
        },
        {
            name: "Ruby Hashkeys",
            scope: "constant.language.symbol.hashkey.ruby",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "LESS Tag names",
            scope: "entity.name.tag.less",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "LESS Keyword Other Unit",
            scope: "keyword.other.unit.css",
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Attribute Name for LESS",
            scope: "meta.attribute-selector.less entity.other.attribute-name.attribute",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Markdown Headings",
            scope: "markup.heading.markdown",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Markdown Italics",
            scope: "markup.italic.markdown",
            settings: {
                foreground: keywordsAndTokens,
                fontStyle: "italic"
            }
        },
        {
            name: "Markdown Bold",
            scope: "markup.bold.markdown",
            settings: {
                foreground: functions,
                fontStyle: "bold"
            }
        },
        {
            name: "Markdown Quote + others",
            scope: "markup.quote.markdown",
            settings: {
                foreground: primitives,
                fontStyle: "italic"
            }
        },
        {
            name: "Markdown Raw Code + others",
            scope: "markup.inline.raw.markdown",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Markdown Links",
            scope: [
                "markup.underline.link.markdown",
                "markup.underline.link.image.markdown"
            ],
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Markdown Link Title and Description",
            scope: [
                "string.other.link.title.markdown",
                "string.other.link.description.markdown"
            ],
            settings: {
                foreground: foreground
            }
        },
        {
            name: "Markdown Punctuation",
            scope: [
                "punctuation.definition.string.markdown",
                "punctuation.definition.string.begin.markdown",
                "punctuation.definition.string.end.markdown",
                "meta.link.inline.markdown punctuation.definition.string"
            ],
            settings: {
                foreground: functions
            }
        },
        {
            name: "Markdown MetaData Punctuation",
            scope: ["punctuation.definition.metadata.markdown"],
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "Markdown List Punctuation",
            scope: ["beginning.punctuation.definition.list.markdown"],
            settings: {
                foreground: functions
            }
        },
        {
            name: "Support Classes in PHP",
            scope: "support.class.php",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Punctuations in PHP function calls",
            scope: "meta.function-call.php punctuation",
            settings: {
                foreground: foreground
            }
        },
        {
            name: "PHP Global Variables",
            scope: "variable.other.global.php",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Declaration Punctuation in PHP Global Variables",
            scope: "variable.other.global.php punctuation.definition.variable",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Language Constants in Python",
            scope: "constant.language.python",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Python Function Parameter and Arguments",
            scope: [
                "variable.parameter.function.python",
                "meta.function-call.arguments.python"
            ],
            settings: {
                foreground: variables
            }
        },
        {
            name: "Punctuations in Python",
            scope: "punctuation.python",
            settings: {
                foreground: foreground
            }
        },
        {
            name: "Decorator Functions in Python",
            scope: "entity.name.function.decorator.python",
            settings: {
                foreground: functions
            }
        },
        {
            name: "Variables in SASS At-Rules",
            scope: [
                "source.css.scss meta.at-rule variable",
                "source.css.sass meta.at-rule variable"
            ],
            settings: {
                foreground: functions
            }
        },
        {
            name: "Attribute Name for SASS",
            scope: [
                "meta.attribute-selector.scss entity.other.attribute-name.attribute",
                "meta.attribute-selector.sass entity.other.attribute-name.attribute"
            ],
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Tag names in SASS",
            scope: ["entity.name.tag.scss", "entity.name.tag.sass"],
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "SASS Keyword Other Unit",
            scope: ["keyword.other.unit.scss", "keyword.other.unit.sass"],
            settings: {
                foreground: keywordsAndTokens
            }
        },
        {
            name: "TypeScript[React] Variables and Object Properties",
            scope: [
                "variable.other.readwrite.alias.ts",
                "variable.other.readwrite.alias.tsx",
                "variable.other.readwrite.ts",
                "variable.other.readwrite.tsx",
                "variable.other.object.ts",
                "variable.other.object.tsx",
                "variable.object.property.ts",
                "variable.object.property.tsx",
                "variable.other.ts",
                "variable.other.tsx",
                "variable.tsx",
                "variable.ts"
            ],
            settings: {
                foreground: foreground
            }
        },
        {
            name: "TypeScript[React] Entity Name Types",
            scope: ["entity.name.type.ts", "entity.name.type.tsx"],
            settings: {
                foreground: types
            }
        },
        {
            name: "TypeScript[React] Node Classes",
            scope: ["support.class.node.ts", "support.class.node.tsx"],
            settings: {
                foreground: types
            }
        },
        {
            name: "TypeScript[React] Entity Name Types as Parameters",
            scope: [
                "meta.type.parameters.ts entity.name.type",
                "meta.type.parameters.tsx entity.name.type"
            ],
            settings: {
                foreground: foreground
            }
        },
        {
            name: "TypeScript[React] Import Punctuations",
            scope: [
                "meta.import.ts punctuation.definition.block",
                "meta.import.tsx punctuation.definition.block"
            ],
            settings: {
                foreground: foreground
            }
        },
        {
            name: "TypeScript[React] Punctuation Decorators",
            scope: [
                "meta.decorator punctuation.decorator.ts",
                "meta.decorator punctuation.decorator.tsx"
            ],
            settings: {
                foreground: types
            }
        },
        {
            name: "TypeScript[React] Punctuation Decorators",
            scope: [
                "meta.jsx.children.tsx",
                "meta.tag.js meta.jsx.children.tsx"
            ],
            settings: {
                foreground: foreground
            }
        },
        {
            name: "YAML Entity Name Tags",
            scope: "entity.name.tag.yaml",
            settings: {
                foreground: primitives
            }
        },
        {
            name: "Normalize font style of certain Components",
            scope: ["keyword", "punctuation"],
            settings: {
                fontStyle: "normal"
            }
        },
        {
            name: "Italicsify certain tokens",
            scope: [
                // "meta.import.ts meta.block.ts variable.other.readwrite.alias.ts",
                // "meta.import.tsx meta.block.tsx variable.other.readwrite.alias.tsx",
                // "meta.import.js variable.other",
                // "entity.name.function.ts",
                // "entity.name.function.tsx",
                // "support.type.primitive",
                // "entity.name.tag.yaml",
                // "meta.tag.sgml.doctype.html",
                // "entity.name.tag.doctype",
                // "meta.tag.sgml.doctype",
                // "entity.other.attribute-name",
                // "entity.name.tag.custom",
                // "source.js.jsx keyword.control.flow.js",
                // "support.type.property.css",
                // "support.function.basic_functions",
                // "variable.assignment.coffee",
                // "support.function.basic_functions",
                // "keyword.operator.expression.typeof",
                // "keyword.operator.type.annotation",
                // "assignment.coffee",
                // "entity.name.type.ts",
                // "support.constant.math",
                // "meta.object-literal.key",
                // "meta.var.expr storage.type",
                // "parameter",
                // "string",
                // "italic",
                // "quote",
                // "keyword",
                // "storage",
                // "language",
                // "storage.type.class",
                // "type.var",
                // "meta.parameter",
                // "variable.parameter",
                // "meta.parameters",
                // "keyword.control",
                // "modifier",
                // "this",
                // "comment",
                "entity.name.function.ts",
                "entity.name.function.tsx"
            ],
            settings: {
                fontStyle: useItalics ? "italic" : "normal"
            }
        }
    ]
}
