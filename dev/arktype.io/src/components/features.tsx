import { Box, Stack, SvgIcon, Typography } from "@mui/material"
import React from "react"

const details = [
    {
        image: "Two",
        title: "Isomorphic",
        description:
            "Define types using TS syntax. Infer them 1:1. Use them to validate your data at runtime."
    },
    {
        image: "Three",
        title: "Concise",
        description: "Say more with less"
    },
    {
        image: "Four",
        title: "Fast",
        description: "..."
    },
    {
        image: "One",
        title: "Portable",
        description:
            "Most ArkType definitions are just strings and objects. Serialize them and take them anywhere your data can go!"
    }
]

type FeatureProps = {
    //TODOSHAWN images removed for now but kept this as placeholder
    image?: JSX.Element
    title: string
    description: string
}

const Feature = ({ image, title, description }: FeatureProps) => (
    <Box id="feature" flex="1 0 45%">
        <SvgIcon
            sx={{
                height: 100,
                width: "100%"
            }}
        >
            {image}
        </SvgIcon>
        <Box sx={{ padding: "0 5px" }}>
            <Typography component="h3" variant="h5" id="title">
                {title}
            </Typography>
            <Typography component="h3" variant="h6" id="description">
                {description}
            </Typography>
        </Box>
    </Box>
)

const feats = details.map((feature, i) => (
    <Feature
        // image={features[feature.image as keyof typeof features]}
        title={feature.title}
        description={feature.description}
        key={i}
    />
))

export const Features = () => {
    return (
        <Stack
            justifyContent="space-evenly"
            direction="row"
            flexWrap="wrap"
            id="featuresComponent"
        >
            {feats}
        </Stack>
    )
}
