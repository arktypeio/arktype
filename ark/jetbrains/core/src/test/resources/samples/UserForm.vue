<script setup lang="ts">
import { type, scope } from "arktype"
import { computed, ref } from "vue"

const User = type({
	name: "string > 0",
	email: "string.email",
	"age?": "number.integer >= 18",
	tags: "string[] <= 5"
})

const $ = scope({
	id: "string.uuid",
	account: { id: "id", owner: "user", "roles?": "('admin' | 'member')[]" },
	user: () => User
}).export()

const draft = ref<typeof User.infer>({ name: "", email: "", tags: [] })
const errors = computed(() => {
	const out = User(draft.value)
	return out instanceof type.errors ? out.summary : null
})
</script>

<template>
	<form class="user-form" @submit.prevent="save">
		<label :for="`name-${id}`">Name</label>
		<input v-model="draft.name" :class="{ invalid: !!errors }" />
		<p v-if="errors" class="errors">{{ errors }}</p>
		<ul>
			<li v-for="tag in draft.tags" :key="tag">{{ tag.toUpperCase() }}</li>
		</ul>
		<button :disabled="type('string > 0').allows(draft.name) === false">Save</button>
	</form>
</template>

<style scoped lang="scss">
$accent: #6b5cff;

.user-form {
	display: grid;
	gap: 0.5rem;
	color: v-bind("errors ? 'red' : 'inherit'");

	.errors {
		color: darken($accent, 10%);
		&:hover { text-decoration: underline; }
	}
}
</style>
