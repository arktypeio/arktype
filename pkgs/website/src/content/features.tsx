import React from "react"

export type FeatureData = {
    image: string
    title: JSX.Element
    description: JSX.Element
}

export const features = [
    {
        title: <>O(damn) fast</>,
        image: "fast.svg",
        description: (
            <>Automate your first test in minutes. Run it in seconds.</>
        )
    },
    {
        title: <>Deterministic & transparent</>,
        image: "deterministic.svg",
        description: (
            <>
                No more flaky Selenium scripts or AI-powered wizardry— just
                simple tests with reliable results.
            </>
        )
    },
    {
        title: <>JS/TS integrations "just work"</>,
        image: "integrations.svg",
        description: (
            <>Integrates seamlessly with the tools you're already using.</>
        )
    },
    {
        title: <>Incrementally adoptable</>,
        image: "incremental.svg",
        description: (
            <>
                Keep what you have. Start by adding a single test. Or fifty.
                It's up to you.
            </>
        )
    },
    {
        title: <>By and for developers</>,
        image: "developers.svg",
        description: (
            <>We built Redo for us. Now we want to know what you think.</>
        )
    },
    {
        title: <>100% open source</>,
        image: "openSource.svg",
        description: (
            <>
                Stop in any time and{" "}
                <a href="https://github.com/re-do/redo" target="_blank">
                    star our GitHub repo{" "}
                </a>
                😉
            </>
        )
    }
]
