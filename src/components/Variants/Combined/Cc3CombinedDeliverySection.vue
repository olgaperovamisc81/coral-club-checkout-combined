<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import Cc3Icon from '@/components/Icon/Cc3Icon.vue'
import { useAddressGuard } from '@/composables/useAddressGuard'
import { useCheckout } from '@/composables/useCheckout'
import {
  composeAddressExtras,
  joinAddressCard,
  selectedAddressCard,
} from '@/stand/config/addressLine'
import { useStand } from '@/stand/composables/useStand'

import Cc3ModalDeliveryMethodSwitch from '../Modal/Cc3ModalDeliveryMethodSwitch.vue'
import type { DeliveryProfile, DeliveryProfileMethod } from '../Modal/deliveryProfile'
import Cc3CombinedAddressBook from './Cc3CombinedAddressBook.vue'
import Cc3CombinedAddressEditDialog from './Cc3CombinedAddressEditDialog.vue'
import Cc3CombinedAddressForm from './Cc3CombinedAddressForm.vue'
import Cc3CombinedPickupDialog from './Pickup/Cc3CombinedPickupDialog.vue'

/**
 * Блок доставки комбинированной версии.
 *
 * Над блоком всегда стоит свитчер «Курьер / Самовывоз»: пока он есть,
 * человек видит, что способ можно сменить. Ниже — либо форма адреса прямо
 * на странице, либо собранная карточка с кнопкой «Изменить». «Изменить»
 * открывает адресную книгу окном, а не блоком в теле страницы. Выбор адреса
 * на карте и поиск — тоже окна, их открывает форма.
 *
 * Нажатие на другой способ ведёт на последний выбранный адрес этого способа,
 * а если его нет — на путь заполнения: форма для курьера, карта для
 * самовывоза.
 */
const emit = defineEmits<{
  state: [payload: { method: DeliveryProfileMethod; profile?: DeliveryProfile }]
}>()

const { savedAddressBookEntries, formatMoneyRounded } = useCheckout()
const { country, user, t } = useStand()

function toProfiles(): DeliveryProfile[] {
  return savedAddressBookEntries.value.map((entry) => ({
    id: entry.id,
    method: entry.method,
    typeLabel:
      entry.method === 'courier' ? t('concept.delivery.method.label') : entry.methodLabel,
    fields: entry.fields,
    name: entry.fullName,
    // В книге адрес стоит одной строкой — список выбирают, а не читают как
    // конверт. Но квартира в нём должна быть: книга собирает её из полей,
    // чтобы не расходиться с карточкой в чекауте.
    addressLine: joinAddressCard(
      selectedAddressCard(country.value, entry.fields, entry.addressLine, t),
    ),
    priceLabel: `${t('delivery.eta')}, ${
      entry.price > 0 ? formatMoneyRounded(entry.price) : t('delivery.free')
    }`,
    phone: entry.phone,
    email: entry.email,
  }))
}

const text = computed(() => ({
  change: t('common.change'),
  addressTitle: t('address.title'),
  courierTab: t('concept.delivery.courier.title'),
  pickupTab: t('concept.delivery.pickup.action'),
  hours: t('pickup.hours'),
  hoursWeekday: t('pickup.hours.weekday'),
  hoursWeekend: t('pickup.hours.weekend'),
}))

type Mode = 'summary' | 'form'

const entries = ref<DeliveryProfile[]>(toProfiles())
const selectedEntryId = ref<string | undefined>(entries.value[0]?.id)
const editingEntryId = ref<string>()
const mode = ref<Mode>(selectedEntryId.value ? 'summary' : 'form')
const isBookOpen = ref(false)
const isPickupDialogOpen = ref(false)
const isEditDialogOpen = ref(false)
const lastSelectedIds = ref<Partial<Record<DeliveryProfileMethod, string>>>({})
const sectionRef = ref<HTMLElement>()

/**
 * Форма пересоздаётся при каждом входе в неё: она заполняется один раз,
 * при создании, и без нового ключа правка другого адреса показывала бы поля
 * предыдущего.
 */
const formKey = ref(0)

