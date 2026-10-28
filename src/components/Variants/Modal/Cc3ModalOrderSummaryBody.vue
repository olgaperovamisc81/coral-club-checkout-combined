<script setup lang="ts">
import { computed } from 'vue'

import { useCheckout } from '@/composables/useCheckout'
import { useStand } from '@/stand/composables/useStand'

/**
 * Тело сводки заказа: миниатюры, счётчик, суммы и промокод.
 *
 * Вынесено из Cc3ModalOrderSummary, потому что показывается в двух местах:
 * блоком в конце страницы и раскрытой панелью под прилипшей шапкой сводки.
 * Вид в обоих местах обязан совпадать — это одна и та же сводка, и две
 * слегка разные её версии человек прочитает как два разных заказа.
 */
defineProps<{
  /**
   * Плотная раскладка раскрытой панели под шапкой: в макете у неё строки
   * стоят ближе, чем у блока в конце страницы.
   */
  compact?: boolean
}>()

const { t } = useStand()
const {
  summary,
  orderProductsPreview,
  promoCode,
  appliedPromo,
  promoError,
  applyPromo,
  removePromo,
  clearPromoError,
} = useCheckout()

const text = computed(() => ({
  subtotal: t('summary.items', { count: summary.value.itemsCount }),
  shipping: t('summary.delivery'),
  total: t('summary.total'),
  itemsPoints: t('summary.itemsPoints', {
    count: summary.value.itemsCount,
    points: summary.value.points,
  }),
  promoPlaceholder: t('summary.promoPlaceholder'),
  apply: t('common.apply'),
  promoRow: t('summary.promoRow'),
  promoApplied: appliedPromo.value
    ? t('summary.promoApplied', { code: appliedPromo.value.code })
    : '',
  promoRemove: t('summary.promoRemove'),
  promoError: promoError.value === 'expired' ? t('summary.promoExpired') : t('summary.promoInvalid'),
}))
</script>

<template>
  <div
    class="cc3-modal-order-summary-body"
    :class="{ 'cc3-modal-order-summary-body--compact': compact }"
  >
    <!--
      Раньше превью было кнопкой со стрелкой «раскрыть список товаров», но
      обработчика у неё не было: человек жал и ничего не происходило. Состав
      заказа теперь виден целиком — три позиции, — и раскрывать нечего.
    -->
    <div class="cc3-modal-order-summary-body__preview">
      <span class="cc3-modal-order-summary-body__thumbs">
        <span
          v-for="product in orderProductsPreview"
          :key="product.id"
          class="cc3-modal-order-summary-body__thumb"
        >
          <img
            v-if="product.thumbImage"
            :src="product.thumbImage"
            :alt="product.name"
            class="cc3-modal-order-summary-body__thumb-img"
          />
        </span>
      </span>
    </div>

    <p class="cc3-modal-order-summary-body__count">
      {{ text.itemsPoints }}
    </p>

    <dl class="cc3-modal-order-summary-body__rows">
      <div class="cc3-modal-order-summary-body__row">
        <dt>{{ text.subtotal }}</dt>
        <dd>{{ summary.itemsTotalFormatRounded }}</dd>
      </div>

      <div class="cc3-modal-order-summary-body__row">
        <dt>{{ text.shipping }}</dt>
        <dd>{{ summary.deliveryFormatRounded }}</dd>
      </div>

      <div
        v-if="summary.walletUsedFormatRounded"
        class="cc3-modal-order-summary-body__row cc3-modal-order-summary-body__row--positive"
      >
        <dt>Coral Wallet</dt>
        <dd>-{{ summary.walletUsedFormatRounded }}</dd>
      </div>

      <div
        v-if="summary.promoDiscountFormatRounded"
        class="cc3-modal-order-summary-body__row cc3-modal-order-summary-body__row--positive-value"
      >
        <dt>{{ text.promoRow }}</dt>
        <dd>-{{ summary.promoDiscountFormatRounded }}</dd>
      </div>

      <div
        class="cc3-modal-order-summary-body__row cc3-modal-order-summary-body__row--total"
      >
        <dt>{{ text.total }}</dt>
        <dd>{{ summary.totalFormatRounded }}</dd>
      </div>
    </dl>

    <div class="cc3-modal-order-summary-body__promo">
      <div v-if="appliedPromo" class="cc3-modal-order-summary-body__promo-field">
        <span class="cc3-modal-order-summary-body__promo-applied">{{ text.promoApplied }}</span>

        <button
          type="button"
          class="cc3-modal-order-summary-body__promo-apply"
          @click="removePromo"
        >
          {{ text.promoRemove }}
        </button>
      </div>

      <template v-else>
        <div
          class="cc3-modal-order-summary-body__promo-field"
          :class="{ 'cc3-modal-order-summary-body__promo-field--invalid': promoError }"
        >
          <input
            v-model="promoCode"
            type="text"
            :placeholder="text.promoPlaceholder"
            class="cc3-modal-order-summary-body__promo-input"
            @input="clearPromoError"
            @keydown.enter="applyPromo"
          />

          <button
            type="button"
            class="cc3-modal-order-summary-body__promo-apply"
            :disabled="!promoCode"
            @click="applyPromo"
          >
            {{ text.apply }}
          </button>
        </div>

        <p v-if="promoError" class="cc3-modal-order-summary-body__promo-error" role="alert">
          {{ text.promoError }}
        </p>
      </template>
    </div>
  </div>
