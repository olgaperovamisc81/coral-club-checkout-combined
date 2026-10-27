<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import Cc3InputField from '@/components/Field/Cc3InputField.vue'
import Cc3Icon from '@/components/Icon/Cc3Icon.vue'
import { useStand } from '@/stand/composables/useStand'

import Cc3ModalDeliveryMethodSwitch from '../Modal/Cc3ModalDeliveryMethodSwitch.vue'
import type { DeliveryProfile, DeliveryProfileMethod } from '../Modal/deliveryProfile'

/**
 * Адресная книга комбинированной версии — окно на весь экран, а не блок в
 * теле страницы. Оформлена как способ доставки и оплаты: один контейнер,
 * строки с радио справа, «Изменить адрес» под каждой строкой.
 *
 * Сверху тот же свитчер «Курьер / Самовывоз», что и на странице: он заметнее
 * чипсов, и книга показывает адреса одного способа, а нижняя кнопка добавляет
 * адрес именно этого способа. Поиск смотрит в оба способа: если совпадения
 * есть только в одном, свитчер сам переходит на него, а если в обоих —
 * остаётся как есть.
 *
 * «Изменить адрес» стоит вне label: иначе label свяжется с первой кнопкой
 * в строке, и клик по названию или адресу открывал бы редактирование вместо
 * выбора.
 */
const props = defineProps<{
  entries: DeliveryProfile[]
  selectedId?: string
  /** Активный способ: на нём книга открывается. */
  method: DeliveryProfileMethod
}>()

const emit = defineEmits<{
  close: []
  select: [id: string]
  edit: [id: string]
  add: [method: DeliveryProfileMethod]
}>()

const { t } = useStand()

const text = computed(() => ({
  title: t('combined.bookTitle'),
  close: t('common.close'),
  search: t('common.searchByNameAddress'),
  edit: t('combined.editAddress'),
  addCourier: t('delivery.addAddress'),
  addPickup: t('combined.addPickup'),
  emptyCourier: t('combined.bookEmpty'),
  emptyPickup: t('combined.bookEmptyPickup'),
}))

const methodTabs = computed(() => ({
  courier: t('combined.homeDelivery'),
  pickup: t('concept.delivery.pickup.action'),
}))

// Книга открывается на способе страницы: из самовывоза — самовывоз, из
// курьера — курьер. Окно создаётся заново при каждом открытии.
const activeMethod = ref<DeliveryProfileMethod>(props.method)
const search = ref('')

const addLabel = computed(() =>
  activeMethod.value === 'pickup' ? text.value.addPickup : text.value.addCourier,
)

// У способа нет ни одного сохранённого адреса — не «ничего не найдено», а
// пустая книга: человеку нужно подсказать, что делать.
const emptyText = computed(() =>
  activeMethod.value === 'pickup' ? text.value.emptyPickup : text.value.emptyCourier,
)

const isMethodEmpty = computed(
  () => !props.entries.some((entry) => entry.method === activeMethod.value),
)

function matchesQuery(entry: DeliveryProfile) {
  const query = search.value.trim().toLowerCase()

  return (
    query.length === 0 ||
    entry.name.toLowerCase().includes(query) ||
    entry.addressLine.toLowerCase().includes(query)
  )
}

function matches(entry: DeliveryProfile) {
  return entry.method === activeMethod.value && matchesQuery(entry)
}

