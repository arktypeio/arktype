import { ClientRedirect } from "./ClientRedirect.tsx"

/**
 * A static stand-in for a moved page. The meta refresh covers visitors
 * without JS; the script keeps the url's query and hash, which a meta
 * refresh drops; ClientRedirect covers client-side navigation, which runs
 * neither.
 */
export const Redirect = ({ to }: { to: string }) => (
	<>
		<meta httpEquiv="refresh" content={`0; url=${to}`} />
		<meta name="robots" content="noindex" />
		<link rel="canonical" href={`https://arktype.io${to}`} />
		<script
			dangerouslySetInnerHTML={{
				__html: `location.replace(${JSON.stringify(to)} + location.search + location.hash)`
			}}
		/>
		<ClientRedirect to={to} />
		<main className="redirect">
			<p>
				This page moved to <a href={to}>{to}</a>.
			</p>
		</main>
	</>
)
