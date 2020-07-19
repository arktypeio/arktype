import React from "react"
import Link from "@docusaurus/Link"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import useBaseUrl from "@docusaurus/useBaseUrl"
import { Column, Button } from "@re-do/components"

export const Header = () => {
    const context = useDocusaurusContext()
    const { siteConfig = {} } = context
    return (
        <Column
            align="center"
            style={{
                padding: "64px 0px",
                background: "#2979ff",
                color: "white"
            }}
        >
            <h1 className="hero__title">{siteConfig.title}</h1>
            <p className="hero__subtitle">{siteConfig.tagline}</p>
            <Link to={useBaseUrl("docs/")}>
                <Button
                    kind="secondary"
                    style={{
                        color: "white",
                        borderColor: "white"
                    }}
                >
                    Get Started
                </Button>
            </Link>
        </Column>
    )
}
