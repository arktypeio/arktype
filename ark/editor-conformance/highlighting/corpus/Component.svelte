<script lang="ts">
	import { type } from "arktype"

	const User = type({ name: "string", "age?": "number.integer" })
	const notADefinition = "string | number"
</script>

<p title="string | number">{type("string | number").expression}</p>

<style>
	p::after {
		content: "string | number";
	}
</style>
