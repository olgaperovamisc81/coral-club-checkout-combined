<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import Cc3Icon from '@/components/Icon/Cc3Icon.vue'
import type { MapPoint } from '@/components/Map/mapTypes'
import { useCheckout, type PickupProvider } from '@/composables/useCheckout'
import { useStand } from '@/stand/composables/useStand'
import { useStandProfile } from '@/stand/composables/useStandProfile'
import { pickupCardLines } from '@/stand/config/pickupCard'
import type { AddressSuggestion } from '@/stand/suggest'

import Cc3ModalConfirmDialog from '../../Modal/Cc3ModalConfirmDialog.vue'
import type { DeliveryProfile } from '../../Modal/deliveryProfile'
import Cc3CombinedPickupFilters from './Cc3CombinedPickupFilters.vue'
import Cc3CombinedPickupList from './Cc3CombinedPickupList.vue'
import Cc3CombinedPickupMap from './Cc3CombinedPickupMap.vue'
import Cc3CombinedPickupSearch from './Cc3CombinedPickupSearch.vue'
import Cc3CombinedPickupSheet from './Cc3CombinedPickupSheet.vue'
import Cc3CombinedPickupSwitch from './Cc3CombinedPickupSwitch.vue'

/**
 * Окно выбора пункта самовывоза комбинированной версии.
 *
 * Сверху «Карта» и «Список». На карте метки всех пунктов: нажатие на метку
 * поднимает шторку с данными пункта и кнопкой «Привезти сюда». В списке те же
 * пункты в столбик, выбранный подтверждается кнопкой внизу. Поиск адреса —
 * шторка с подсказками: выбранный адрес двигает карту и ставит ближайшие
 * пункты в списке первыми.
 *
 * Получателя здесь не спрашивают: им становится покупатель из профиля, как
 * у курьера. «Привезти сюда» сразу возвращает пункт на страницу.
 */
const props = defineProps<{
  editProfile?: DeliveryProfile
}>()

const emit = defineEmits<{
  close: []
  confirm: [profile: DeliveryProfile]
  delete: [id: string]
}>()

const {
  pickupPointsFormat,
  pickupProviders,
  togglePickupProvider,
  pickupProviderLabels,
  mapCenter,
} = useCheckout()
const { t, country } = useStand()
const { recipientValues: profileRecipient } = useStandProfile()

const text = computed(() => ({
  title: t('pickup.title'),
  close: t('common.close'),
  all: t('common.all'),
  confirm: t('combined.bringHere'),
  remove: t('common.delete'),
}))

type View = 'map' | 'list'

const view = ref<View>('map')
const selectedId = ref<string>()
const isSearchOpen = ref(false)
const isDeleteConfirmOpen = ref(false)
const address = ref('')
const focusPoint = ref<MapPoint>()
const mapKey = ref(0)

// ─── Пункты ──────────────────────────────────────────────────────────────────

/** Расстояние между точками в километрах — для порядка «ближайшие первыми». */
function distanceKm(from: MapPoint, to: MapPoint) {
  const rad = Math.PI / 180
  const dLat = (to.lat - from.lat) * rad
  const dLng = (to.lng - from.lng) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * rad) * Math.cos(to.lat * rad) * Math.sin(dLng / 2) ** 2

  return 12742 * Math.asin(Math.sqrt(a))
}

const points = computed(() => {
  const focus = focusPoint.value
  const list = [...pickupPointsFormat.value]

  if (focus) {
    list.sort((a, b) => distanceKm(focus, a) - distanceKm(focus, b))
  }

  return list
})

// Выбранный пункт, выпавший из списка после смены фильтра, больше не выбран.
const activePoint = computed(() => points.value.find((point) => point.id === selectedId.value))

const providerFilters = computed(() => [
  { id: 'all', label: text.value.all, active: pickupProviders.value.length === 0 },
  ...Object.entries(pickupProviderLabels.value).map(([id, label]) => ({
    id,
    label,
    active: pickupProviders.value.includes(id as PickupProvider),
  })),
])

function onFilter(id: string) {
  if (id === 'all') {
    pickupProviders.value = []

    return
  }

  togglePickupProvider(id as PickupProvider)
}

/** Срок и цена в одной строке — так их читают и в списке, и в шторке. */
function metaOf(point: { provider: PickupProvider; priceFormat: string }) {
  return `${pickupCardLines(point.provider, t).eta} · ${point.priceFormat}`
}

