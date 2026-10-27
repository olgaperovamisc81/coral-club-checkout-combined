<template>
  <div
    class="cc3-stand-field"
    :class="modifiers"
    @focusin="onFocus"
    @focusout="onBlur"
    @input="onInput"
    @keydown="onKeydown"
  >
    <label class="cc3-stand-field__label" :for="fieldId">
      {{ field.label }}
      <span v-if="field.required" class="cc3-stand-field__required">*</span>
    </label>

    <div v-if="field.type === 'chips'" class="cc3-stand-field__chips">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="cc3-stand-field__chip"
        :class="{ 'cc3-stand-field__chip--active': value === option.value }"
        @click="value = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <select
      v-else-if="field.type === 'select'"
      :id="fieldId"
      v-model="value"
      class="cc3-stand-field__select"
      :name="field.key"
      :autocomplete="field.autocomplete"
    >
      <option value="" disabled>{{ selectPlaceholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <Cc3Icon v-if="hasChevron" name="chevron-down" :size="20" class="cc3-stand-field__chevron" />

    <textarea
      v-else-if="field.type === 'textarea'"
      :id="fieldId"
      v-model="value"
      class="cc3-stand-field__textarea"
      :name="field.key"
      :placeholder="placeholder"
      rows="3"
    />

    <Cc3InputField
      v-else
      :id="fieldId"
      v-model="value"
      :name="field.key"
      :type="inputType"
      :placeholder="placeholder"
      :autocomplete="field.autocomplete"
      :inputmode="inputMode"
      :invalid="invalid"
    />

    <Cc3StandFieldSuggest
      v-if="isListOpen"
      :items="items"
      :active-index="activeIndex"
      :status="status"
      @pick="onPick"
      @hover="onHover"
    />

    <span v-if="hint" class="cc3-stand-field__hint">{{ hint }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import Cc3InputField from '@/components/Field/Cc3InputField.vue'
import Cc3Icon from '@/components/Icon/Cc3Icon.vue'

import type { StandField } from '../config/types'
import type { AddressSuggestion } from '../suggest/types'
import { useAddressSuggest } from '../composables/useAddressSuggest'
import { useStand } from '../composables/useStand'
import Cc3StandFieldSuggest from './Cc3StandFieldSuggest.vue'

/**
 * Универсальное поле формы.
 *
 * Настоящие input/select/textarea и label с for обязательны: без них не
 * работает нативное автозаполнение браузера и на мобильном открывается
 * неправильная клавиатура. Дивы вместо полей — самая частая ошибка при
 * вёрстке по макету.
 *
 * Ни одно поле не блокируется. Подсказка подставляет значение, но человек
 * всегда может его дописать или исправить: провайдер ошибается, дом бывает
 * с литерой, индекс — не тот, а заблокированное поле в этот момент
 * превращается в тупик. Отличие autofilled от prefilled осталось только
 * в подписи: у первого под полем сказано, что значение подставится само.
 *
 * Поле типа autocomplete показывает подсказки адреса. Список и запрос
 * разнесены: запрос и выбранная строка здесь, отображение — в
 * Cc3StandFieldSuggest. Слушатели висят на обёртке, а не на самом поле:
 * Cc3InputField кладёт чужие атрибуты и обработчики на свой корневой span,
 * а focus и blur со span не всплывают — фокус терялся бы.
 *
 * Плейсхолдер приходит из конфига страны и показывает местный формат адреса.
 * Это подсказка, а не замена подписи: label остаётся на месте всегда.
 */
const props = defineProps<{
  field: StandField
  /**
   * Поле не заполнено или заполнено неверно. Решает форма, а не поле:
   * когда показывать ошибку — до первой отправки или сразу — зависит от
   * сценария, и поле не должно решать это за форму.
   */
  invalid?: boolean
  /** Текст ошибки под полем. Без него подсветка остаётся без объяснения. */
  error?: string
  /**
   * Подпись лежит внутри поля и уходит наверх, когда в поле фокус или
   * значение. Нужна комбинированной версии; у остальных подпись над полем.
   * Рамка и радиус остаются как у обычного поля.
   */
  floating?: boolean
}>()

const emit = defineEmits<{ select: [suggestion: AddressSuggestion] }>()

const value = defineModel<string>({ default: '' })

const { t } = useStand()
const { items, status, ask, reset } = useAddressSuggest()

const isFocused = ref(false)
const activeIndex = ref(-1)

const fieldId = computed(() => `stand-field-${props.field.key}`)

const isSuggest = computed(() => props.field.type === 'autocomplete')

// Плавающая подпись есть только у однострочных полей. У чипсов и
// многострочного текста подпись остаётся над полем: внутри ей нет места.
const isFloating = computed(
  () => Boolean(props.floating) && !['chips', 'textarea'].includes(props.field.type),
)

const isFilled = computed(() => value.value !== '')

// В плавающем поле нативная стрелка select убрана (см. стили) — её рисует
// своя иконка: у нативной внутренний отступ текста в каждом браузере свой, и
// значение не совпадало бы с подписью по левому краю.
const hasChevron = computed(() => isFloating.value && props.field.type === 'select')

// В плавающем поле подсказка стоит внутри селекта вместо подписи — иначе
// два текста наложились бы друг на друга.
const selectPlaceholder = computed(() => (isFloating.value ? '' : props.field.placeholder))

const isListOpen = computed(
  () => isSuggest.value && isFocused.value && (items.value.length > 0 || status.value !== 'idle'),
)

// Подпись объясняет, что значение подставится из подсказки и вводить его
// руками не обязательно. У prefilled поля объяснять нечего — оно ведёт себя
// как обычное, и подпись под ним только шумит.
const hint = computed(() => {
  if (props.invalid && props.error) {
    return props.error
  }

  return props.field.autofilled ? t('field.autofilled.hint') : ''
})

const options = computed(() => props.field.options ?? [])

// Плейсхолдер-пример (готовый адрес, ФИО, email) сбивает — похож на уже
// введённое значение. Плейсхолдер-инструкция не сбивает: «Введите улицу и
// номер дома» никто не прочитает как заполненное поле.
//
// Поэтому показываем его у телефона (там это маска ввода, и без неё
// непонятно, в каком формате набирать номер) и у строки адреса — она
// открывает форму, и по одной подписи «Найти адрес» непонятно, с чего
// начинать: с города, с улицы или с индекса.
const PLACEHOLDER_TYPES = ['phone', 'autocomplete']

const placeholder = computed(() =>
  PLACEHOLDER_TYPES.includes(props.field.type) ? props.field.placeholder : '',
)

const inputType = computed(() => {
  if (props.field.type === 'phone') return 'tel'
  if (props.field.type === 'email') return 'email'

  return 'text'
})

const inputMode = computed(() => {
  if (props.field.key === 'postal') return 'numeric'
  if (props.field.type === 'phone') return 'tel'

  return undefined
})

function onInput(event: Event) {
  if (!isSuggest.value) {
    return
  }

  activeIndex.value = -1
  ask((event.target as HTMLInputElement).value)
}

function onFocus() {
  isFocused.value = true
}

function onBlur() {
  isFocused.value = false
  activeIndex.value = -1
}

function onHover(index: number) {
  activeIndex.value = index
}

/**
 * Выбор подсказки не пишет в своё поле напрямую.
 *
 * Строка адреса и разобранные из неё дом, индекс и город должны лечь в форму
 * одним изменением: значения полей живут выше по дереву, и две записи подряд
 * в одном такте затирают друг друга — вторая читает ещё не обновлённые
 * значения. Поэтому поле только сообщает о выборе, а пишет их владелец.
 */
function onPick(suggestion: AddressSuggestion) {
  isFocused.value = false
  activeIndex.value = -1
  reset()
  emit('select', suggestion)
}

function move(step: number) {
  const total = items.value.length

  if (total === 0) {
    return
  }

  activeIndex.value = (activeIndex.value + step + total) % total
}

/**
 * Клавиатура обрабатывается одним обработчиком, а не модификаторами:
 * перехватывать Enter можно только при открытом списке, иначе поле
 * перестанет вести себя как обычное поле формы.
 */
function onKeydown(event: KeyboardEvent) {
  if (!isListOpen.value) {
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
  } else if (event.key === 'Enter') {
    const active = items.value[activeIndex.value]

    if (active) {
      event.preventDefault()
      onPick(active)
    }
  } else if (event.key === 'Escape') {
    isFocused.value = false
    activeIndex.value = -1
  }
}

const modifiers = computed(() => ({
  'cc3-stand-field--floating': isFloating.value,
  'cc3-stand-field--lifted':
    isFloating.value && (isFocused.value || isFilled.value || props.field.type === 'select'),
  'cc3-stand-field--focused': isFocused.value,
  'cc3-stand-field--invalid': props.invalid,
  'cc3-stand-field--autofilled': props.field.autofilled,
  'cc3-stand-field--prefilled': props.field.prefilled,
  'cc3-stand-field--required': props.field.required,
  'cc3-stand-field--half': props.field.half,
  [`cc3-stand-field--key--${props.field.key}`]: true,
}))
</script>

<style lang="scss">
.cc3-stand-field {
  display: flex;
  flex-direction: column;
  gap: var(--st-global-distance-space-inset-sm);

  // Точка отсчёта для выпадающего списка подсказок.
  position: relative;

  // Отступ задаётся самому полю, а не через соседей: порядок полей приходит
  // из конфига страны и непостоянен, селекторы вида :nth-child и + сломаются.
  margin-block-end: var(--st-global-distance-space-inset-xl);
  width: 100%;

  &__label {
    display: flex;
    align-items: center;
    gap: 2px;

    @include font('label-sm');

    color: var(--st-content-foreground-color-neutral-secondary);
  }

  &__required {
    @include font('label-xs');

    color: var(--st-content-foreground-color-negative-primary);
  }

  &__select,
  &__textarea {
    padding: 0 var(--st-global-distance-space-inset-md);
    width: 100%;

    font-family: inherit;

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);
    background-color: var(--st-content-background-color-neutral-primary);
    border: 2px solid var(--st-content-border-color-neutral-implicit);
    border-radius: var(--st-global-radius-sm);

    &:disabled {
      background-color: var(--st-content-background-color-neutral-subtle);
    }
  }

  &__select {
    height: 44px;
  }

  &__textarea {
    padding-top: var(--st-global-distance-space-inset-md);
    padding-bottom: var(--st-global-distance-space-inset-md);

    resize: vertical;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--st-global-distance-space-inset-md);
  }

  &__chip {
    padding: var(--st-global-distance-space-inset-sm) var(--st-global-distance-space-inset-xl);

    @include font('label-sm');

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

  &__hint {
    @include font('body-xs');

    color: var(--st-content-foreground-color-neutral-secondary);
  }

  // Подпись под невалидным полем — это текст ошибки, а не подсказка:
  // серым его никто не прочтёт.
  &--invalid &__hint {
    color: var(--st-content-foreground-color-negative-primary);
  }

  &--invalid &__select,
  &--invalid &__textarea {
    border-color: var(--st-content-foreground-color-negative-primary);
  }

  // ── Подпись внутри поля ────────────────────────────────────────────────
  // Подпись и поле стоят в одной ячейке сетки, а не накладываются через
  // position: absolute. Опущенная подпись стоит по центру поля, поднятая —
  // у верхнего края, а текст поля опускается ниже, освобождая ей место.
  &--floating {
    display: grid;
    grid-template-columns: 100%;
    gap: 0;
  }

  &--floating &__label {
    grid-area: 1 / 1;
    align-self: start;

    // 2px рамки и внутренний отступ поля: подпись начинается там же, где
    // потом начнётся введённый текст.
    margin-inline-start: calc(var(--st-global-distance-space-inset-md) + 2px);

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-secondary);
    pointer-events: none;
    transform: translateY(16px);
    transition:
      transform 0.15s ease,
      font-size 0.15s ease,
      line-height 0.15s ease;
    z-index: 1;
  }

  &--floating#{&}--lifted &__label {
    @include font('label-xs');

    color: var(--st-content-foreground-color-neutral-secondary);
    transform: translateY(6px);
  }

  &--floating .cc3-input-field {
    grid-area: 1 / 1;

    height: 52px;
    padding-top: 18px;
  }

  &--floating &__select,
  &--floating &__textarea {
    grid-area: 1 / 1;

    height: 52px;
    padding-top: 18px;
  }

  // Нативное оформление select убрано, чтобы его текст стоял там же, где у
  // input: с ним браузер добавляет свой внутренний отступ, у каждого свой, и
  // значение «New York» уезжало вправо от подписи «State». Стрелку рисует
  // иконка справа; справа оставлено место под неё.
  &--floating &__select {
    padding-inline-end: calc(var(--st-global-distance-space-inset-md) + 24px);

    appearance: none;
    text-overflow: ellipsis;
  }

  // Фокус — как у остальных полей: серая рамка и подложка, а не синий контур
  // браузера. #A0ADB7 — тот же цвет из референса, что у Cc3InputField, точного
  // токена под него нет.
  &--floating &__select:focus {
    background-color: var(--st-content-background-color-neutral-subtle);
    border-color: #a0adb7;
    outline: none;
  }

  &__chevron {
    grid-area: 1 / 1;
    place-self: center end;

    margin-inline-end: var(--st-global-distance-space-inset-md);

    color: var(--st-content-foreground-color-neutral-primary);
    pointer-events: none;
    z-index: 1;
  }

  // Подсказка-образец («+7 ___») мешала бы опущенной подписи: она
  // проявляется только вместе с подписью, когда та уже поднялась.
  &--floating:not(#{&}--lifted) .cc3-input-field__input::placeholder {
    color: transparent;
  }

  &--floating &__hint {
    grid-area: 2 / 1;

    margin-block-start: var(--st-global-distance-space-inset-sm);
  }

  &--floating .cc3-stand-field-suggest {
    // Список считает от низа поля, а оно теперь не последнее в сетке.
    inset-block-start: 52px;
  }
}
</style>
