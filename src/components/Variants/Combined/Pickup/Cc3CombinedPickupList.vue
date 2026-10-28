<script setup lang="ts">
import { computed, ref } from 'vue'

import { useStand } from '@/stand/composables/useStand'
import type { AddressSuggestion } from '@/stand/suggest'

import Cc3CombinedNotice from '../Cc3CombinedNotice.vue'
import Cc3CombinedPickupFilters from './Cc3CombinedPickupFilters.vue'
import Cc3CombinedPickupListSearch from './Cc3CombinedPickupListSearch.vue'

/**
 * Вкладка «Список»: поле адреса с подсказками под ним, фильтр по службам и
 * пункты в столбик. Поле печатает прямо здесь, без шторки — подсказки те же,
 * что на карте, но стоят в потоке страницы.
 */
type PickupListItem = {
  id: string
  name: string
  address: string
  meta: string
  closed?: boolean
}

type PickupFilter = {
  id: string
  label: string
  active: boolean
}

defineProps<{
  points: PickupListItem[]
  filters: PickupFilter[]
  selectedId?: string
  /** Адрес, выбранный в поиске; пока не выбран — поле пустое. */
  address: string
  /** Пояснение под фильтрами: рядом с адресом пунктов нет. */
  notice?: string
}>()

const emit = defineEmits<{
  select: [id: string]
  filter: [id: string]
  pick: [suggestion: AddressSuggestion]
  clear: []
}>()

const { t } = useStand()

// Пока человек ищет адрес, ряд чипсов не нужен: он встаёт между подсказками и
// результатами и читается как лишний слой. Вернётся, как только поиск закончен.
const isSearching = ref(false)

const text = computed(() => ({
  openUntil: t('pickup.openUntil'),
  closedNow: t('pickup.closedNow'),
}))
</script>

<template>
  <div class="cc3-combined-pickup-list">
    <Cc3CombinedPickupListSearch
      :address="address"
      @pick="emit('pick', $event)"
      @clear="emit('clear')"
      @active="isSearching = $event"
    />

    <Cc3CombinedPickupFilters v-if="!isSearching" :filters="filters" @select="emit('filter', $event)" />

    <Cc3CombinedNotice
      v-if="notice"
      tone="warning"
      class="cc3-combined-pickup-list__notice"
    >
      {{ notice }}
    </Cc3CombinedNotice>

    <div v-if="points.length > 0" class="cc3-combined-pickup-list__items">
      <button
        v-for="point in points"
        :key="point.id"
        type="button"
        class="cc3-combined-pickup-list__item"
        :class="{ 'cc3-combined-pickup-list__item--selected': point.id === selectedId }"
        @click="emit('select', point.id)"
      >
        <span class="cc3-combined-pickup-list__name">{{ point.name }}</span>
        <span class="cc3-combined-pickup-list__address">{{ point.address }}</span>
        <span
          class="cc3-combined-pickup-list__address"
          :class="{ 'cc3-combined-pickup-list__address--closed': point.closed }"
        >
          {{ point.closed ? text.closedNow : text.openUntil }}
        </span>
        <span class="cc3-combined-pickup-list__meta">{{ point.meta }}</span>
      </button>
    </div>

  </div>
</template>

<style lang="scss">
.cc3-combined-pickup-list {
  display: flex;
  flex: 1;
  flex-direction: column;

  min-height: 0;

  &__notice {
    margin: 0 var(--st-global-distance-space-inset-2xl) var(--st-global-distance-space-inset-md);
  }

  // Список прокручивается сам, а окно остаётся на месте — кнопка внизу всегда видна.
  &__items {
    display: flex;
    flex: 1;
    flex-direction: column;

    min-height: 0;

    overflow-y: auto;
    overscroll-behavior: contain;
  }

  &__item {
    display: flex;
    flex-direction: column;

    padding: var(--st-global-distance-space-inset-xl) var(--st-global-distance-space-inset-2xl);
    width: 100%;

    font-family: inherit;
    text-align: start;

    background: none;
    border: none;
    cursor: pointer;

    &--selected {
      background-color: var(--st-content-background-color-neutral-onsubtle);
    }
  }

  &__name {
    @include font('label-lg');
    font-weight: 700;

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__address {
    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);

    &--closed {
      color: var(--st-content-foreground-color-negative-primary);
    }
  }

  &__meta {
    @include font('body-md');

    color: var(--st-content-foreground-color-positive-primary);
  }
}
</style>
