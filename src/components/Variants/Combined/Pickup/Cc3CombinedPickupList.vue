<script setup lang="ts">
import { computed } from 'vue'

import Cc3InputField from '@/components/Field/Cc3InputField.vue'
import { useStand } from '@/stand/composables/useStand'

import Cc3CombinedNotice from '../Cc3CombinedNotice.vue'
import Cc3CombinedPickupFilters from './Cc3CombinedPickupFilters.vue'

/**
 * Вкладка «Список»: поле адреса, фильтр по службам и пункты в столбик.
 * Поле не печатает само, а открывает шторку поиска — подсказки одни и те
 * же на карте и в списке.
 */
type PickupListItem = {
  id: string
  name: string
  address: string
  meta: string
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
  search: []
}>()

const { t } = useStand()

const text = computed(() => ({
  findAddress: t('common.findAddress'),
  openUntil: t('pickup.openUntil'),
}))
</script>

<template>
  <div class="cc3-combined-pickup-list">
    <div class="cc3-combined-pickup-list__field">
      <span class="cc3-combined-pickup-list__label">{{ text.findAddress }}</span>

      <!-- Чтение без ввода: нажатие открывает шторку поиска. -->
      <div class="cc3-combined-pickup-list__input" @click="emit('search')">
        <Cc3InputField :model-value="address" type="text" readonly />
      </div>
    </div>

    <Cc3CombinedPickupFilters :filters="filters" @select="emit('filter', $event)" />

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
        <span class="cc3-combined-pickup-list__address">{{ text.openUntil }}</span>
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

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--st-global-distance-space-inset-sm);

    padding: var(--st-global-distance-space-inset-xl) var(--st-global-distance-space-inset-2xl);
  }

  &__label {
    @include font('label-sm');

    color: var(--st-content-foreground-color-neutral-secondary);
  }

  &__input {
    cursor: pointer;

    // Нажатие должно дойти до обёртки, а не уйти в поле с курсором ввода.
    .cc3-input-field__input {
      cursor: pointer;
      pointer-events: none;
    }
  }

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
  }

  &__meta {
    @include font('body-md');

    color: var(--st-content-foreground-color-positive-primary);
  }
}
</style>
