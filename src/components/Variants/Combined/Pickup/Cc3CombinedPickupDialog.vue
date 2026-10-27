<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import Cc3Icon from '@/components/Icon/Cc3Icon.vue'
import type { MapPoint } from '@/components/Map/mapTypes'
import { useCheckout, type PickupProvider } from '@/composables/useCheckout'
import { useStand } from '@/stand/composables/useStand'
import { useStandProfile } from '@/stand/composables/useStandProfile'
import { pickupCardLines } from '@/stand/config/pickupCard'
import type { FieldKey } from '@/stand/config/types'
import type { AddressSuggestion } from '@/stand/suggest'

import Cc3ModalConfirmDialog from '../../Modal/Cc3ModalConfirmDialog.vue'
import type { DeliveryProfile } from '../../Modal/deliveryProfile'
import Cc3CombinedSearchSheet from '../Cc3CombinedSearchSheet.vue'
import Cc3CombinedPickupDetail from './Cc3CombinedPickupDetail.vue'
import Cc3CombinedPickupFilters from './Cc3CombinedPickupFilters.vue'
import Cc3CombinedPickupList from './Cc3CombinedPickupList.vue'
import Cc3CombinedPickupMap from './Cc3CombinedPickupMap.vue'
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
 * «Привезти сюда» ведёт не на страницу, а на шаг уточнения: данные пункта и
 * получатель. Пункт возвращается на страницу только после него. Окно,
 * открытое на правку сохранённого пункта, начинается сразу с этого шага.
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
  pickupProviderLabels,
  mapCenter,
} = useCheckout()
const { t, country } = useStand()
const { recipientValues: profileRecipient } = useStandProfile()

const text = computed(() => ({
  title: props.editProfile ? t('combined.editPickupTitle') : t('pickup.title'),
  close: t('common.close'),
  bringHere: t('combined.bringHere'),
  continue: t('common.continue'),
  save: t('combined.saveChanges'),
  remove: t('common.delete'),
}))

type Step = 'picker' | 'detail'
type View = 'map' | 'list'

const step = ref<Step>(props.editProfile ? 'detail' : 'picker')
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

/**
 * Службы-фильтры. Чипса «Все» нет: изначально нажаты все службы, нажатие на
 * чипс выключает его, а когда нажаты все — это и есть «все». Общее состояние
 * хранит пустой список как «все службы», поэтому здесь он разворачивается в
 * полный набор и сворачивается обратно.
 */
const allProviderIds = computed(() => Object.keys(pickupProviderLabels.value) as PickupProvider[])

const selectedProviders = computed<PickupProvider[]>(() =>
  pickupProviders.value.length === 0 ? allProviderIds.value : pickupProviders.value,
)

const providerFilters = computed(() =>
  allProviderIds.value.map((id) => ({
    id,
    label: pickupProviderLabels.value[id],
    active: selectedProviders.value.includes(id),
  })),
)

