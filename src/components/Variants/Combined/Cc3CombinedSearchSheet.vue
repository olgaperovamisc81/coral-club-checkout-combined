<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import Cc3InputField from '@/components/Field/Cc3InputField.vue'
import { useAddressSuggest } from '@/stand/composables/useAddressSuggest'
import { useStand } from '@/stand/composables/useStand'
import type { AddressSuggestion } from '@/stand/suggest'

import Cc3CombinedSheetFrame from './Cc3CombinedSheetFrame.vue'

/**
 * Шторка поиска адреса: поле сверху и список подсказок на всю остальную
 * высоту. Подсказка — это название жирным по введённой части и серая строка
 * района под ним. Выбор подсказки возвращает адрес. Её используют и карта
 * самовывоза, и карта выбора адреса курьера.
 *
 * Enter, когда подсказок нет, отдаёт набранное как есть: сервис мог ничего не
 * найти или не ответить, и тогда адрес остаётся ввести руками.
 */
const props = defineProps<{
  initialQuery: string
}>()

const emit = defineEmits<{
  pick: [suggestion: AddressSuggestion]
  submit: [query: string]
}>()

const { t } = useStand()
const { items, status, ask, reset } = useAddressSuggest()

const text = computed(() => ({
  placeholder: t('concept.common.findAddress'),
  loading: t('suggest.loading'),
  empty: t('suggest.empty'),
}))

const query = ref(props.initialQuery)
const sheetRef = ref<HTMLElement>()

watch(query, (value) => ask(value))

onMounted(() => {
  sheetRef.value?.querySelector('input')?.focus()

  if (query.value) {
    ask(query.value)
  }
})

// Подсказки не должны пережить шторку: при следующем открытии их быть не должно.
onBeforeUnmount(reset)

/**
 * Строка подсказки разобрана заранее: в шаблоне нельзя считать, а жирным
 * выделяется именно та часть названия, которую человек уже набрал.
 */
const rows = computed(() =>
  items.value.map((item) => {
    const title = item.streetLine || item.street || item.label
    const typed = query.value.trim().toLowerCase()
    const start = typed ? title.toLowerCase().indexOf(typed) : -1
    const length = start === -1 ? 0 : typed.length

    return {
      item,
      before: start === -1 ? '' : title.slice(0, start),
      bold: start === -1 ? '' : title.slice(start, start + length),
      rest: start === -1 ? title : title.slice(start + length),
      area: [item.city, item.region].filter(Boolean).join(', '),
    }
  }),
)

function onEnter() {
  if (items.value.length === 0) {
    emit('submit', query.value)
  }
}

const note = computed(() => {
  if (status.value === 'loading') return text.value.loading
  if (status.value === 'empty' || status.value === 'error') return text.value.empty

  return ''
})
</script>

<template>
  <Cc3CombinedSheetFrame tall>
    <div ref="sheetRef" class="cc3-combined-search-sheet" @keydown.enter="onEnter">
      <div class="cc3-combined-search-sheet__field">
        <Cc3InputField v-model="query" type="text" :placeholder="text.placeholder" />
      </div>

      <div class="cc3-combined-search-sheet__results">
        <ul v-if="rows.length > 0" class="cc3-combined-search-sheet__list">
          <li v-for="row in rows" :key="row.item.id">
            <button
              type="button"
              class="cc3-combined-search-sheet__option"
              @click="emit('pick', row.item)"
            >
              <span class="cc3-combined-search-sheet__title">
                {{ row.before }}<strong>{{ row.bold }}</strong>{{ row.rest }}
              </span>

              <span class="cc3-combined-search-sheet__area">{{ row.area }}</span>
            </button>
          </li>
        </ul>

        <p v-if="note" class="cc3-combined-search-sheet__note">{{ note }}</p>
      </div>
    </div>
  </Cc3CombinedSheetFrame>
</template>

<style lang="scss">
.cc3-combined-search-sheet {
  display: flex;
  flex: 1;
  flex-direction: column;

  min-height: 0;

  &__field {
    padding: var(--st-global-distance-space-inset-2xl);
  }

  // Подсказки занимают весь остаток шторки и прокручиваются внутри неё.
  &__results {
    flex: 1;

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
    flex-direction: column;

    padding: var(--st-global-distance-space-inset-lg) var(--st-global-distance-space-inset-2xl);
    width: 100%;

    font-family: inherit;
    text-align: start;

    color: var(--st-content-foreground-color-neutral-primary);
    background: none;
    border: none;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background-color: var(--st-content-background-color-neutral-onsubtle);
      outline: none;
    }
  }

  &__title {
    @include font('body-md');

    strong {
      font-weight: 700;
    }
  }

  &__area {
    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-secondary);
  }

  &__note {
    margin: 0;
    padding: var(--st-global-distance-space-inset-lg) var(--st-global-distance-space-inset-2xl);

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-tetriary);
  }
}
</style>
