import React from "react"
import Layout from "@theme/Layout"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import { DefaultTheme } from "@re-do/components"

export type PageProps = {
    children: React.ReactNode
}

export const Page = ({ children }: PageProps) => {
    const context = useDocusaurusContext()
    const { siteConfig = {} } = context
    return (
        <DefaultTheme>
            <Layout
                title={`Hello from ${siteConfig.title}`}
                description="Description will go into a meta tag in <head />"
            >
                <main
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center"
                    }}
                >
                    {children}
                </main>
            </Layout>
        </DefaultTheme>
    )
}