/** Что сейчас в форме и хватает ли в ней полей. */
const draft = ref<{ profile?: DeliveryProfile; complete: boolean }>({ complete: false })

watch([country, user], () => {
  entries.value = toProfiles()
  selectedEntryId.value = entries.value[0]?.id
  editingEntryId.value = undefined
  isBookOpen.value = false
  isPickupDialogOpen.value = false
  isEditDialogOpen.value = false
  lastSelectedIds.value = {}
  draft.value = { complete: false }
  formKey.value += 1
  mode.value = selectedEntryId.value ? 'summary' : 'form'
})

const selectedEntry = computed(() =>
  entries.value.find((entry) => entry.id === selectedEntryId.value),
)

const editingEntry = computed(() =>
  entries.value.find((entry) => entry.id === editingEntryId.value),
)

/** Активный способ — у формы курьер, у карточки способ выбранного адреса. */
const activeMethod = computed<DeliveryProfileMethod>(() =>
  mode.value === 'form' ? 'courier' : (selectedEntry.value?.method ?? 'courier'),
)

/**
 * Адрес, который снаружи считается выбранным. У карточки это она сама, у
 * формы — введённое, но только когда обязательные поля заполнены: пока их
 * не хватает, снаружи адреса нет, и вместо способов доставки стоит плашка.
 */
const currentProfile = computed(() =>
  mode.value === 'summary'
    ? selectedEntry.value
    : draft.value.complete
      ? draft.value.profile
      : undefined,
)

watch(
  [activeMethod, currentProfile],
  () => emit('state', { method: activeMethod.value, profile: currentProfile.value }),
  { immediate: true },
)

watch(
  selectedEntry,
  (entry) => {
    if (entry) {
      lastSelectedIds.value = { ...lastSelectedIds.value, [entry.method]: entry.id }
    }
  },
  { immediate: true },
)

/**
 * Попытка оплатить без адреса возвращает человека к блоку доставки: к
 * кнопке «Сохранить» её нет вовсе, адрес добавляется заполнением формы.
 */
const { registerBlockAnchor } = useAddressGuard()

