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
        description: (
            <>
                Stop in any time and{" "}
                <a href="https://github.com/re-do/redo">
                    star our GitHub repo{" "}
                </a>
                😉
            </>
        )
    },
    {
        title: <>O(damn) fast</>,
        imageUrl: "fast.svg",
        description: (
            <>Automate your first test in minutes. Run it in seconds.</>
        )
    },
    {
        title: <>Deterministic & transparent</>,
        imageUrl: "deterministic.svg",
        description: <>No more flaky Selenium scripts. No more AI wizardry.</>
    },
    {
        title: <>JS/TS integrations that "just work"</>,
        imageUrl: "integrations.svg",
        description: (
            <>Integrates seamlessly with the tools you're already using.</>
        )
    },
    {
        title: <>Incrementally adoptable</>,
        imageUrl: "incremental.svg",
        description: (
            <>
                Keep what you have. Start by adding a single test. Or fifty.
                It's up to you.
            </>
        )
    },
    {
        title: <>By and for developers</>,
        imageUrl: "developers.svg",
        description: <></>
    }
]
