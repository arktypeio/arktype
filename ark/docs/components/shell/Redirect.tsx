import { siteUrl } from "../../app/metadata.ts"
import { withBase } from "../../lib/basePath.ts"
import { ClientRedirect } from "./ClientRedirect.tsx"

/**
 * A static stand-in for a moved page. The meta refresh covers visitors
 * without JS; the script keeps the url's query and hash, which a meta
 * refresh drops; ClientRedirect covers client-side navigation, which runs
 * neither. Only ClientRedirect's router adds the base path itself.
 */
export const Redirect = ({ to }: { to: string }) => (
	<>
		<meta httpEquiv="refresh" content={`0; url=${withBase(to)}`} />
		<meta name="robots" content="noindex" />
		<link rel="canonical" href={`${siteUrl}${to}`} />
		<script
			dangerouslySetInnerHTML={{
				__html: `location.replace(${JSON.stringify(withBase(to))} + location.search + location.hash)`
			}}
		/>
		<ClientRedirect to={to} />
		<main className="redirect">
			<p>
				This page moved to <a href={withBase(to)}>{to}</a>.
			</p>
		</main>
	</>
)
