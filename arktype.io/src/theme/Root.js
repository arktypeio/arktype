import React from "react"
import Head from "@docusaurus/Head"
import { useLocation } from "@docusaurus/router"

const hideModelVersionDropdownCss = `
.navbar-type-versions {
    display: none;
}
`

export default ({ children }) => {
    const { pathname } = useLocation()
    return (
        <>
            {pathname.startsWith("/type") ? null : (
                <Head>
                    <style>{hideModelVersionDropdownCss}</style>
                </Head>
            )}
            {children}
        </>
    )
}
