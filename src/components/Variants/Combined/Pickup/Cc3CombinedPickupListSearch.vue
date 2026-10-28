<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import Cc3InputField from '@/components/Field/Cc3InputField.vue'
import Cc3Icon from '@/components/Icon/Cc3Icon.vue'
import { useAddressSuggest } from '@/stand/composables/useAddressSuggest'
import { useStand } from '@/stand/composables/useStand'
import type { AddressSuggestion } from '@/stand/suggest'

/**
 * Поиск адреса на вкладке «Список»: поле остаётся на месте, а подсказки
 * встают под ним (видно три, остальные прокручиваются), и уже под ними идут
 * пункты. Шторка здесь не нужна: на списке клавиатуре нечего закрывать, а
 * лишний слой только отрывает человека от результатов. На карте шторка
 * остаётся — см. Cc3CombinedSearchSheet.
 *
 * Выбранный адрес остаётся в поле, справа появляется крестик, чтобы сбросить
 * его одним нажатием и вернуть исходный порядок пунктов.
 */
const props = defineProps<{
  /** Адрес, выбранный в поиске (общий с картой); пока не выбран — пусто. */
  address: string
}>()

const emit = defineEmits<{
  pick: [suggestion: AddressSuggestion]
  clear: []
}>()

const { t } = useStand()
const { items, status, ask, reset } = useAddressSuggest()

const text = computed(() => ({
  label: t('common.findAddress'),
  placeholder: t('concept.common.findAddress'),
  clear: t('combined.clearAddress'),
  loading: t('suggest.loading'),
  empty: t('suggest.empty'),
  error: t('suggest.error'),
}))

const query = ref(props.address)
const isOpen = ref(false)
const rootRef = ref<HTMLElement>()

// Адрес выбрали на карте или сбросили снаружи — поле показывает то же самое.
watch(
  () => props.address,
  (value) => {
    query.value = value
  },
)

function onInput(value: string) {
  query.value = value
  isOpen.value = true
  ask(value)
}

// Подсказки закрываются, когда фокус ушёл из блока целиком: нажатие на саму
// подсказку фокус из блока не уводит.
function onFocusOut(event: FocusEvent) {
  if (!rootRef.value?.contains(event.relatedTarget as Node | null)) {
    isOpen.value = false
  }
}

function onPick(suggestion: AddressSuggestion) {
  isOpen.value = false
  reset()
  emit('pick', suggestion)
}

function onClear() {
  query.value = ''
  isOpen.value = false
  reset()
  emit('clear')
}

// Enter выбирает первую подсказку: человек, набравший адрес до конца, не
// должен тянуться пальцем к списку.
function onEnter() {
  const [first] = items.value

  if (first) {
    onPick(first)
  }
}

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

const note = computed(() => {
  if (status.value === 'loading') return text.value.loading
  if (status.value === 'empty') return text.value.empty
  if (status.value === 'error') return text.value.error

  return ''
})

const isClearVisible = computed(() => query.value.length > 0)
const isDropdownVisible = computed(() => isOpen.value && (rows.value.length > 0 || note.value !== ''))
</script>

<template>
  <div
    ref="rootRef"
    class="cc3-combined-pickup-list-search"
    @focusout="onFocusOut"
    @keydown.enter.prevent="onEnter"
  >
    <span class="cc3-combined-pickup-list-search__label">{{ text.label }}</span>

    <div class="cc3-combined-pickup-list-search__row">
      <Cc3InputField
        :model-value="query"
        type="text"
        :placeholder="text.placeholder"
        autocomplete="off"
        @update:model-value="onInput"
      />

      <button
        v-if="isClearVisible"
        type="button"
        class="cc3-combined-pickup-list-search__clear"
        :aria-label="text.clear"
        @click="onClear"
      >
        <Cc3Icon name="x-md" :size="20" />
      </button>
    </div>

    <div v-if="isDropdownVisible" class="cc3-combined-pickup-list-search__dropdown">
      <ul v-if="rows.length > 0" class="cc3-combined-pickup-list-search__list">
        <li v-for="row in rows" :key="row.item.id">
          <button
            type="button"
            class="cc3-combined-pickup-list-search__option"
            @click="onPick(row.item)"
          >
            <span class="cc3-combined-pickup-list-search__title">
              {{ row.before }}<strong>{{ row.bold }}</strong>{{ row.rest }}
            </span>

            <span class="cc3-combined-pickup-list-search__area">{{ row.area }}</span>
          </button>
        </li>
      </ul>

      <p v-if="note" class="cc3-combined-pickup-list-search__note">{{ note }}</p>
    </div>
  </div>
</template>

<style lang="scss">
.cc3-combined-pickup-list-search {
  display: flex;
  flex-direction: column;
  gap: var(--st-global-distance-space-inset-sm);

  padding: var(--st-global-distance-space-inset-xl) var(--st-global-distance-space-inset-2xl);

  &__label {
    @include font('label-sm');

    color: var(--st-content-foreground-color-neutral-secondary);
  }

  &__row {
    display: flex;
    align-items: center;
    gap: var(--st-global-distance-space-inset-md);
  }

  &__clear {
    display: flex;
    flex-shrink: 0;

    padding: var(--st-global-distance-space-inset-md);

    color: var(--st-content-foreground-color-neutral-primary);
    background: none;
    border: none;
    cursor: pointer;
  }

  // Видно три подсказки, остальные прокручиваются внутри. Высота строки — две
  // строки текста по 24 и вертикальные отступы option; задана расчётом, чтобы
  // не зависеть от числа подсказок и не толкать пункты ниже лишний раз.
  &__dropdown {
    max-height: calc(3 * (2 * 24px + 2 * var(--st-global-distance-space-inset-lg)));

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

    padding: var(--st-global-distance-space-inset-lg) 0;
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
    padding: var(--st-global-distance-space-inset-lg) 0;

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-tetriary);
  }
}
</style>
