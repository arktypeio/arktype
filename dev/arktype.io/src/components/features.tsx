import { Masonry } from "@mui/lab"
import { Stack, Typography, useTheme } from "@mui/material"
import Code from "@theme/CodeBlock"
import React from "react"
import { AutoplayDemo } from "./autoplayDemo"
import { useIsMobile } from "./useWindowSize"

const IsomorphicCodeBlock = (
    <div className="inferable-code">
        <Code language="typescript">{`const user = type({
    name: "string",
    device: {
        platform: "'android'|'ios'",
        "version?": "number"
    }
})


// Hover to infer...
type User = typeof user.infer
`}</Code>
        <img height="50%" src="/img/isomorphicHover.png" />
    </div>
)

const ArkTypeConcision = (
    <div className="inferable-code">
        <Code language="typescript">
            {"// Hover to infer...\n"}
            {
                // @blockFrom:dev/examples/concision.ts:arkUserHelper |> replace(`,\`) |> replace(${,\${) |> embed(`,`)
                `const arkUser = type({
    name: /^ark.*$/ as Infer<\`ark\${string}\`>,
    birthday: type("string").morph((s) => new Date(s)),
    "powerLevel?": "1<=number<9000"
})`
                // @blockEnd
            }
        </Code>
        <img height="60%" src="/img/arkUser.png" />
    </div>
)

const ZodConcision = (
    <div className="inferable-code">
        <Code language="typescript">
            {"// Hover to infer...\n"}
            {
                // @blockFrom:dev/examples/concision.ts:zodUser |> replace(`,\`) |> replace(${,\${) |> embed(`,`)
                `const zodUser = z.object({
    name: z.custom<\`zod\${string}\`>(
        (val) => typeof val === "string" && /^zod.*$/.test(val)
    ),
    birthday: z.preprocess(
        (arg) => (typeof arg === "string" ? new Date(arg) : undefined),
        z.date()
    ),
    powerLevel: z.number().gte(1).lt(9000).optional()
})`
                // @blockEnd
            }
        </Code>
        <img height="80%" src="/img/zodInfer.png" />
    </div>
)

const ConciseImage = (
    <>
        {ArkTypeConcision}
        {ZodConcision}
    </>
)

const OptimizedUnion = (
    <div className="inferable-code">
        <Code language="typescript">
            {"// Hover to see internal representation...\n"}
            {
                // @blockFrom:dev/examples/optimized.ts:union |> embed(`,`)
                `export const deepLeftOrRight = type({
    auto: {
        discriminated: "'left'"
    }
}).or({
    auto: {
        discriminated: "'right'"
    }
})`
                // @blockEnd
            }
        </Code>
        <img src="/img/optimizedUnion.png" />
    </div>
)

const OptimizedNumber = (
    <div className="inferable-code">
        <Code language="typescript">
            {"// Hover to see internal representation...\n"}
            {
                // @blockFrom:dev/examples/optimized.ts:number |> embed(`,`)
                `export const numericIntersection = type(
    "(1 <= number%2 < 100) & (0 < number%3 <= 99)"
)`
                // @blockEnd
            }
            {`
       




`}
        </Code>
        <img src="/img/optimizedNumber.png" />
    </div>
)

const OptimizedImage = (
    <>
        {OptimizedUnion}
        {OptimizedNumber}
    </>
)

const TypeSafeImage = (
    <Stack width="100%">
        <AutoplayDemo src="/img/typePerf.mp4" />
        <caption style={{ fontSize: ".8rem" }}>
            Worried about performance? Don't be. This is how it feels to
            interact with a scope of 100 cyclic types (you may want to go
            fullscreen to see the details!)
        </caption>
    </Stack>
)

const details = [
    {
        title: "Isomorphic",
        description:
            "Define types using TS syntax. Infer them 1:1. Use them to validate your data at runtime.",
        image: IsomorphicCodeBlock
    },
    {
        title: "Concise",
        description: "Say more with less",
        image: ConciseImage
    },
    {
        title: "Optimized",
        description:
            "ArkType is not just a validator— it's a full type system. Operations are deeply computed and optimized by default",
        image: OptimizedImage
    },
    {
        title: "Type-safe",
        description:
            "String definitions are statically parsed with each character you type and give detailed feedback just like in your editor.",
        image: TypeSafeImage
    }
    // {
    //     title: "Portable",
    //     description:
    //         "Most ArkType definitions are just strings and objects. Serialize them and take them anywhere your data can go!"
    // }
]

type FeatureProps = {
    image?: JSX.Element
    title: string
    description: string
}

export const Features = () => {
    return (
        <Masonry
            sx={{ alignContent: "center" }}
            columns={useIsMobile() ? 1 : 2}
            spacing={3}
        >
            {details.map((props, i) => (
                <Feature key={i} {...props} />
            ))}
        </Masonry>
    )
}

const Feature = (props: FeatureProps) => {
    const theme = useTheme()
    return (
        <Stack spacing={2} maxWidth="40em">
            <Typography
                component="h3"
                variant="h5"
                fontWeight="700"
                width="100%"
                textAlign="center"
                color={theme.palette.info.main}
            >
                {props.title}
            </Typography>
            <Typography
                component="p"
                variant="body1"
                fontWeight="300"
                minHeight="3rem"
            >
                {props.description}
            </Typography>
            <div style={{ padding: "6px", borderRadius: "16px" }}>
                {props.image ?? null}
            </div>
        </Stack>
    )
}
