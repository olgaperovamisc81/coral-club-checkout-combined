<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import Cc3InputField from '@/components/Field/Cc3InputField.vue'
import Cc3Icon from '@/components/Icon/Cc3Icon.vue'
import { useAddressSuggest } from '@/stand/composables/useAddressSuggest'
import { useStand } from '@/stand/composables/useStand'
import type { AddressSuggestion } from '@/stand/suggest'

/**
 * Окно поиска адреса. Открывается из окна с картой отдельным окном, а не
 * списком под строкой поиска: поверх карты подсказкам не хватает места, а
 * здесь они занимают весь экран ниже строки и прокручиваются вниз.
 */
const props = defineProps<{
  initialQuery: string
}>()

const emit = defineEmits<{
  close: []
  pick: [suggestion: AddressSuggestion]
  submit: [query: string]
}>()

const { t } = useStand()
const { items, status, ask, reset } = useAddressSuggest()

const text = computed(() => ({
  title: t('address.title'),
  close: t('common.close'),
  placeholder: t('concept.common.findAddress'),
  continue: t('common.continue'),
  loading: t('suggest.loading'),
  empty: t('suggest.empty'),
}))

const query = ref(props.initialQuery)
const dialogRef = ref<HTMLElement>()

watch(query, (value) => ask(value))

// «Сервис ничего не нашёл» и «сервис не ответил» для человека одно и то же:
// выход один — ввести адрес руками и нажать «Продолжить».
const note = computed(() => {
  if (status.value === 'loading') return text.value.loading
  if (status.value === 'empty' || status.value === 'error') return text.value.empty

  return ''
})

onMounted(() => {
  dialogRef.value?.querySelector('input')?.focus()
})

// Подсказки не должны пережить окно: при следующем открытии их быть не должно.
onBeforeUnmount(reset)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  } else if (event.key === 'Enter' && items.value.length === 0) {
    emit('submit', query.value)
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      ref="dialogRef"
      class="cc3-combined-search-dialog"
      role="dialog"
      aria-modal="true"
      @keydown="onKeydown"
    >
      <div class="cc3-combined-search-dialog__header">
        <h2 class="cc3-combined-search-dialog__title">{{ text.title }}</h2>

        <button
          type="button"
          class="cc3-combined-search-dialog__close"
          :aria-label="text.close"
          @click="emit('close')"
        >
          <Cc3Icon name="x-md" :size="24" />
        </button>
      </div>

      <div class="cc3-combined-search-dialog__controls">
        <Cc3InputField v-model="query" type="text" :placeholder="text.placeholder">
          <template #prefix>
            <Cc3Icon name="search-md" :size="20" />
          </template>
        </Cc3InputField>

        <button
          type="button"
          class="cc3-combined-search-dialog__continue"
          @click="emit('submit', query)"
        >
          {{ text.continue }}
        </button>
      </div>

      <div class="cc3-combined-search-dialog__results">
        <ul v-if="items.length > 0" class="cc3-combined-search-dialog__list">
          <li v-for="item in items" :key="item.id">
            <button
              type="button"
              class="cc3-combined-search-dialog__option"
              @click="emit('pick', item)"
            >
              <Cc3Icon name="location-pin" :size="20" />
              {{ item.label }}
            </button>
          </li>
        </ul>

        <p v-if="note" class="cc3-combined-search-dialog__note">{{ note }}</p>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss">
.cc3-combined-search-dialog {
  color-scheme: light;

  @include cc3-light-tokens;

  position: fixed;
  inset: 0;
  z-index: 110;

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
    gap: var(--st-global-distance-space-inset-2xl);

    padding: var(--st-global-distance-space-inset-xl) var(--st-global-distance-space-inset-2xl);
  }

  &__continue {
    display: flex;
    align-items: center;
    justify-content: center;

    padding: var(--st-global-distance-space-inset-lg);
    width: 100%;
    height: 44px;

    font-family: inherit;

    @include font('label-md');

    color: var(--st-action-foreground-color-onprimary-normal);
    background-color: var(--st-action-background-color-positive-normal);
    border: none;
    border-radius: var(--st-global-radius-pill);
    cursor: pointer;
  }

  // Подсказки занимают весь остаток экрана и прокручиваются внутри себя.
  &__results {
    flex: 1;

    padding: 0 var(--st-global-distance-space-inset-2xl);

    overflow-y: auto;
    overscroll-behavior: contain;
  }

  &__list {
    margin: 0;
    padding: 0;

    list-style: none;
  }

  &__option {
    display: flex;
    align-items: flex-start;
    gap: var(--st-global-distance-space-inset-md);

    padding: var(--st-global-distance-space-inset-xl) 0;
    width: 100%;

    font-family: inherit;
    text-align: start;

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);
    background: none;
    border: none;
    border-bottom: 1px solid var(--st-content-border-color-neutral-onsubtle);
    cursor: pointer;

    .cc3-icon {
      flex-shrink: 0;

      margin-top: 2px;

      color: var(--st-content-foreground-color-neutral-tetriary);
    }
  }

  &__note {
    margin: 0;
    padding: var(--st-global-distance-space-inset-xl) 0;

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-tetriary);
  }
}
</style>
