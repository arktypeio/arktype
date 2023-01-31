import { Card, Paper, Stack, Typography } from "@mui/material"

import CardContent from "@mui/material/CardContent"
import CardMedia from "@mui/material/CardMedia"
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

const Feature = (props: {
    title: string
    description: string
    index: number
}) => (
    <Card
        sx={{
            width: "80%",
            backgroundColor: "#fff"
        }}
    >
        <CardContent>
            <Typography variant="h4">{props.title}</Typography>
            <Typography variant="body1" fontSize="1.3em">
                {props.description}
            </Typography>
        </CardContent>
        <CardMedia
            component="img"
            image="https://via.placeholder.com/800x200?text=Arktype.io+is+super+POOGERS"
            alt="Arktype Gif"
        />
    </Card>
)

const feats = details.map((feature, i) => (
    <Feature
        title={feature.title}
        description={feature.description}
        index={i}
        key={`${feature.title}-${i}`}
    />
))

export const Features = () => (
    <Paper
        elevation={5}
        sx={{ marginTop: "1em", backgroundColor: "primary.main" }}
    >
        <Typography component="h2" variant="h2" align="center">
            <b>Features</b>
        </Typography>
        <Stack sx={{ display: "flex" }}>{feats}</Stack>
    </Paper>
)
