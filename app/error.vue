<template>
    <div />
</template>

<script setup lang="ts">
const error = useError();

if (error.value) {
    await navigateTo('/', { replace: true });
}
</script>