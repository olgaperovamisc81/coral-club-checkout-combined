<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import type { MapPoint } from '@/components/Map/mapTypes'
import { useCourierVariants } from '@/composables/useCourierVariants'
import Cc3StandField from '@/stand/components/Cc3StandField.vue'
import { composeAddressLine } from '@/stand/config/addressLine'
import { useStand } from '@/stand/composables/useStand'
import { useStandFields } from '@/stand/composables/useStandFields'
import { useStandProfile } from '@/stand/composables/useStandProfile'
import type { FieldKey } from '@/stand/config/types'
import { applySuggestion } from '@/stand/suggest'
import type { AddressSuggestion } from '@/stand/suggest'

import type { DeliveryProfile } from '../Modal/deliveryProfile'
import Cc3CombinedMapDialog from './Cc3CombinedMapDialog.vue'
import { useFieldErrors } from './useFieldErrors'

/**
 * Форма адреса курьера комбинированной версии. Кнопки «Сохранить» нет:
 * адрес считается добавленным, как только заполнены обязательные поля, и
 * форма сама сообщает об этом наверх при каждом изменении. Пока полей не
 * хватает, ниже висит плашка «Укажите адрес…» вместо способов доставки.
 *
 * Подписи лежат внутри полей и уходят наверх при вводе. Под строкой адреса
 * стоит ссылка «Выбрать на карте» — она открывает окно с картой, из которого
 * адрес возвращается в форму.
 */
const props = defineProps<{
  /** Адрес, с которого начинается форма; без него форма пустая. */
  editProfile?: DeliveryProfile
}>()

const emit = defineEmits<{
  change: [payload: { profile: DeliveryProfile; complete: boolean; addressComplete: boolean }]
}>()

const { t, country } = useStand()
const { courierVariants } = useCourierVariants()
const { recipientValues } = useStandProfile()

const text = computed(() => ({
  addressSection: t('combined.shipTo'),
  recipientSection: t('group.recipient.title'),
  pickOnMap: t('address.mapShow'),
}))

const { fields: addressFields } = useStandFields('address')
const { fields: recipientFields } = useStandFields('recipient')

// Типов адреса «Дом / Работа / Своё название» в этом сценарии нет — как и
// в инлайн-форме, поле из конфига не рисуем.
const renderedAddressFields = computed(() =>
  addressFields.value.filter((field) => field.key !== 'addressLabel'),
)

const values = ref<Partial<Record<FieldKey, string>>>({})
const mapPoint = ref<MapPoint>()
const isMapOpen = ref(false)

/**
 * Новый адрес открывается с получателем из профиля, сохранённый — со своими
 * данными: магазин его уже знает, и пустой блок получателя человек читает
 * как обязательный к заполнению.
 */
function seedValues() {
  const profile = props.editProfile

  if (!profile) {
    values.value = { ...recipientValues.value }

    return
  }

  const [firstName = '', ...rest] = profile.name.trim().split(/\s+/)

  values.value = {
    ...profile.fields,
    street: profile.fields?.street ?? profile.addressLine,
    recipientName: profile.name,
    recipientFirstName: firstName,
    recipientLastName: rest.join(' '),
    recipientPhone: profile.phone,
    recipientEmail: profile.email,
  }
}

seedValues()

watch(country, seedValues)

function onSuggestionSelect(suggestion: AddressSuggestion) {
  values.value = applySuggestion(
    values.value,
    'street',
    suggestion,
    addressFields.value,
    country.value,
  )

  if (suggestion.lat !== undefined && suggestion.lng !== undefined) {
    mapPoint.value = { lat: suggestion.lat, lng: suggestion.lng }
  }
}

function onMapConfirm(payload: { suggestion?: AddressSuggestion; query: string }) {
  isMapOpen.value = false

  if (payload.suggestion) {
    onSuggestionSelect(payload.suggestion)
  } else if (payload.query) {
    values.value = { ...values.value, street: payload.query }
  }
}

/**
 * Имя получателя берётся из тех полей, которые человек видит: у России это
 * одно поле, у остальных рынков — имя и фамилия. Скрытые поля другого вида
 * подставляются из профиля при открытии формы, и если брать их запасным
 * значением, стёртое в интерфейсе имя возвращалось бы старым.
 */
const recipientDisplayName = computed(() => {
  if (recipientFields.value.some((field) => field.key === 'recipientName')) {
    return (values.value.recipientName ?? '').trim()
  }

  return [values.value.recipientFirstName, values.value.recipientLastName]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ')
})

// Проверка всех полей формы: что не так и когда это показать. Пустое
// обязательное поле и неверный формат (индекс, телефон, почта) — ошибки, а
// не повод пропустить адрес дальше.
const allFields = computed(() => [...renderedAddressFields.value, ...recipientFields.value])
const { messages, visible, isValid, touch, reveal } = useFieldErrors(allFields, values)

/**
 * Адрес заполнен, когда у полей адреса нет ошибок. От этого зависят варианты
 * доставки: им получатель не нужен, и показывать их можно, не дожидаясь
 * имени, телефона и почты. Индекс «1» адресом не считается.
 */
const isAddressComplete = computed(() =>
  renderedAddressFields.value.every((field) => !messages.value[field.key]),
)

/**
 * Адрес добавлен в книгу, когда нет ошибок ни у адреса, ни у получателя.
 * Состав обязательных полей приходит из конфига страны, а не из вёрстки.
 */
