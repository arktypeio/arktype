import React from "react"
import { Helmet } from "react-helmet-async"
import { useLocation } from "@docusaurus/router"

const hideModelVersionDropdownCss = `
.navbar-type-versions {
    display: none;
}
`

// Default implementation, that you can customize
export default ({ children }) => {
    const { pathname } = useLocation()
    return (
        <>
            <Helmet>
                {pathname.startsWith("/type") ? null : (
                    <style>{hideModelVersionDropdownCss}</style>
                )}
            </Helmet>
            {children}
        </>
    )
}