onMounted(() => {
  registerBlockAnchor(() => {
    sectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
})

onBeforeUnmount(() => registerBlockAnchor(undefined))

/**
 * Для курьера заголовок карточки — «Адрес»: слово «Курьер» уже стоит на
 * свитчере выше, второй раз оно читается как название карточки, а не как
 * способ. У пункта выдачи заголовок — сам пункт.
 */
const rowTitle = computed(() =>
  selectedEntry.value?.method === 'courier'
    ? text.value.addressTitle
    : (selectedEntry.value?.typeLabel ?? ''),
)

/** Цена показывается только у пункта выдачи: у курьера её называет блок вариантов. */
const isPriceVisible = computed(() => selectedEntry.value?.method === 'pickup')

const addressCard = computed(() =>
  selectedAddressCard(
    country.value,
    selectedEntry.value?.fields,
    selectedEntry.value?.addressLine ?? '',
    t,
  ),
)

const selectedExtras = computed(() =>
  composeAddressExtras(country.value, selectedEntry.value?.fields, t),
)

/**
 * Адрес в макете — один абзац: улица, город, индекс и уточнения идут подряд
 * и переносятся по ширине, отдельных строк под них нет.
 */
const addressText = computed(() =>
  [joinAddressCard(addressCard.value), selectedExtras.value].filter(Boolean).join(', '),
)

// Под адресом только имя получателя: телефон в макете не показан.
const selectedContact = computed(() => selectedEntry.value?.name ?? '')

/** Попап пункта самовывоза получает editProfile, только если это его профиль. */
const pickupEditProfile = computed(() =>
  editingEntry.value?.method === 'pickup' ? editingEntry.value : undefined,
)

function lastEntryFor(method: DeliveryProfileMethod) {
  return (
    entries.value.find((entry) => entry.id === lastSelectedIds.value[method]) ??
    entries.value.find((entry) => entry.method === method)
  )
}

function openNewForm() {
  editingEntryId.value = undefined
  draft.value = { complete: false }
  formKey.value += 1
  mode.value = 'form'
}

function onSwitchMethod(method: DeliveryProfileMethod) {
  if (method === activeMethod.value) {
    return
  }

  editingEntryId.value = undefined

  const entry = lastEntryFor(method)

  if (entry) {
    selectedEntryId.value = entry.id
    mode.value = 'summary'

    return
  }

  if (method === 'pickup') {
    isPickupDialogOpen.value = true

    return
  }

  openNewForm()
}

function upsert(profile: DeliveryProfile) {
  const exists = entries.value.some((entry) => entry.id === profile.id)

  entries.value = exists
    ? entries.value.map((entry) => (entry.id === profile.id ? profile : entry))
    : [profile, ...entries.value]
}

/**
 * Форма сообщает о каждом изменении. Заполненный адрес сразу ложится в
 * книгу и становится выбранным — отдельного «Сохранить» нет. Недозаполненный
 * в книгу не попадает, а у уже сохранённого старые значения остаются, пока
 * поля не заполнят снова.
 */
function onFormChange(payload: { profile: DeliveryProfile; complete: boolean }) {
  draft.value = payload

  if (payload.complete) {
    upsert(payload.profile)
    selectedEntryId.value = payload.profile.id
  }
}

function openBook() {
  isBookOpen.value = true
}

function onSelectEntry(id: string) {
  selectedEntryId.value = id
  editingEntryId.value = undefined
  mode.value = 'summary'
  isBookOpen.value = false
}

function onEditEntry(id: string) {
  const entry = entries.value.find((item) => item.id === id)

  isBookOpen.value = false
  editingEntryId.value = id

  if (entry?.method === 'pickup') {
    isPickupDialogOpen.value = true

    return
  }

  // Адрес курьера правится окном на весь экран, а не формой на странице.
  isEditDialogOpen.value = true
}

function onEditConfirm(profile: DeliveryProfile) {
  upsert(profile)

  selectedEntryId.value = profile.id
  editingEntryId.value = undefined
  isEditDialogOpen.value = false
  isBookOpen.value = false
  mode.value = 'summary'
}

function onEditClose() {
  isEditDialogOpen.value = false
  editingEntryId.value = undefined
}

/**
 * «Добавить» в книге добавляет адрес того способа, который выбран в её
 * свитчере, — не обязательно способа страницы. Книга остаётся открытой под
 * окном: «Отменить» возвращает в неё, а подтверждение закрывает обе.
 */
function onAddNew(method: DeliveryProfileMethod) {
  editingEntryId.value = undefined

  if (method === 'pickup') {
    isPickupDialogOpen.value = true

    return
  }

  isEditDialogOpen.value = true
}

function onPickupConfirm(profile: DeliveryProfile) {
  upsert(profile)

  selectedEntryId.value = profile.id
  editingEntryId.value = undefined
  isPickupDialogOpen.value = false
  isBookOpen.value = false
  mode.value = 'summary'

  void nextTick(() => sectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function onEntryDelete(id: string) {
  const wasSelected = selectedEntryId.value === id

  entries.value = entries.value.filter((entry) => entry.id !== id)
  editingEntryId.value = undefined
  isPickupDialogOpen.value = false
  isEditDialogOpen.value = false

  if (wasSelected) {
    selectedEntryId.value = undefined
  }

  // Как и в остальных версиях: удалённый активный адрес не подменяем молча
  // следующим сохранённым — возвращаем в книгу для явного выбора. Если книга
  // опустела совсем, показываем форму, как при первом входе.
  if (entries.value.length === 0) {
    openNewForm()
  } else {
    isBookOpen.value = true
  }
}
</script>

<template>
  <section
    ref="sectionRef"
    class="cc3-combined-delivery"
    :class="{ 'cc3-combined-delivery--summary': mode === 'summary' && selectedEntry }"
  >
    <Cc3ModalDeliveryMethodSwitch
      :active="activeMethod"
      :courier-label="text.courierTab"
      :pickup-label="text.pickupTab"
      @select="onSwitchMethod"
    />

    <template v-if="mode === 'summary' && selectedEntry">
      <div class="cc3-combined-delivery__row">
        <span class="cc3-combined-delivery__method">{{ rowTitle }}</span>

        <button type="button" class="cc3-combined-delivery__change" @click="openBook">
          <Cc3Icon name="edit-01" :size="16" />
          {{ text.change }}
        </button>
      </div>

      <p class="cc3-combined-delivery__address">{{ addressText }}</p>

      <p class="cc3-combined-delivery__name">{{ selectedContact }}</p>

      <p v-if="isPriceVisible" class="cc3-combined-delivery__price">
        {{ selectedEntry.priceLabel }}
      </p>

      <div v-if="selectedEntry.method === 'pickup'" class="cc3-combined-delivery__hours">
        <p class="cc3-combined-delivery__hours-title">{{ text.hours }}</p>
        <p class="cc3-combined-delivery__hours-text">{{ text.hoursWeekday }}</p>
        <p class="cc3-combined-delivery__hours-text">{{ text.hoursWeekend }}</p>
      </div>
    </template>

    <Cc3CombinedAddressForm v-else :key="formKey" @change="onFormChange" />

    <Cc3CombinedAddressEditDialog
      v-if="isEditDialogOpen"
      :edit-profile="editingEntry"
      @close="onEditClose"
      @confirm="onEditConfirm"
      @delete="onEntryDelete"
    />

    <Cc3CombinedAddressBook
      v-if="isBookOpen"
      :entries="entries"
      :selected-id="selectedEntryId"
      :method="activeMethod"
      @close="isBookOpen = false"
      @select="onSelectEntry"
      @edit="onEditEntry"
      @add="onAddNew"
    />

    <Cc3CombinedPickupDialog
      v-if="isPickupDialogOpen"
      :edit-profile="pickupEditProfile"
      @close="isPickupDialogOpen = false"
      @confirm="onPickupConfirm"
      @delete="onEntryDelete"
    />
  </section>
</template>

<style lang="scss">
.cc3-combined-delivery {
  // Карточка адреса заканчивается без запаса, а форма — отступом последнего
  // поля. Те же 12 снизу, чтобы до заголовка следующего блока выходило как
  // после формы.
  &--summary {
    padding-bottom: var(--st-global-distance-space-inset-xl);
  }

  // Отступ над заголовком, как у заголовка формы: 46px от свитчера до текста.
  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;

    margin-top: calc(var(--st-global-distance-space-inset-xl) + var(--st-global-distance-space-inset-x));
    padding: var(--st-global-distance-space-inset-sm) var(--st-global-distance-space-inset-2xl);
  }

  &__method {
    @include font('heading-xxs');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__change {
    display: inline-flex;
    align-items: center;
    gap: var(--st-global-distance-space-inline-xs);

    padding: var(--st-global-distance-space-inset-lg);

    font-family: inherit;

    @include font('label-sm');

    color: var(--st-action-foreground-color-positive-normal);
    background: none;
    border: none;
    cursor: pointer;
    transform: translateX(var(--st-global-distance-space-inset-md));
  }

  &__address {
    margin: 0;
    padding: var(--st-global-distance-space-inset-md) var(--st-global-distance-space-inset-2xl) 0;

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  // Срок и цена пункта — зелёным, как имя получателя над ними: так в шторке
  // пункта на карте, и страница читается как её продолжение.
  &__price {
    margin: 0;
    padding: var(--st-global-distance-space-inset-xl) var(--st-global-distance-space-inset-2xl) 0;

    @include font('body-md');

    color: var(--st-content-foreground-color-positive-primary);
  }

  &__hours {
    padding: var(--st-global-distance-space-inset-xl) var(--st-global-distance-space-inset-2xl) 0;
  }

  &__hours-title {
    margin: 0;

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-secondary);
  }

  &__hours-text {
    margin: 0;

    @include font('body-sm');

    color: var(--st-content-foreground-color-neutral-secondary);
  }

  // Имя получателя — зелёным, как в макете, и без жирного.
  &__name {
    margin: 0;
    padding: 0 var(--st-global-distance-space-inset-2xl);

    @include font('body-md');

    color: var(--st-content-foreground-color-positive-primary);
  }
}
</style>