// Совпадения только в другом способе — переходим на него, иначе человек видел
// бы пустой список и думал, что адреса нет. Если совпадения в обоих способах
// или нигде, свитчер не трогаем: человек выбрал его сам.
watch(search, () => {
  if (search.value.trim().length === 0) {
    return
  }

  const methodsWithMatches = new Set(
    props.entries.filter((entry) => matchesQuery(entry)).map((entry) => entry.method),
  )

  if (methodsWithMatches.size === 1) {
    const [only] = [...methodsWithMatches]

    activeMethod.value = only
  }
})

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

      <Cc3ModalDeliveryMethodSwitch
        :active="activeMethod"
        :courier-label="methodTabs.courier"
        :pickup-label="methodTabs.pickup"
        @select="activeMethod = $event"
      />

      <div class="cc3-combined-address-book__controls">
        <Cc3InputField v-model="search" type="text" :placeholder="text.search" />
      </div>

      <div class="cc3-combined-address-book__body">
        <p v-if="isMethodEmpty" class="cc3-combined-address-book__empty">{{ emptyText }}</p>

        <div v-else class="cc3-combined-address-book__list">
          <template v-for="entry in entries" :key="entry.id">
            <div v-if="matches(entry)" class="cc3-combined-address-book__row">
              <label class="cc3-combined-address-book__select">
                <span class="cc3-combined-address-book__main">
                  <span class="cc3-combined-address-book__type">{{ entry.typeLabel }}</span>
                  <span class="cc3-combined-address-book__name">{{ entry.name }}</span>
                  <span class="cc3-combined-address-book__address">{{ entry.addressLine }}</span>
                  <span class="cc3-combined-address-book__price">{{ entry.priceLabel }}</span>
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

        <div class="cc3-combined-address-book__footer">
          <button type="button" class="cc3-combined-address-book__add" @click="emit('add', activeMethod)">
            <Cc3Icon name="plus-md" :size="24" />
            {{ addLabel }}
          </button>
        </div>
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

  // Свитчер сверху несёт свои отступы, поэтому у поиска они сверху меньше.
  &__controls {
    padding: var(--st-global-distance-space-inset-xl) var(--st-global-distance-space-inset-2xl)
      var(--st-global-distance-space-inset-2xl);
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

  // Информер пустой книги: серая плашка, а не пустой контейнер с рамкой.
  &__empty {
    margin: 0;
    padding: var(--st-global-distance-space-inset-2xl);

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);
    background-color: var(--st-content-background-color-neutral-subtle);
    border-radius: var(--st-global-radius-md);
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

    padding: var(--st-global-distance-space-inset-2xl) var(--st-global-distance-space-inset-2xl) 0;

    cursor: pointer;
  }

  &__main {
    display: flex;
    flex-direction: column;

    min-width: 0;
  }

  // Тип, имя, адрес и срок с ценой — по макету: тип и адрес обычным текстом,
  // имя жирным и срок с ценой зелёным, как в блоке доставки на странице.
  &__type {
    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__name {
    @include font('label-lg');
    font-weight: 700;

    color: var(--st-content-foreground-color-positive-primary);
  }

  &__address {
    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__price {
    @include font('body-md');

    color: var(--st-content-foreground-color-positive-primary);
  }

  &__radio {
    @include cc3-modal-radio-control;
  }

  &__edit {
    align-self: flex-start;

    padding: var(--st-global-distance-space-inset-sm) var(--st-global-distance-space-inset-2xl)
      var(--st-global-distance-space-inset-2xl);

    font-family: inherit;

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);
    text-decoration: underline;
    background: none;
    border: none;
    cursor: pointer;
  }

  // Кнопка лежит в прокручиваемом теле сразу под списком или информером: в
  // короткой книге она стоит на 16px ниже содержимого, а в длинной прилипает
  // к низу окна и видна всегда. Фон закрывает строки, уходящие под неё.
  &__footer {
    position: sticky;
    inset-block-end: 0;
    z-index: 1;

    padding: var(--st-global-distance-space-inset-2xl) 0;

    background-color: var(--st-content-background-color-default-solid-normal);
  }

  &__add {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--st-global-distance-space-inline-sm);

    padding: var(--st-global-distance-space-inset-lg);
    width: 100%;

    font-family: inherit;

    @include font('label-lg');

    color: var(--st-action-foreground-color-onprimary-normal);
    background-color: var(--st-action-background-color-positive-normal);
    border: none;
    border-radius: var(--st-global-radius-pill);
    cursor: pointer;
  }
}
</style>
