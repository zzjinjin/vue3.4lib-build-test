<template>
    <div class="wrapper-container" >
        <rgba-color-picker v-if="opacity" ref="rgbaColorPicker" class="color-picker-panel-item"></rgba-color-picker>
        <rgb-color-picker v-if="!opacity" ref="rgbColorPicker" class="color-picker-panel-item"></rgb-color-picker>
    </div>
</template>

<script setup lang="ts">
import 'vanilla-colorful/rgba-color-picker.js';
import 'vanilla-colorful/rgb-color-picker.js';
import { onMounted, ref } from 'vue';
import * as colorString from 'color-string';

const props = defineProps<{
    value: string,
    opacity?: boolean
}>();

const emits = defineEmits<{
    (e: 'change', color: string):void
}>();

const rgbaColorPicker = ref<HTMLElement | null>(null);
const rgbColorPicker = ref<HTMLElement | null>(null);

const currentColor = ref(props.value);
function emitChange(){
    emits('change', currentColor.value);
}

function colorObj2StrRgba(c: any){
    return `rgba(${c.r},${c.g},${c.b},${c.a})`;
}

function colorObj2StrRgb(c: any){
    return `rgb(${c.r},${c.g},${c.b})`;
}

function colorStr2Obj(c: string){
    const result: number[] = colorString.get.rgb(c);
    const [r, g, b, a] = result || [0, 0, 0, 1];
    return {r,g,b,a};
}


onMounted(()=>{
    if(rgbaColorPicker.value !== null){
        (rgbaColorPicker.value as any).color = colorStr2Obj(currentColor.value);
        rgbaColorPicker.value.addEventListener('color-changed', event => {
            currentColor.value = colorObj2StrRgba((event as any).detail.value);
            emitChange();
        });
    }
    if(rgbColorPicker.value != null){
        (rgbColorPicker.value as any).color = colorStr2Obj(currentColor.value);
        rgbColorPicker.value.addEventListener('color-changed', event => {
            currentColor.value = colorObj2StrRgb((event as any).detail.value);
            emitChange();
        });
    }
});


</script>


<style lang="less">
.wrapper-container{
    width: 288px; height: 256px;
    .color-picker-panel-item{
        width: 100%; height: 100%;
    }
}
</style>