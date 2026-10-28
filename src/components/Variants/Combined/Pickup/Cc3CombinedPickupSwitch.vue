<script setup lang="ts">
import { computed } from 'vue'

import Cc3Icon from '@/components/Icon/Cc3Icon.vue'
import { useStand } from '@/stand/composables/useStand'

/**
 * Верхний ряд окна самовывоза: «Карта» и «Список» таблетками. Поиск стоит
 * отдельной строкой: под картой на карте и под рядом в списке.
 */
defineProps<{
  view: 'map' | 'list'
}>()

const emit = defineEmits<{
  select: [view: 'map' | 'list']
}>()

const { t } = useStand()

const text = computed(() => ({
  map: t('common.map'),
  list: t('common.list'),
}))
</script>

<template>
  <div class="cc3-combined-pickup-switch">
    <button
      type="button"
      class="cc3-combined-pickup-switch__pill"
      :class="{ 'cc3-combined-pickup-switch__pill--active': view === 'map' }"
      @click="emit('select', 'map')"
    >
      <Cc3Icon name="location-map" :size="24" />
      {{ text.map }}
    </button>

    <button
      type="button"
      class="cc3-combined-pickup-switch__pill"
      :class="{ 'cc3-combined-pickup-switch__pill--active': view === 'list' }"
      @click="emit('select', 'list')"
    >
      <Cc3Icon name="layout-list" :size="24" />
      {{ text.list }}
    </button>

  </div>
</template>

<style lang="scss">
.cc3-combined-pickup-switch {
  display: flex;
  align-items: center;
  gap: var(--st-global-distance-space-inset-2xl);

  padding: var(--st-global-distance-space-inset-2xl);

  &__pill {
    display: inline-flex;
    align-items: center;
    gap: var(--st-global-distance-space-inset-md);

    padding: 0 var(--st-global-distance-space-inset-4xl);
    height: 40px;

    font-family: inherit;

    @include font('label-md');

    color: var(--st-content-foreground-color-neutral-primary);

    @include cc3-combined-pickup-surface;
    border: none;
    border-radius: var(--st-global-radius-pill);
    cursor: pointer;

    &--active {
      color: var(--st-action-foreground-color-onprimary-normal);
      background-color: var(--st-action-background-color-positive-normal);
      background-image: none;
    }
  }
}
</style>
