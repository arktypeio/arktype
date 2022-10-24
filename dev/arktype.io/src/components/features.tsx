/* eslint-disable max-lines-per-function */
import { Box, Stack, SvgIcon, Typography } from "@mui/material"
import One from "@site/static/img/features/1.svg"
import Two from "@site/static/img/features/2.svg"
import Three from "@site/static/img/features/3.svg"
import Four from "@site/static/img/features/4.svg"
import React from "react"

const details = [
    {
        image: "Two",
        title: "Error customization",
        description:
            "We provide top-tier error messages but give you the freedom to customize them for your users!"
    },
    {
        image: "Three",
        title: "Infers TypeScript types from its own syntax",
        description: ""
    },
    {
        image: "Four",
        title: "Recursive and cyclic types",
        description: "Spaces, with recursive types!?!"
    },
    {
        image: "One",
        title: "One definition from editor to runtime",
        description:
            "Use those amazing types you built in typescript at runtime!"
    }
]

const features = {
    One: <One />,
    Two: <Two />,
    Three: <Three />,
    Four: <Four />
}

type FeatureProps = {
    image: JSX.Element
    title: string
    description: string
}

const Feature = ({ image, title, description }: FeatureProps) => (
    <Box id="feature" flex="1 0 45%">
        <SvgIcon
            sx={{
                height: 150,
                width: "100%"
            }}
        >
            {image}
        </SvgIcon>
        <Typography component="h3" variant="h5" id="title">
            {title}
        </Typography>
        <Typography component="h3" variant="h6" id="description">
            {description}
        </Typography>
    </Box>
)

const feats = details.map((feature, i) => (
    <Feature
        image={features[feature.image as keyof typeof features]}
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