const isComplete = isValid

/**
 * Показать все ошибки и привести человека к первому полю с ошибкой. Вызывает
 * страница при оплате и окна — по «Продолжить» и «Сохранить»: адрес мы
 * показываем и без получателя, а недостающее ловим здесь.
 */
function revealErrors() {
  reveal()

  void nextTick(() => {
    const first = document.querySelector<HTMLInputElement>(
      '.cc3-combined-address-form .cc3-stand-field--invalid input, .cc3-combined-address-form .cc3-stand-field--invalid select',
    )

    first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    first?.focus({ preventScroll: true })
  })
}

defineExpose({ revealErrors })

// Один идентификатор на всю жизнь формы: новый адрес при каждом нажатии
// клавиши давал бы новую карточку в книге.
const draftId = `profile-${Date.now()}`

// Идентификатор фиксируется при создании: если читать его из props внутри
// computed, каждое сохранение в книгу пересоздавало бы профиль и форма
// бесконечно сообщала бы об изменении самой себе.
const profileId = props.editProfile?.id ?? draftId

const profile = computed<DeliveryProfile>(() => ({
  id: profileId,
  method: 'courier',
  typeLabel: t('concept.delivery.method.label'),
  name: recipientDisplayName.value,
  addressLine: composeAddressLine(country.value, values.value, t),
  priceLabel: courierVariants.value[0]?.summary ?? '',
  phone: values.value.recipientPhone ?? '',
  email: values.value.recipientEmail ?? '',
  fields: values.value,
}))

watch(
  [profile, isComplete, isAddressComplete],
  () =>
    emit('change', {
      profile: profile.value,
      complete: isComplete.value,
      addressComplete: isAddressComplete.value,
    }),
  { immediate: true },
)
</script>

<template>
  <div class="cc3-combined-address-form">
    <h3 class="cc3-combined-address-form__title">{{ text.addressSection }}</h3>

    <div class="cc3-combined-address-form__fields">
      <template v-for="field in renderedAddressFields" :key="field.key">
        <div
          v-if="field.type === 'autocomplete'"
          class="cc3-combined-address-form__search"
        >
          <Cc3StandField
            v-model="values[field.key]"
            :field="field"
            :invalid="Boolean(visible[field.key])"
            :error="visible[field.key]"
            floating
            @select="onSuggestionSelect"
            @focusout="touch(field.key)"
          />

          <button
            type="button"
            class="cc3-combined-address-form__map-link"
            @click="isMapOpen = true"
          >
            {{ text.pickOnMap }}
          </button>
        </div>

        <Cc3StandField
          v-else
          v-model="values[field.key]"
          :field="field"
          :invalid="Boolean(visible[field.key])"
          :error="visible[field.key]"
          floating
          @focusout="touch(field.key)"
        />
      </template>
    </div>

    <h3 class="cc3-combined-address-form__title">{{ text.recipientSection }}</h3>

    <div class="cc3-combined-address-form__fields">
      <Cc3StandField
        v-for="field in recipientFields"
        :key="field.key"
        v-model="values[field.key]"
        :field="field"
        :invalid="Boolean(visible[field.key])"
        :error="visible[field.key]"
        floating
        @focusout="touch(field.key)"
      />
    </div>

    <Cc3CombinedMapDialog
      v-if="isMapOpen"
      :query="values.street ?? ''"
      :point="mapPoint"
      @close="isMapOpen = false"
      @confirm="onMapConfirm"
    />
  </div>
</template>

<style lang="scss">
.cc3-combined-address-form {
  display: flex;
  flex-direction: column;

  padding: 0 var(--st-global-distance-space-inset-2xl);

  // Отступы заголовка по схеме дизайнера: от блока над ним до текста заголовка
  // 44px, от текста до блока под ним 28px. Строка заголовка 6 + 28 + 14, над
  // ней 12 — первому заголовку после свитчера нужно ещё на 2px больше.
  &__title {
    margin: var(--st-global-distance-space-inset-xl) 0 0;
    padding: var(--st-global-distance-space-inset-sm) 0
      calc(var(--st-global-distance-space-inset-xl) + var(--st-global-distance-space-inset-x));

    @include font('heading-xxs');

    color: var(--st-content-foreground-color-neutral-primary);

    &:first-child {
      margin-top: calc(var(--st-global-distance-space-inset-xl) + var(--st-global-distance-space-inset-x));
    }
  }

  &__fields {
    display: flex;
    flex-wrap: wrap;
    gap: 0 var(--st-global-distance-space-inset-xl);

    // half — не своя модификация, а флаг из конфига страны (см. Cc3StandField):
    // поле встаёт в половину строки, а не на всю ширину.
    .cc3-stand-field--half {
      flex: 1 1 calc(50% - var(--st-global-distance-space-inset-xl));
      min-width: 140px;
    }
  }

  // Ссылка прижата к строке адреса: поле держит собственный нижний отступ,
  // и здесь он меньше обычного.
  &__search {
    width: 100%;

    .cc3-stand-field {
      margin-block-end: var(--st-global-distance-space-inset-md);
    }
  }

  &__map-link {
    margin: 0 0 var(--st-global-distance-space-inset-xl);
    padding: 0;

    font-family: inherit;

    @include font('label-sm');

    color: var(--st-action-foreground-color-positive-normal);
    text-decoration: underline;
    background: none;
    border: none;
    cursor: pointer;
  }
}
</style>
