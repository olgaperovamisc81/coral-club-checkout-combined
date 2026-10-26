<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import Cc3Map from '@/components/Map/Cc3Map.vue'
import Cc3MapPin from '@/components/Map/Cc3MapPin.vue'
import type { MapPoint } from '@/components/Map/mapTypes'

/**
 * Карта пунктов самовывоза на весь экран окна. Нажатие на метку выбирает
 * пункт, нажатие на пустое место карты снимает выбор.
 */
type PickupMarker = MapPoint & {
  id: string
  pinLabel: string
  pinVariant: 'coral' | 'cdek'
}

defineProps<{
  markers: PickupMarker[]
  selectedId?: string
  center: MapPoint
  zoom: number
}>()

const emit = defineEmits<{
  pick: [id: string]
  deselect: []
}>()

/**
 * Высота числом, а не стилем: Cc3Map считает по ней сетку тайлов, и
 * растянутая стилями карта оставила бы низ пустым.
 */
const MAP_FALLBACK_HEIGHT = 480

const boxRef = ref<HTMLElement>()
const height = ref(MAP_FALLBACK_HEIGHT)

let observer: ResizeObserver | undefined

onMounted(() => {
  const element = boxRef.value

  if (!element) {
    return
  }

  const measure = () => {
    const measured = Math.round(element.getBoundingClientRect().height)

    if (measured > 0) {
      height.value = measured
    }
  }

  measure()

  observer = new ResizeObserver(measure)
  observer.observe(element)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="boxRef" class="cc3-combined-pickup-map">
    <Cc3Map
      :center="center"
      :zoom="zoom"
      :markers="markers"
      :height="height"
      @select="emit('deselect')"
    >
      <template #marker="{ marker }">
        <Cc3MapPin
          :label="marker.pinLabel"
          :variant="marker.pinVariant"
          :selected="marker.id === selectedId"
          @click="emit('pick', marker.id)"
        />
      </template>
    </Cc3Map>
  </div>
</template>

<style lang="scss">
.cc3-combined-pickup-map {
  // Абсолютно: своя высота карты не должна влиять на высоту контейнера,
  // иначе одно меряет другое по кругу.
  position: absolute;
  inset: 0;

  overflow: hidden;

  .cc3-map {
    position: absolute;
    inset-block-start: 0;
    inset-inline: 0;

    border: none;
    border-radius: 0;
  }
}
</style>
