import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
	if (request.nextUrl.pathname === "/") {
		return NextResponse.next()
	}
	return NextResponse.redirect(
		new URL("/docs" + request.nextUrl.pathname, request.url)
	)
}

// See "Matching Paths" below to learn more
export const config = {
	matcher:
		"/((?!api|_next/static|_next/image|image|favicon.ico|sitemap.xml|robots.txt|docs).*)"
}
