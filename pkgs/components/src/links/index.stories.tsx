import React from "react"
import { storiesOf } from "@storybook/react"
import { BrowserRouter as Router } from "react-router-dom"
import { Link } from "."

export default {
    title: "Link"
}

export const StandardLink = () => (
    <Router>
        <Link to="/somewhere">Go somewhere</Link>
    </Router>
)
