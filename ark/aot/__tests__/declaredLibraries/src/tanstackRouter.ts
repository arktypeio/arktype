import { createRootRoute, createRoute } from "@tanstack/react-router"
import { type } from "arktype"
import { Account } from "./schemas.ts"

export const Search = type({ page: "number = 1", "filter?": "string" })

const rootRoute = createRootRoute()

export const accountsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/accounts",
	validateSearch: Search
})

export const accountRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/account",
	validateSearch: Account
})
