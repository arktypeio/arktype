<script lang="ts">
	import { type, match } from "arktype"
	import { onMount } from "svelte"

	export let total = 0

	const Payment = type({
		method: "'card' | 'paypal'",
		amount: "number > 0",
		"coupon?": /^[A-Z]{4}-\d{2}$/
	})

	const describe = match({
		"string": s => `text: ${s}`,
		"number": n => n.toFixed(2),
		default: "assert"
	})

	let payment = { method: "card", amount: total }
	$: result = Payment(payment)
	$: valid = !(result instanceof type.errors)

	onMount(() => console.log(describe(total)))
</script>

<svelte:head>
	<title>Checkout ({total})</title>
</svelte:head>

{#if valid}
	<p class="ok">Paying {payment.amount} by {payment.method}</p>
{:else if total === 0}
	<p>Nothing to pay</p>
{:else}
	<p class="error">{result.summary}</p>
{/if}

{#each ["card", "paypal"] as method, i (method)}
	<label>
		<input type="radio" bind:group={payment.method} value={method} />
		{i + 1}. {method}
	</label>
{/each}

{#await fetch("/api/rates") then rates}
	{@const parsed = type("number[]")(rates)}
	<span use:tooltip={parsed} transition:fade>{parsed}</span>
{:catch error}
	{@html `<b>${error.message}</b>`}
{/await}

<style>
	.ok { color: green; }
	.error::before { content: "⚠ "; }
</style>
