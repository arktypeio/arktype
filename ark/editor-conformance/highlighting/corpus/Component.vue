<script setup lang="ts">
import { type } from "arktype"

const User = type({ name: "string", "age?": "number.integer" })
const notADefinition = "string | number"
</script>

<template>
	<p :title="type('string').expression">{{ type("string | number").expression }}</p>
</template>