const listItems = computed(() =>
  points.value.map((point) => ({
    id: point.id,
    name: point.name,
    address: point.address,
    meta: metaOf(point),
  })),
)

// Короткая подпись внутри метки на карте — названия служб, не переводятся.
const pinLabels: Record<PickupProvider, string> = {
  office: 'C',
  cdek: 'CDEK',
  fivepost: '5Post',
  kazpost: 'KZPost',
  dhl: 'DHL',
  inpost: 'InPost',
  zasilkovna: 'Zás.',
  usps: 'USPS',
}

const markers = computed(() =>
  points.value.map((point) => ({
    id: point.id,
    lat: point.lat,
    lng: point.lng,
    pinVariant: point.provider === 'office' ? ('coral' as const) : ('cdek' as const),
    pinLabel: pinLabels[point.provider],
  })),
)

const mapView = computed(() => ({
  center: focusPoint.value ?? mapCenter.value,
  zoom: focusPoint.value ? 11 : 9,
}))

// ─── Получатель ──────────────────────────────────────────────────────────────

/**
 * Новый пункт берёт получателем покупателя из профиля, сохранённый — тех,
 * кто в нём уже указан: пункт при правке меняется, а получатель остаётся.
 */
const recipient = computed(() => {
  const saved = props.editProfile

  if (saved) {
    return { name: saved.name, phone: saved.phone, email: saved.email }
  }

  const values = profileRecipient.value

  return {
    name:
      values.recipientName?.trim() ||
      [values.recipientFirstName, values.recipientLastName].filter(Boolean).join(' '),
    phone: values.recipientPhone ?? '',
    email: values.recipientEmail ?? '',
  }
})

const sheet = computed(() => {
  const point = activePoint.value

  if (!point) {
    return undefined
  }

  return {
    title: pickupProviderLabels.value[point.provider],
    address: point.address,
    meta: metaOf(point),
  }
})

const isSheetVisible = computed(() => view.value === 'map' && Boolean(sheet.value))

// ─── Действия ────────────────────────────────────────────────────────────────

function onPickSuggestion(suggestion: AddressSuggestion) {
  address.value = suggestion.streetLine || suggestion.street || suggestion.label
  isSearchOpen.value = false
  selectedId.value = undefined

  if (suggestion.lat !== undefined && suggestion.lng !== undefined) {
    focusPoint.value = { lat: suggestion.lat, lng: suggestion.lng }
    // Карта запоминает центр и масштаб только при создании — новый ключ
    // пересоздаёт её уже над найденным адресом.
    mapKey.value += 1
  }
}

function confirm() {
  const point = activePoint.value

  if (!point) {
    return
  }

  emit('confirm', {
    id: props.editProfile?.id ?? `profile-${Date.now()}`,
    method: 'pickup',
    typeLabel: pickupProviderLabels.value[point.provider],
    name: recipient.value.name,
    addressLine: point.address,
    priceLabel: metaOf(point),
    phone: recipient.value.phone,
    email: recipient.value.email,
  })
}

function deleteProfile() {
  isDeleteConfirmOpen.value = false

  if (props.editProfile) {
    emit('delete', props.editProfile.id)
  }
}

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
  document.body.style.overflow = bodyOverflow
})

