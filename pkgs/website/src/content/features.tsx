import React from "react"

export type FeatureData = {
    imageUrl: string
    title: JSX.Element
    description: JSX.Element
}

export const features = [
    {
        title: <>100% open source</>,
        imageUrl: "openSource.svg",
        description: <></>
    },
    {
        title: <>O(damn) fast</>,
        imageUrl: "fast.svg",
        description: <></>
    },
    {
        title: <>Deterministic & transparent</>,
        imageUrl: "deterministic.svg",
        description: <></>
    },
    {
        title: <>JS/TS integrations that "just work"</>,
        imageUrl: "integrations.svg",
        description: <></>
    },
    {
        title: <>Incrementally adoptable</>,
        imageUrl: "incremental.svg",
        description: <></>
    },
    {
        title: <>By and for developers</>,
        imageUrl: "developers.svg",
        description: <></>
    }
]
