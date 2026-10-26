<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import cardIcon from '@/assets/payment-icons/credit-card.png'
import paypalIcon from '@/assets/payment-icons/paypal.png'
import sberpayIcon from '@/assets/payment-icons/sberpay.png'
import sbpIcon from '@/assets/payment-icons/sbp.png'
import bankTransferIcon from '@/assets/payment-icons/bank-transfer.svg'
import Cc3PaymentMarks from '@/components/Payment/Cc3PaymentMarks.vue'
import { useStand } from '@/stand/composables/useStand'
import { conceptPaymentMethodsFor } from '@/stand/config/payments'
import type { PaymentMark } from '@/stand/config/payments'

/**
 * Способы оплаты комбинированной версии: тот же набор, что у остальных
 * концептов (он зависит от рынка), но сгруппированным списком, как и способ
 * доставки. Набор берётся из конфига рынка — здесь его не перечисляем.
 */
const { country, t } = useStand()

type Method = {
  id: string
  name: string
  icon: string
  marks?: PaymentMark[]
}

const icons: Record<string, string> = {
  'bank-card': cardIcon,
  paypal: paypalIcon,
  sbp: sbpIcon,
  card: cardIcon,
  sberpay: sberpayIcon,
  yoomoney: bankTransferIcon,
}

const methods = computed<Method[]>(() =>
  conceptPaymentMethodsFor(country.value).map((method) => ({
    id: method.id,
    name: t(method.labelKey),
    icon: icons[method.id] ?? cardIcon,
    marks: method.marks,
  })),
)

const text = computed(() => ({
  title: t('payment.title'),
}))

const selected = ref(methods.value[0]?.id ?? 'bank-card')

// Смена страны меняет сам список: выбранного способа в нём может уже не
// быть, и тогда не выбрано ничего — возвращаем выбор на первый.
watch(methods, (list) => {
  if (!list.some((method) => method.id === selected.value)) {
    selected.value = list[0]?.id ?? ''
  }
})
</script>

<template>
  <section class="cc3-combined-payment">
    <h2 class="cc3-combined-payment__title">{{ text.title }}</h2>

    <div class="cc3-combined-payment__list">
      <label v-for="method in methods" :key="method.id" class="cc3-combined-payment__row">
        <span class="cc3-combined-payment__method">
          <img :src="method.icon" alt="" class="cc3-combined-payment__icon" />

          <span class="cc3-combined-payment__name">{{ method.name }}</span>
        </span>

        <span class="cc3-combined-payment__side">
          <Cc3PaymentMarks v-if="method.marks" :marks="method.marks" />

          <input
            v-model="selected"
            type="radio"
            name="cc3-combined-payment"
            :value="method.id"
            class="cc3-combined-payment__radio"
          />
        </span>
      </label>
    </div>
  </section>
</template>

<style lang="scss">
.cc3-combined-payment {
  padding: 0 var(--st-global-distance-space-inset-2xl);

  &__title {
    margin: 0;
    padding: var(--st-global-distance-space-inset-sm) 0
      var(--st-global-distance-space-inset-xl);

    @include font('heading-xxs');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__list {
    @include cc3-combined-choice-list;
  }

  &__row {
    @include cc3-combined-choice-row;

    // По макету от значка до краёв строки 16px со всех сторон.
    padding-block: var(--st-global-distance-space-inset-2xl);
  }

  &__method {
    display: flex;
    align-items: center;
    gap: var(--st-global-distance-space-inline-md);
  }

  // У логотипов своя круглая подложка внутри самого файла: вторая вокруг
  // них давала лишнюю серую обводку.
  &__icon {
    flex-shrink: 0;

    width: 32px;
    height: 32px;

    border-radius: var(--st-global-radius-pill);
    object-fit: cover;
  }

  &__name {
    @include font('body-lg');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__side {
    display: flex;
    align-items: center;
    gap: var(--st-global-distance-space-inset-md);
  }

  &__radio {
    @include cc3-modal-radio-control;
  }
}
</style>
