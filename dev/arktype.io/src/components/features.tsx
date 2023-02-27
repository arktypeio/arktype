import { Grid, Stack, Typography, useTheme } from "@mui/material"
import Code from "@theme/CodeBlock"
import React from "react"

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
        <Code language="typescript">{`// Hover to infer... ⛵
const playerTwo = type({
    name: "string",
    birthday: ["string", "|>", (s) => new Date(s)],
    "powerLevel?": "1<=number<9000"
})`}</Code>
        <img height="60%" src="/img/conciseInfer.png" />
    </div>
)

const ZodConcision = (
    <div className="inferable-code">
        <Code language="typescript">{`// Hover to infer... 🦸
const playerOne = z.object({
    name: z.string(),
    birthday: z.preprocess(
        (arg) => (typeof arg === "string" ? new Date(arg) : undefined),
        z.date()
    ),
    powerLevel: z.number().gte(1).lt(9000).optional()
})`}</Code>
        <img height="80%" src="/img/zodInfer.png" />
    </div>
)

const ConciseImage = (
    <>
        {ZodConcision}
        {ArkTypeConcision}
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
            "As a full type system, ArkType understands your data in ways other validators never could"
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
        <Grid container spacing={3}>
            {details.map((props, i) => (
                <Grid item key={i} xs={12} md={6}>
                    <Feature {...props} />
                </Grid>
            ))}
        </Grid>
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
            <Typography component="p" variant="body1" fontWeight="300">
                {props.description}
            </Typography>
            <div>{props.image ?? null}</div>
        </Stack>
    )
}