</template>

<style lang="scss">
.cc3-modal-order-summary-body {
  // Плотная раскладка по макету панели: миниатюры ниже края шапки, строки
  // через 8px, промокод отодвинут от итога.
  &--compact {
    .cc3-modal-order-summary-body__preview {
      padding: calc(var(--st-global-distance-space-inset-2xl) + var(--st-global-distance-space-inset-md))
        var(--st-global-distance-space-inset-2xl) var(--st-global-distance-space-inset-md);
    }

    .cc3-modal-order-summary-body__count {
      padding-bottom: var(--st-global-distance-space-inset-lg);
    }

    .cc3-modal-order-summary-body__rows {
      gap: var(--st-global-distance-space-inset-md);

      padding-bottom: var(--st-global-distance-space-inset-lg);
    }

    .cc3-modal-order-summary-body__promo {
      padding-top: var(--st-global-distance-space-inset-2xl);
      padding-bottom: calc(var(--st-global-distance-space-inset-2xl) + var(--st-global-distance-space-inset-lg));
    }
  }

  &__preview {
    display: flex;
    align-items: center;

    padding: var(--st-global-distance-space-inset-sm) var(--st-global-distance-space-inset-2xl);
    width: 100%;
  }

  &__thumbs {
    display: flex;
    align-items: center;
    gap: var(--st-global-distance-space-inset-2xl);
  }

  &__thumb {
    display: flex;
    flex-shrink: 0;

    width: 64px;
    height: 64px;

    background-color: #f6f6f6;
    border: 1px solid var(--st-content-border-color-neutral-implicit);
    border-radius: var(--st-global-radius-x);
  }

  &__thumb-img {
    width: 100%;
    height: 100%;

    border-radius: var(--st-global-radius-x);
    object-fit: cover;
  }

  &__count {
    margin: 0;
    padding: 0 var(--st-global-distance-space-inset-2xl) var(--st-global-distance-space-inset-2xl);

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-secondary);
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: var(--st-global-distance-space-inset-2xl);

    margin: 0;
    padding: var(--st-global-distance-space-inset-xl) var(--st-global-distance-space-inset-2xl);
  }

  &__row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;

    dt,
    dd {
      margin: 0;

      @include font('body-md');

      color: var(--st-content-foreground-color-neutral-primary);
    }
  }

  &__row--positive {
    dt,
    dd {
      color: var(--st-content-foreground-color-positive-secondary);
      font-weight: 700;
    }
  }

  // Строка промокода: подпись обычная, сумма скидки зелёная, как у кошелька.
  &__row--positive-value dd {
    color: var(--st-content-foreground-color-positive-secondary);
    font-weight: 700;
  }

  &__row--total {
    dt,
    dd {
      @include font('heading-xxs');
    }
  }

  &__promo {
    padding: 0 var(--st-global-distance-space-inset-2xl) var(--st-global-distance-space-inset-2xl);
  }

  // Рамка у обёртки, а не у input: кнопка «Применить» лежит внутри поля.
  &__promo-field {
    display: flex;
    align-items: center;
    gap: var(--st-global-distance-space-inset-md);

    padding: 0 var(--st-global-distance-space-inset-xl);
    height: 44px;

    background-color: var(--st-interaction-background-color-ghost-normal);
    border: 2px solid var(--st-interaction-border-color-neutral-normal);
    border-radius: var(--st-global-radius-sm);

    &:focus-within {
      border-color: var(--st-action-background-color-positive-normal);
    }
  }

  &__promo-field--invalid,
  &__promo-field--invalid:focus-within {
    border-color: var(--st-content-border-color-negative-explicit);
  }

  &__promo-applied {
    flex: 1;
    min-width: 0;

    @include font('label-sm');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__promo-error {
    margin: var(--st-global-distance-space-inset-sm) 0 0;

    @include font('body-sm');

    color: var(--st-content-foreground-color-negative-primary);
  }

  &__promo-input {
    flex: 1;
    min-width: 0;

    padding: 0;
    height: 100%;

    font-family: inherit;

    @include font('body-sm');

    color: var(--st-content-foreground-color-neutral-primary);
    background: none;
    border: none;

    &::placeholder {
      color: var(--st-content-foreground-color-neutral-tetriary);
    }

    &:focus {
      outline: none;
    }
  }

  &__promo-apply {
    flex-shrink: 0;

    padding: 0;

    font-family: inherit;

    @include font('label-sm');

    color: var(--st-action-foreground-color-neutral-normal);
    text-decoration: underline;
    background: none;
    border: none;
    cursor: pointer;

    &:disabled {
      color: var(--st-content-foreground-color-neutral-tetriary);
      cursor: not-allowed;
    }
  }
}
</style>