function onFilter(id: string) {
  const provider = id as PickupProvider
  const current = selectedProviders.value

  // Последнюю включённую службу не выключить: пустая карта без объяснения
  // читается как поломка.
  if (current.length === 1 && current[0] === provider) {
    return
  }

  const next = current.includes(provider)
    ? current.filter((item) => item !== provider)
    : [...current, provider]

  pickupProviders.value = next.length === allProviderIds.value.length ? [] : next
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
 * Новый пункт открывается с получателем из профиля, сохранённый — со своими
 * данными. Имя разбирается на части, потому что состав полей зависит от
 * страны: в СНГ это одно поле, в Европе и США — имя и фамилия отдельно.
 */
function seedRecipient(): Partial<Record<FieldKey, string>> {
  const saved = props.editProfile

  if (!saved) {
    return { ...profileRecipient.value }
  }

  const [firstName = '', ...rest] = saved.name.trim().split(/\s+/)

  return {
    recipientName: saved.name,
    recipientFirstName: firstName,
    recipientLastName: rest.join(' '),
    recipientPhone: saved.phone,
    recipientEmail: saved.email,
  }
}

const recipientValues = ref<Partial<Record<FieldKey, string>>>(seedRecipient())

// Смена страны — другой формат телефона и другое имя по умолчанию.
watch(country, () => {
  recipientValues.value = seedRecipient()
})

const recipientName = computed(
  () =>
    recipientValues.value.recipientName?.trim() ||
    [recipientValues.value.recipientFirstName, recipientValues.value.recipientLastName]
      .filter(Boolean)
      .join(' '),
)

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

const isSheetVisible = computed(
  () => step.value === 'picker' && view.value === 'map' && Boolean(sheet.value),
)

type PickupDetailView = {
  title: string
  address: string
  priceLabel: string
  storage?: string
  directions?: string
  phone?: string
}

/**
 * Данные для шага уточнения. Правка из адресной книги не знает, какому пункту
 * из списка соответствует сохранённая карточка (id пункта в профиле не
 * хранится), поэтому до выбора нового пункта берёт данные прямо из неё — без
 * часов работы и «как добраться».
 */
const detailView = computed<PickupDetailView | undefined>(() => {
  const point = activePoint.value

  if (point) {
    const lines = pickupCardLines(point.provider, t)

    return {
      title: pickupProviderLabels.value[point.provider],
      address: point.address,
      priceLabel: metaOf(point),
      storage: lines.storage,
      directions: lines.directions,
      phone: point.phone,
    }
  }

  if (props.editProfile) {
    return {
      title: props.editProfile.typeLabel,
      address: props.editProfile.addressLine,
      priceLabel: props.editProfile.priceLabel,
    }
  }

  return undefined
})

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

function bringHere() {
  step.value = 'detail'
}

// Единственный путь назад с шага уточнения — ссылка «На карте» у заголовка.
// Возвращает карту, а не список, на котором случайно остановились.
function backToPicker() {
  step.value = 'picker'
  view.value = 'map'
}

function confirm() {
  const detail = detailView.value

  if (!detail) {
    return
  }

  emit('confirm', {
    id: props.editProfile?.id ?? `profile-${Date.now()}`,
    method: 'pickup',
    typeLabel: detail.title,
    name: recipientName.value,
    addressLine: detail.address,
    priceLabel: detail.priceLabel,
    phone: recipientValues.value.recipientPhone ?? '',
    email: recipientValues.value.recipientEmail ?? '',
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

      <div
        class="cc3-combined-pickup-dialog__body"
        :class="{ 'cc3-combined-pickup-dialog__body--scroll': step === 'detail' }"
      >
        <template v-if="step === 'picker'">
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

              <Cc3CombinedPickupFilters floating :filters="providerFilters" @select="onFilter" />
            </div>
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
            :recipient="recipientName"
            :meta="sheet.meta"
            @confirm="bringHere"
          />

          <template v-if="isSearchOpen">
            <div class="cc3-combined-pickup-dialog__dim" @click="isSearchOpen = false" />

            <Cc3CombinedSearchSheet :initial-query="address" @pick="onPickSuggestion" />
          </template>
        </template>

        <Cc3CombinedPickupDetail
          v-else-if="detailView"
          v-model="recipientValues"
          :detail="detailView"
          @back="backToPicker"
        />
      </div>

      <div v-if="step === 'picker' && view === 'list'" class="cc3-combined-pickup-dialog__footer">
        <button
          type="button"
          class="cc3-combined-pickup-dialog__confirm"
          :disabled="!activePoint"
          @click="bringHere"
        >
          {{ text.bringHere }}
        </button>
      </div>

      <div v-else-if="step === 'detail'" class="cc3-combined-pickup-dialog__footer">
        <button type="button" class="cc3-combined-pickup-dialog__confirm" @click="confirm">
          {{ editProfile ? text.save : text.continue }}
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

    // По бокам место под крестик: длинный заголовок не должен наезжать на него.
    padding: var(--st-global-distance-space-inset-2xl)
      calc(var(--st-global-distance-space-inset-2xl) + 24px + var(--st-global-distance-space-inset-md));

    background-color: var(--st-content-background-color-default-solid-normal);
    border-bottom: 1px solid var(--st-content-border-color-neutral-onsubtle);
  }

  &__title {
    margin: 0;

    text-align: center;

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

    // Шаг уточнения длиннее экрана: прокручивается тело, а кнопка внизу остаётся.
    &--scroll {
      overflow-y: auto;
      overscroll-behavior: contain;
    }
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
