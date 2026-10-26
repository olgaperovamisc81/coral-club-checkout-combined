<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import Cc3Icon from '@/components/Icon/Cc3Icon.vue'
import Cc3Map from '@/components/Map/Cc3Map.vue'
import Cc3MapPin from '@/components/Map/Cc3MapPin.vue'
import type { MapPoint } from '@/components/Map/mapTypes'
import { useCheckout } from '@/composables/useCheckout'
import { useStand } from '@/stand/composables/useStand'
import { reverseAddress } from '@/stand/suggest'
import type { AddressSuggestion } from '@/stand/suggest'

import Cc3CombinedSearchDialog from './Cc3CombinedSearchDialog.vue'

/**
 * Окно выбора адреса на карте. Метка стоит неподвижно в середине, под ней
 * двигают карту — так выбирают адрес в Озоне и Яндексе, — а адрес под меткой
 * определяется обратным геокодированием. Строка поиска внизу — не поле, а
 * вход в отдельное окно поиска: подсказкам там хватает места.
 */
const props = defineProps<{
  /** Строка адреса из формы — показывается в строке поиска. */
  query: string
  /** Где открыть карту, если адрес уже выбран на ней раньше. */
  point?: MapPoint
}>()

const emit = defineEmits<{
  close: []
  confirm: [payload: { suggestion?: AddressSuggestion; query: string }]
}>()

const { t, country } = useStand()
const { mapCenter } = useCheckout()

const text = computed(() => ({
  title: t('address.title'),
  close: t('common.close'),
  placeholder: t('concept.common.findAddress'),
  continue: t('common.continue'),
}))

const label = ref(props.query)
const suggestion = ref<AddressSuggestion>()
const point = ref<MapPoint | undefined>(props.point)
const isSearchOpen = ref(false)

const center = computed<MapPoint>(() => point.value ?? mapCenter.value)

let reverseController: AbortController | undefined

/**
 * Тычок или сдвиг карты — обратное геокодирование. Метка стоит на месте,
 * адрес подставляется, когда придёт ответ: ждать ответа, чтобы показать
 * карту, значит показать залипшую карту.
 */
async function onMapMove(next: MapPoint) {
  point.value = next

  reverseController?.abort()
  reverseController = new AbortController()

  const found = await reverseAddress(next, country.value, reverseController.signal)

  if (found) {
    suggestion.value = found
    label.value = found.label
  }
}

function onPick(picked: AddressSuggestion) {
  suggestion.value = picked
  label.value = picked.label

  if (picked.lat !== undefined && picked.lng !== undefined) {
    point.value = { lat: picked.lat, lng: picked.lng }
  }

  isSearchOpen.value = false
}

function onSubmitQuery(query: string) {
  suggestion.value = undefined
  label.value = query
  isSearchOpen.value = false
}

function confirm() {
  emit('confirm', { suggestion: suggestion.value, query: label.value })
}

/**
 * Высота карты — всё, что осталось от экрана. Числом, а не стилем: Cc3Map
 * считает по ней сетку тайлов, и у растянутой стилями карты низ остался бы
 * пустым.
 */
const MAP_FALLBACK_HEIGHT = 380

const mapBoxRef = ref<HTMLElement>()
const mapHeight = ref(MAP_FALLBACK_HEIGHT)

let observer: ResizeObserver | undefined

onMounted(() => {
  const element = mapBoxRef.value

  if (!element) {
    return
  }

  const measure = () => {
    const height = Math.round(element.getBoundingClientRect().height)

    if (height > 0) {
      mapHeight.value = height
    }
  }

  measure()

  observer = new ResizeObserver(measure)
  observer.observe(element)
})

/**
 * Пока окно открыто, страница под ним не прокручивается — иначе палец,
 * ведущий карту, возит чекаут за ней.
 */
let bodyOverflow = ''

onMounted(() => {
  bodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  observer?.disconnect()
  reverseController?.abort()
  document.body.style.overflow = bodyOverflow
})

watch(isSearchOpen, (open) => {
  // Закрытый поиск возвращает фокус окну, иначе Escape не дойдёт до него.
  if (!open) {
    document.querySelector<HTMLElement>('.cc3-combined-map-dialog')?.focus()
  }
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !isSearchOpen.value) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="cc3-combined-map-dialog"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <div class="cc3-combined-map-dialog__header">
        <h2 class="cc3-combined-map-dialog__title">{{ text.title }}</h2>

        <button
          type="button"
          class="cc3-combined-map-dialog__close"
          :aria-label="text.close"
          @click="emit('close')"
        >
          <Cc3Icon name="x-md" :size="24" />
        </button>
      </div>

      <div ref="mapBoxRef" class="cc3-combined-map-dialog__map">
        <Cc3Map
          :center="center"
          :zoom="14"
          :markers="[]"
          :height="mapHeight"
          @select="onMapMove"
          @move="onMapMove"
        />

        <span class="cc3-combined-map-dialog__pin">
          <Cc3MapPin variant="positive" icon="delivery-truck" />
        </span>
      </div>

      <div class="cc3-combined-map-dialog__controls">
        <button
          type="button"
          class="cc3-combined-map-dialog__search"
          @click="isSearchOpen = true"
        >
          <Cc3Icon name="search-md" :size="20" />

          <span
            class="cc3-combined-map-dialog__search-text"
            :class="{ 'cc3-combined-map-dialog__search-text--empty': !label }"
          >
            {{ label || text.placeholder }}
          </span>
        </button>

        <button type="button" class="cc3-combined-map-dialog__continue" @click="confirm">
          {{ text.continue }}
        </button>
      </div>
    </div>

    <Cc3CombinedSearchDialog
      v-if="isSearchOpen"
      :initial-query="label"
      @close="isSearchOpen = false"
      @pick="onPick"
      @submit="onSubmitQuery"
    />
  </Teleport>
</template>

<style lang="scss">
.cc3-combined-map-dialog {
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
  outline: none;

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

  // Контейнер растягивается на весь остаток экрана, карта лежит в нём
  // абсолютно: иначе её высота влияла бы на высоту контейнера, а та
  // снова на неё.
  &__map {
    position: relative;

    flex: 1;

    min-height: 0;
    overflow: hidden;

    .cc3-map {
      position: absolute;
      inset: 0;

      border: none;
      border-radius: 0;
    }
  }

  // Метка накладкой по центру, а не маркером карты: маркер уезжал бы вместе
  // с тайлами. Сквозная для событий, иначе под ней нельзя было бы вести карту.
  &__pin {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 1;

    pointer-events: none;
    transform: translate(-50%, -100%);
  }

  &__controls {
    display: flex;
    flex-direction: column;
    gap: var(--st-global-distance-space-inset-xl);

    padding: var(--st-global-distance-space-inset-xl) var(--st-global-distance-space-inset-2xl)
      var(--st-global-distance-space-inset-2xl);
  }

  &__search {
    display: flex;
    align-items: center;
    gap: var(--st-global-distance-space-stack-sm);

    padding: 0 var(--st-global-distance-space-inset-md);
    width: 100%;
    height: 44px;

    font-family: inherit;
    text-align: start;

    color: var(--st-content-foreground-color-neutral-primary);
    background-color: var(--st-content-background-color-neutral-primary);
    border: 2px solid var(--st-content-border-color-neutral-implicit);
    border-radius: var(--st-global-radius-sm);
    cursor: pointer;
  }

  &__search-text {
    flex: 1;

    min-width: 0;

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &--empty {
      color: var(--st-content-foreground-color-neutral-tetriary);
    }
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
}
</style>
