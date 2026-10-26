<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import Cc3InputField from '@/components/Field/Cc3InputField.vue'
import Cc3Icon from '@/components/Icon/Cc3Icon.vue'
import { useStand } from '@/stand/composables/useStand'

import type { DeliveryProfile, DeliveryProfileMethod } from '../Modal/deliveryProfile'

/**
 * Адресная книга комбинированной версии — окно на весь экран, а не блок в
 * теле страницы. Оформлена как способ доставки и оплаты: один контейнер,
 * строки с радио справа, «Изменить адрес» под каждой строкой.
 *
 * «Изменить адрес» стоит вне label: иначе label свяжется с первой кнопкой
 * в строке, и клик по названию или адресу открывал бы редактирование вместо
 * выбора.
 */
const props = defineProps<{
  entries: DeliveryProfile[]
  selectedId?: string
  /** Активный способ: от него зависит, что добавляет нижняя кнопка. */
  method: DeliveryProfileMethod
}>()

const emit = defineEmits<{
  close: []
  select: [id: string]
  edit: [id: string]
  add: []
}>()

const { t } = useStand()

const text = computed(() => ({
  title: t('addressBook.title'),
  close: t('common.close'),
  search: t('common.searchByNameAddress'),
  edit: t('combined.editAddress'),
  addCourier: t('delivery.addAddress'),
  addPickup: t('combined.addPickup'),
}))

const addLabel = computed(() =>
  props.method === 'pickup' ? text.value.addPickup : text.value.addCourier,
)

type FilterId = 'all' | DeliveryProfileMethod

const filters = computed<{ id: FilterId; label: string }[]>(() => [
  { id: 'all', label: t('common.all') },
  { id: 'courier', label: t('concept.delivery.courier.title') },
  { id: 'pickup', label: t('concept.delivery.pickup.action') },
])

// Книга открывается на вкладке активного способа: из самовывоза — самовывоз,
// из курьера — курьер. Окно создаётся заново при каждом открытии.
const activeFilter = ref<FilterId>(props.method)
const search = ref('')

function matches(entry: DeliveryProfile) {
  const byFilter = activeFilter.value === 'all' || entry.method === activeFilter.value
  const query = search.value.trim().toLowerCase()
  const byQuery =
    query.length === 0 ||
    entry.name.toLowerCase().includes(query) ||
    entry.addressLine.toLowerCase().includes(query)

  return byFilter && byQuery
}

/**
 * Пока окно открыто, страница под ним не прокручивается — иначе на
 * телефоне палец, не попавший по списку, возит чекаут за ним.
 */
let bodyOverflow = ''

