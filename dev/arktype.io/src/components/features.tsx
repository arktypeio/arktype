import { Masonry } from "@mui/lab"
import { Stack, Typography, useTheme } from "@mui/material"
import Code from "@theme/CodeBlock"
import React from "react"
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
                // @blockFrom:dev/examples/concision.ts:arkUser |> replace(`,\`) |> replace(${,\${) |> embed(`,`)
                `const arkUser = type({
    name: /^ark.*$/ as cast<\`ark\${string}\`>,
    birthday: ["string", "|>", (s) => new Date(s)],
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
        title: "Native JS/TS",
        description:
            "Zero dependencies and no extensions, plugins or compilers required"
    },
    {
        // add image of intersections with divisors/range etc.
        title: "Powerful",
        description:
            "As a full type system, ArkType understands your data in a way shallow validators never could"
    },
    {
        title: "Fast",
        description:
            "Types are optimized for traversal and can validate your data 2-10x faster than existing validators (details to come)"
    },
    {
        title: "Portable",
        description:
            "Most ArkType definitions are just strings and objects. Serialize them and take them anywhere your data can go!"
    }
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
            <div>{props.image ?? null}</div>
        </Stack>
    )
}
