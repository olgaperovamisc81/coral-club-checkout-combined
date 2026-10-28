<script setup lang="ts">
import { computed, nextTick } from 'vue'

import Cc3StandField from '@/stand/components/Cc3StandField.vue'
import { useStand } from '@/stand/composables/useStand'
import { useStandFields } from '@/stand/composables/useStandFields'
import type { FieldKey } from '@/stand/config/types'

import Cc3CombinedNotice from '../Cc3CombinedNotice.vue'
import { useFieldErrors } from '../useFieldErrors'

/**
 * Шаг уточнения пункта после «Привезти сюда»: что за пункт, как работает,
 * как добраться — и получатель под ним. Получатель стоит в окне, а не
 * подставляется молча: в пункт посылку нередко забирает не сам заказчик,
 * и увидеть, кто там указан, важнее, чем сэкономить четыре строки экрана.
 */
type PickupDetail = {
  title: string
  address: string
  priceLabel: string
  storage?: string
  directions?: string
  phone?: string
  closed?: boolean
}

defineProps<{
  detail: PickupDetail
}>()

defineEmits<{
  back: []
}>()

const recipientValues = defineModel<Partial<Record<FieldKey, string>>>({ required: true })

const { t } = useStand()
const { fields: configFields } = useStandFields('recipient')

// В самовывозе получатель необязателен: пункт выдаст заказ по коду, а контакты
// нужны лишь для уведомления. Состав полей берём из конфига страны, снимаем
// только обязательность — звёздочки и ошибки «Укажите…» пропадают вместе с ней.
const recipientFields = computed(() =>
  configFields.value.map((field) => ({ ...field, required: false })),
)

const text = computed(() => ({
  viewOnMap: t('delivery.viewOnMap'),
  hours: t('pickup.hours'),
  hoursWeekday: t('pickup.hours.weekday'),
  hoursWeekend: t('pickup.hours.weekend'),
  directions: t('pickup.directions'),
  contacts: t('pickup.contacts'),
  recipientSection: t('group.recipient.title'),
  closedNotice: t('pickup.closedNotice'),
}))

const { visible, isValid, touch, reveal } = useFieldErrors(recipientFields, recipientValues)

/**
 * Показать ошибки получателя и привести к первому полю с ошибкой. Зовёт окно,
 * когда «Продолжить» нажали с пустыми или неверными контактами.
 */
function revealErrors() {
  reveal()

  void nextTick(() =>
    document
      .querySelector<HTMLInputElement>('.cc3-combined-pickup-detail .cc3-stand-field--invalid input')
      ?.focus(),
  )
}

defineExpose({ isValid, revealErrors })
</script>

<template>
  <div class="cc3-combined-pickup-detail">
    <div class="cc3-combined-pickup-detail__heading">
      <h3 class="cc3-combined-pickup-detail__title">{{ detail.title }}</h3>

      <button type="button" class="cc3-combined-pickup-detail__back" @click="$emit('back')">
        {{ text.viewOnMap }}
      </button>
    </div>

    <p class="cc3-combined-pickup-detail__address">
      {{ detail.address }}
      <br />
      <strong>{{ detail.priceLabel }}</strong>
      <span v-if="detail.storage" class="cc3-combined-pickup-detail__storage">
        {{ detail.storage }}
      </span>
    </p>

    <Cc3CombinedNotice
      v-if="detail.closed"
      tone="warning"
      class="cc3-combined-pickup-detail__closed"
    >
      {{ text.closedNotice }}
    </Cc3CombinedNotice>

    <div class="cc3-combined-pickup-detail__block">
      <p class="cc3-combined-pickup-detail__block-title">{{ text.hours }}</p>
      <p class="cc3-combined-pickup-detail__block-text">
        {{ text.hoursWeekday }}
        <br />
        {{ text.hoursWeekend }}
      </p>
    </div>

    <div v-if="detail.directions" class="cc3-combined-pickup-detail__block">
      <p class="cc3-combined-pickup-detail__block-title">{{ text.directions }}</p>
      <p class="cc3-combined-pickup-detail__block-text">{{ detail.directions }}</p>
    </div>

    <div v-if="detail.phone" class="cc3-combined-pickup-detail__block">
      <p class="cc3-combined-pickup-detail__block-title">{{ text.contacts }}</p>
      <p class="cc3-combined-pickup-detail__block-text">{{ detail.phone }}</p>
    </div>

    <h3 class="cc3-combined-pickup-detail__title cc3-combined-pickup-detail__title--recipient">
      {{ text.recipientSection }}
    </h3>

    <div class="cc3-combined-pickup-detail__fields">
      <Cc3StandField
        v-for="field in recipientFields"
        :key="field.key"
        v-model="recipientValues[field.key]"
        :field="field"
        :invalid="Boolean(visible[field.key])"
        :error="visible[field.key]"
        floating
        @focusout="touch(field.key)"
      />
    </div>
  </div>
</template>

<style lang="scss">
.cc3-combined-pickup-detail {
  display: flex;
  flex-direction: column;

  padding: var(--st-global-distance-space-inset-2xl);

  &__heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--st-global-distance-space-inset-xl);
  }

  &__title {
    margin: 0;
    padding: var(--st-global-distance-space-inset-sm) 0;

    @include font('heading-xxs');

    color: var(--st-content-foreground-color-neutral-primary);

    &--recipient {
      padding-top: var(--st-global-distance-space-inset-2xl);
      padding-bottom: var(--st-global-distance-space-inset-xl);
    }
  }

  &__back {
    padding: var(--st-global-distance-space-inset-lg);

    font-family: inherit;

    @include font('label-sm');

    color: var(--st-action-foreground-color-positive-normal);
    background: none;
    border: none;
    cursor: pointer;
  }

  &__closed {
    margin-bottom: var(--st-global-distance-space-inset-xl);
  }

  &__address {
    margin: 0;
    padding-bottom: var(--st-global-distance-space-inset-xl);

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);

    strong {
      font-weight: 700;
    }
  }

  &__storage {
    display: block;

    @include font('body-sm');

    color: var(--st-content-foreground-color-neutral-secondary);
  }

  &__block {
    padding-bottom: var(--st-global-distance-space-inset-xl);
  }

  &__block-title {
    margin: 0 0 var(--st-global-distance-space-inset-xs);

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__block-text {
    margin: 0;

    @include font('body-sm');

    color: var(--st-content-foreground-color-neutral-secondary);
  }

  &__fields {
    display: flex;
    flex-wrap: wrap;
    gap: 0 var(--st-global-distance-space-inset-xl);

    .cc3-stand-field--half {
      flex: 1 1 calc(50% - var(--st-global-distance-space-inset-xl));
      min-width: 140px;
    }
  }
}
</style>
