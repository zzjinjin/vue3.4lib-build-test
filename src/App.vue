<template>
    <MyComponent :value="color" @change="val=>color=val"></MyComponent>
    <br>
    <br>
    <MyComponent :value="color" :opacity="true" @change="val=>colorRgba=val"></MyComponent>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MyComponent from './components/MyComponent.vue';

const color = ref('red');

const colorRgba = ref('red');

</script>