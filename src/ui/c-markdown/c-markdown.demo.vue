<script setup lang="ts">
const md = `
# Ateng-Tools

## About
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, nisl quis
mollis blandit, nunc nisl aliquam nunc, vitae aliquam nisl nunc vitae nisl.

- Lorem ipsum dolor sit amet, consectetur adipiscing elit.
- Sed euismod, nisl quis mollis blandit, nunc nisl aliquam nunc, vitae aliquam nisl nunc vitae nisl.

[Ateng-Tools](https://atengk.github.io/Ateng-Tools/)
`;
</script>

<template>
  <c-markdown :markdown="md" />
</template>
