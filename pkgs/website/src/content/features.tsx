import React from "react"
import fastSvg from "assets/fast.svg"
import deterministicSvg from "assets/deterministic.svg"
import integrationsSvg from "assets/integrations.svg"
import incrementalSvg from "assets/incremental.svg"
import developersSvg from "assets/developers.svg"
import openSourceSvg from "assets/openSource.svg"

export type FeatureData = {
    image: string
    title: JSX.Element
    description: JSX.Element
}

export const features = [
    {
        title: <>O(damn) fast</>,
        image: fastSvg,
        description: (
            <>Automate your first test in minutes. Run it in seconds.</>
        )
    },
    {
        title: <>Deterministic & transparent</>,
        image: deterministicSvg,
        description: (
            <>
                No more flaky Selenium scripts or AI-powered wizardry— just
                simple tests with reliable results.
            </>
        )
    },
    {
        title: <>JS/TS integrations "just work"</>,
        image: integrationsSvg,
        description: (
            <>Integrates seamlessly with the tools you're already using.</>
        )
    },
    {
        title: <>Incrementally adoptable</>,
        image: incrementalSvg,
        description: (
            <>
                Keep what you have. Start by adding a single test. Or fifty.
                It's up to you.
            </>
        )
    },
    {
        title: <>By and for developers</>,
        image: developersSvg,
        description: (
            <>We built Redo for us. Now we want to know what you think.</>
        )
    },
    {
        title: <>100% open source</>,
        image: openSourceSvg,
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