// Смена страны меняет и набор пунктов — выбранного может больше не быть.
const countryKey = computed(() => country.value)

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') {
    return
  }

  if (isSearchOpen.value) {
    isSearchOpen.value = false
  } else {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      :key="countryKey"
      class="cc3-combined-pickup-dialog"
      role="dialog"
      aria-modal="true"
      @keydown="onKeydown"
    >
      <div class="cc3-combined-pickup-dialog__header">
        <h2 class="cc3-combined-pickup-dialog__title">{{ text.title }}</h2>

        <button
          type="button"
          class="cc3-combined-pickup-dialog__close"
          :aria-label="text.close"
          @click="emit('close')"
        >
          <Cc3Icon name="x-md" :size="24" />
        </button>
      </div>

      <div class="cc3-combined-pickup-dialog__body">
        <template v-if="view === 'map'">
          <div class="cc3-combined-pickup-dialog__stage">
            <Cc3CombinedPickupMap
              :key="mapKey"
              :markers="markers"
              :selected-id="selectedId"
              :center="mapView.center"
              :zoom="mapView.zoom"
              @pick="selectedId = $event"
              @deselect="selectedId = undefined"
            />

            <Cc3CombinedPickupSwitch
              class="cc3-combined-pickup-dialog__switch cc3-combined-pickup-dialog__switch--floating"
              :view="view"
              searchable
              @select="view = $event"
              @search="isSearchOpen = true"
            />
          </div>

          <Cc3CombinedPickupFilters :filters="providerFilters" @select="onFilter" />
        </template>

        <template v-else>
          <Cc3CombinedPickupSwitch
            class="cc3-combined-pickup-dialog__switch"
            :view="view"
            @select="view = $event"
          />

          <Cc3CombinedPickupList
            :points="listItems"
            :filters="providerFilters"
            :selected-id="selectedId"
            :address="address"
            @select="selectedId = $event"
            @filter="onFilter"
            @search="isSearchOpen = true"
          />
        </template>

        <Cc3CombinedPickupSheet
          v-if="isSheetVisible && sheet"
          :title="sheet.title"
          :address="sheet.address"
          :recipient="recipient.name"
          :meta="sheet.meta"
          :deletable="Boolean(editProfile)"
          @confirm="confirm"
          @delete="isDeleteConfirmOpen = true"
        />

        <template v-if="isSearchOpen">
          <div class="cc3-combined-pickup-dialog__dim" @click="isSearchOpen = false" />

          <Cc3CombinedPickupSearch :initial-query="address" @pick="onPickSuggestion" />
        </template>
      </div>

      <div v-if="view === 'list'" class="cc3-combined-pickup-dialog__footer">
        <button
          type="button"
          class="cc3-combined-pickup-dialog__confirm"
          :disabled="!activePoint"
          @click="confirm"
        >
          {{ text.confirm }}
        </button>

        <button
          v-if="editProfile"
          type="button"
          class="cc3-combined-pickup-dialog__delete"
          @click="isDeleteConfirmOpen = true"
        >
          {{ text.remove }}
        </button>
      </div>
    </div>
  </Teleport>

  <Cc3ModalConfirmDialog
    v-if="isDeleteConfirmOpen"
    message="Do you want to delete this address?"
    @confirm="deleteProfile"
    @cancel="isDeleteConfirmOpen = false"
  />
</template>

<style lang="scss">
.cc3-combined-pickup-dialog {
  // Teleport выносит окно в body, вне .cc3-combined-checkout — цветовая схема
  // и токены не наследуются, повторяем объявления.
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
    z-index: 4;

    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;

    padding: var(--st-global-distance-space-inset-2xl);

    background-color: var(--st-content-background-color-default-solid-normal);
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

  // Тело — граница для карты и шторок: они позиционируются внутри него.
  &__body {
    position: relative;
    z-index: 0;

    display: flex;
    flex: 1;
    flex-direction: column;

    min-height: 0;

    overflow: hidden;
  }

  // Карта забирает всё, что осталось над рядом фильтров. Это граница для
  // самой карты и для ряда «Карта / Список», который плывёт поверх неё.
  &__stage {
    position: relative;
    flex: 1;

    min-height: 0;
  }

  // В списке ряд «Карта / Список» стоит обычной строкой над полем адреса.
  &__switch {
    flex-shrink: 0;

    &--floating {
      position: absolute;
      inset-block-start: 0;
      inset-inline: 0;
      z-index: 2;
    }
  }

  // Затемнение под шторкой поиска; нажатие на него шторку закрывает.
  &__dim {
    position: absolute;
    inset: 0;
    z-index: 2;

    background-color: var(--st-content-background-color-neutral-mute);
  }

  &__footer {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    gap: var(--st-global-distance-space-inset-md);

    padding: var(--st-global-distance-space-inset-2xl);
  }

  &__confirm,
  &__delete {
    display: flex;
    align-items: center;
    justify-content: center;

    padding: var(--st-global-distance-space-inset-xl);
    width: 100%;

    font-family: inherit;

    @include font('label-md');

    border: none;
    border-radius: var(--st-global-radius-pill);
    cursor: pointer;
  }

  &__confirm {
    color: var(--st-action-foreground-color-onprimary-normal);
    background-color: var(--st-action-background-color-positive-normal);

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__delete {
    color: var(--st-action-foreground-color-neutral-normal);
    background: none;
  }
}
</style>
