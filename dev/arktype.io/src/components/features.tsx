import { Grid, Typography, useTheme } from "@mui/material"
import React from "react"

const details = [
    {
        title: "Isomorphic",
        description:
            "Define types using TS syntax. Infer them 1:1. Use them to validate your data at runtime."
    },
    {
        title: "Native JS/TS",
        description: "No extensions, plugins or compilers required"
    },
    {
        title: "Concise",
        description: "Say more with less"
    },
    {
        // add image of intersections with divisors/range etc.
        title: "Powerful",
        description:
            "As a full type system, ArkType understands your data in ways other validators never could"
    },
    {
        title: "Fast",
        description: "..."
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
        <Grid container direction="row">
            {details.map((feature, i) => (
                <Grid item key={i} xs={12} md={6}>
                    <Feature
                        title={feature.title}
                        description={feature.description}
                    />
                </Grid>
            ))}
        </Grid>
    )
}

const Feature = (props: FeatureProps) => {
    const theme = useTheme()
    return (
        <div
            style={{
                textAlign: "center",
                margin: "auto",
                paddingTop: "1em"
            }}
        >
            <Typography
                component="h3"
                variant="h5"
                fontWeight="700"
                width="100%"
                color={theme.palette.info.main}
            >
                {props.title}
            </Typography>
            <Typography component="p" variant="body1" fontWeight="300">
                {props.description}
            </Typography>
        </div>
    )
}