onMounted(() => {
  bodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflow
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="cc3-combined-address-book" role="dialog" aria-modal="true" @keydown="onKeydown">
      <div class="cc3-combined-address-book__header">
        <h2 class="cc3-combined-address-book__title">{{ text.title }}</h2>

        <button
          type="button"
          class="cc3-combined-address-book__close"
          :aria-label="text.close"
          @click="emit('close')"
        >
          <Cc3Icon name="x-md" :size="24" />
        </button>
      </div>

      <div class="cc3-combined-address-book__controls">
        <Cc3InputField v-model="search" type="text" :placeholder="text.search" />

        <div class="cc3-combined-address-book__chips">
          <button
            v-for="filter in filters"
            :key="filter.id"
            type="button"
            class="cc3-combined-address-book__chip"
            :class="{ 'cc3-combined-address-book__chip--active': activeFilter === filter.id }"
            @click="activeFilter = filter.id"
          >
            {{ filter.label }}
          </button>
        </div>
      </div>

      <div class="cc3-combined-address-book__body">
        <div class="cc3-combined-address-book__list">
          <template v-for="entry in entries" :key="entry.id">
            <div v-if="matches(entry)" class="cc3-combined-address-book__row">
              <label class="cc3-combined-address-book__select">
                <span class="cc3-combined-address-book__main">
                  <span class="cc3-combined-address-book__type">{{ entry.typeLabel }}</span>
                  <span class="cc3-combined-address-book__name">{{ entry.name }}</span>
                  <span class="cc3-combined-address-book__address">{{ entry.addressLine }}</span>
                  <span
                    v-if="entry.method === 'pickup'"
                    class="cc3-combined-address-book__price"
                  >
                    {{ entry.priceLabel }}
                  </span>
                </span>

                <input
                  type="radio"
                  name="cc3-combined-address-book"
                  class="cc3-combined-address-book__radio"
                  :checked="entry.id === selectedId"
                  @change="emit('select', entry.id)"
                />
              </label>

              <button
                type="button"
                class="cc3-combined-address-book__edit"
                @click="emit('edit', entry.id)"
              >
                {{ text.edit }}
              </button>
            </div>
          </template>
        </div>
      </div>

      <div class="cc3-combined-address-book__footer">
        <button type="button" class="cc3-combined-address-book__add" @click="emit('add')">
          <Cc3Icon name="plus-md" :size="24" />
          {{ addLabel }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss">
.cc3-combined-address-book {
  // Окно уходит в body и теряет токены страницы: повторяем объявление,
  // как у остальных окон стенда.
  color-scheme: light;

  @include cc3-light-tokens;

  position: fixed;
  inset: 0;
  z-index: 100;

  display: flex;
  flex-direction: column;

  width: 100%;

  @include mediaMinWidth('sm') {
    max-width: 375px;
  }

  height: 100dvh;
  margin: 0 auto;

  background-color: var(--st-content-background-color-default-solid-normal);

  &__header {
    position: relative;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: var(--st-global-distance-space-inset-2xl);

    border-bottom: 1px solid var(--st-content-border-color-neutral-onsubtle);
  }

  &__title {
    margin: 0;

    @include font('label-md');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__close {
    position: absolute;
    inset-inline-end: var(--st-global-distance-space-inset-2xl);
    inset-block-start: 50%;

    display: flex;

    padding: 0;

    color: var(--st-content-foreground-color-neutral-primary);
    background: none;
    border: none;
    cursor: pointer;
    transform: translateY(-50%);
  }

  &__controls {
    display: flex;
    flex-direction: column;
    gap: var(--st-global-distance-space-inset-xl);

    padding: var(--st-global-distance-space-inset-2xl);
  }

  &__chips {
    display: flex;
    flex-wrap: nowrap;
    gap: var(--st-global-distance-space-inset-md);

    overflow-x: auto;
  }

  &__chip {
    flex-shrink: 0;

    padding: var(--st-global-distance-space-inset-sm) var(--st-global-distance-space-inset-xl);

    font-family: inherit;

    @include font('label-md');

    color: var(--st-content-foreground-color-neutral-primary);
    background-color: var(--st-content-background-color-default-solid-normal);
    border: 1px solid var(--st-content-border-color-neutral-implicit);
    border-radius: var(--st-global-radius-pill);
    cursor: pointer;

    &--active {
      color: var(--st-action-foreground-color-positive-normal);
      border-color: var(--st-action-foreground-color-positive-normal);
    }
  }

  &__body {
    flex: 1;

    padding: 0 var(--st-global-distance-space-inset-2xl);

    overflow-y: auto;
    overscroll-behavior: contain;
  }

  &__list {
    @include cc3-combined-choice-list;
  }

  // Строка здесь — колонка: выбор и «Изменить адрес» друг под другом,
  // поэтому подсветку и разделитель берём от общей строки, а раскладку
  // переопределяем.
  &__row {
    @include cc3-combined-choice-row;

    flex-direction: column;
    align-items: stretch;
    gap: var(--st-global-distance-space-inset-none);

    padding: 0;
    cursor: default;
  }

  &__select {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--st-global-distance-space-inset-xl);

    padding: var(--st-global-distance-space-inset-xl) var(--st-global-distance-space-inset-2xl)
      var(--st-global-distance-space-inset-xs);

    cursor: pointer;
  }

  &__main {
    display: flex;
    flex-direction: column;

    min-width: 0;
  }

  &__type {
    @include font('label-xs');

    color: var(--st-content-foreground-color-neutral-secondary);
  }

  &__name {
    @include font('body-md');
    font-weight: 700;

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__address {
    @include font('body-sm');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__price {
    @include font('body-sm');

    color: var(--st-content-foreground-color-neutral-secondary);
  }

  &__radio {
    @include cc3-modal-radio-control;
  }

  &__edit {
    align-self: flex-start;

    padding: var(--st-global-distance-space-inset-md) var(--st-global-distance-space-inset-2xl)
      var(--st-global-distance-space-inset-xl);

    font-family: inherit;

    @include font('label-sm');

    color: var(--st-content-foreground-color-neutral-secondary);
    background: none;
    border: none;
    cursor: pointer;
  }

  &__footer {
    padding: var(--st-global-distance-space-inset-2xl);
  }

  &__add {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--st-global-distance-space-inline-sm);

    padding: var(--st-global-distance-space-inset-lg);
    width: 100%;

    font-family: inherit;

    @include font('label-md');

    color: var(--st-action-foreground-color-positive-normal);
    background-color: var(--st-action-background-color-positive-subtle-normal);
    border: none;
    border-radius: var(--st-global-radius-pill);
    cursor: pointer;
  }
}
</style>
