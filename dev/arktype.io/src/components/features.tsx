import {
    Box,
    Container,
    Paper,
    Stack,
    SvgIcon,
    Typography
} from "@mui/material"
import React from "react"

const details = [
    {
        title: "Isomorphic",
        description:
            "Define types using TS syntax. Infer them 1:1. Use them to validate your data at runtime."
    },
    {
        title: "Native TS",
        description: "No extensions, plugins or compilers required"
    },
    {
        title: "Concise",
        description: "Say more with less"
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
    //TODOSHAWN images removed for now but kept this as placeholder
    image?: JSX.Element
    title: string
    description: string
}

const Feature = ({ image, title, description }: FeatureProps) => (
    <Box
        id="feature"
        flex="1 0 45%"
        sx={{
            minWidth: "400px",
            minHeight: "300px",
            position: "relative",
            textAlign: "center"
        }}
    >
        <SvgIcon
            sx={{
                height: 100
            }}
        ></SvgIcon>
        <Box
            sx={{
                width: "100%"
            }}
        >
            <Typography component="h3" variant="h5" id="title" fontWeight={600}>
                {title}
            </Typography>
            <Typography
                component="h3"
                variant="h6"
                sx={{
                    lineHeight: "1.2em",
                    paddingBottom: "10px",
                    position: "relative"
                }}
            >
                {description}
            </Typography>
        </Box>
    </Box>
)

const feats = details.map((feature, i) => (
    <Feature title={feature.title} description={feature.description} key={i} />
))

export const Features = () => {
    return (
        <Container
            sx={{
                height: "fit-content",
                flexWrap: "wrap",
                display: "flex",
                minWidth: "100%",
                padding: "0 !important",
                justifyContent: "center"
            }}
        >
            <Stack
                elevation={4}
                sx={{
                    marginTop: "1em"
                }}
            >
                <Typography
                    component="h3"
                    variant="h2"
                    id="title"
                    align="center"
                    fontWeight={600}
                >
                    Features
                </Typography>
                <Stack
                    justifyContent="space-evenly"
                    direction="row"
                    flexWrap="wrap"
                    id="featuresComponent"
                    sx={{
                        width: "100%",
                        display: "relative"
                    }}
                >
                    {feats}
                </Stack>
            </Stack>
        </Container>
    )
}
