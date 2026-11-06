<template>
  <div class="cc3-stand-field-suggest">
    <ul v-if="items.length > 0" class="cc3-stand-field-suggest__list" role="listbox">
      <li v-for="(item, index) in items" :key="item.id" class="cc3-stand-field-suggest__item">
        <button
          type="button"
          class="cc3-stand-field-suggest__option"
          :class="{ 'cc3-stand-field-suggest__option--active': index === activeIndex }"
          role="option"
          :aria-selected="index === activeIndex"
          @mousedown.prevent="emit('pick', item)"
          @mouseenter="emit('hover', index)"
        >
          {{ item.label }}
        </button>
      </li>
    </ul>

    <p v-if="note" class="cc3-stand-field-suggest__note">
      <template v-if="noteParts">
        {{ noteParts.before
        }}<button
          type="button"
          class="cc3-stand-field-suggest__manual"
          @mousedown.prevent="emit('manual')"
        >
          {{ noteParts.link }}
        </button>{{ noteParts.after }}
      </template>

      <template v-else>{{ note }}</template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AddressSuggestion, SuggestStatus } from '../suggest/types'
import { useStand } from '../composables/useStand'

/**
 * Выпадающий список подсказок — только отображение.
 *
 * Запрос, отмена и выбранная строка живут в поле: список не должен знать
 * ни про провайдера, ни про клавиатуру. Выбор мышью ловится на mousedown,
 * а не на click: click приходит после blur, поле к этому моменту уже
 * закрыло список и выбор терялся бы.
 */
const props = defineProps<{
  items: AddressSuggestion[]
  activeIndex: number
  status: SuggestStatus
  /**
   * Слово «вручную» в сообщении «ничего не найдено / сервис не ответил»
   * становится кнопкой. Нужно версии, у которой есть режим ручного ввода;
   * у остальных сообщение остаётся обычным текстом.
   */
  manual?: boolean
}>()

const emit = defineEmits<{
  pick: [suggestion: AddressSuggestion]
  hover: [index: number]
  manual: []
}>()

const { t } = useStand()

// «Сервис ничего не нашёл» и «сервис не ответил» подписаны по-разному: в
// первом случае адрес стоит перепроверить, во втором — подсказок не будет.
const note = computed(() => {
  if (props.status === 'loading') return t('suggest.loading')
  if (props.status === 'empty') return t('suggest.empty')
  // Сервис не ответил — это не «ничего не нашлось»: человеку нужно знать, что
  // повторять запрос бесполезно, и выход один — ввести адрес руками.
  if (props.status === 'error') return t('suggest.error')

  return ''
})

// Сообщение разбирается по слову из словаря: оно стоит в разных местах фразы
// (по-немецки — перед «eingeben»), поэтому «до / ссылка / после», а не «текст + слово».
const noteParts = computed(() => {
  const isManualNote = props.status === 'empty' || props.status === 'error'

  if (!props.manual || !isManualNote) {
    return undefined
  }

  const word = t('suggest.manualWord')
  const index = note.value.indexOf(word)

  if (index === -1) {
    return undefined
  }

  return {
    before: note.value.slice(0, index),
    link: word,
    after: note.value.slice(index + word.length),
  }
})
</script>

<style lang="scss">
.cc3-stand-field-suggest {
  // Список — перекрытие над формой, а не элемент раскладки: иначе поля
  // ниже прыгают при каждом нажатии клавиши.
  position: absolute;
  inset-block-start: 100%;
  inset-inline: 0;
  z-index: 4;

  width: 100%;

  &__list {
    margin: 0;
    padding: 0;

    // Восемь подсказок на коротком экране не помещаются: список
    // прокручивается внутри себя, а не уезжает за край. По горизонтали
    // по-прежнему hidden — им скругление обрезает углы крайних строк.
    max-height: 40dvh;
    width: 100%;

    list-style: none;
    background-color: var(--st-content-background-color-neutral-primary);
    border-color: var(--st-action-border-color-neutral-subtle-normal);
    border-style: solid;
    border-width: 1px;
    border-radius: var(--st-global-radius-md);
    overflow: hidden auto;
  }

  &__option {
    display: block;

    padding: var(--st-global-distance-space-inset-md);
    width: 100%;

    text-align: start;
    color: var(--st-content-foreground-color-neutral-primary);
    background-color: transparent;
    border: none;
    cursor: pointer;

    &--active {
      background-color: var(--st-content-background-color-neutral-secondary);
    }
  }

  // «Вручную» — кнопка внутри текста: подчёркнутая, цвет ссылок версии.
  &__manual {
    padding: 0;

    font: inherit;

    color: var(--st-action-foreground-color-positive-normal);
    text-decoration: underline;
    background: none;
    border: none;
    cursor: pointer;
  }

  // Подпись лежит на той же подложке, что и список. Раньше она появлялась
  // только вместе с подсказками и вставала на их фон; теперь при отказе
  // сервиса список пуст, и без своей подложки прозрачная строка легла
  // поверх полей формы.
  &__note {
    margin: var(--st-global-distance-space-inset-xs) 0 0;

    padding: var(--st-global-distance-space-inset-md);

    color: var(--st-content-foreground-color-neutral-tetriary);
    background-color: var(--st-content-background-color-neutral-primary);
    border-color: var(--st-action-border-color-neutral-subtle-normal);
    border-style: solid;
    border-width: 1px;
    border-radius: var(--st-global-radius-md);
  }
}
</style>
