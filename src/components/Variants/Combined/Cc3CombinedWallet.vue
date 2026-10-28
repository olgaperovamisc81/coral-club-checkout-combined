<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import Cc3InputField from '@/components/Field/Cc3InputField.vue'
import { useCheckout } from '@/composables/useCheckout'
import { useStand } from '@/stand/composables/useStand'

/**
 * Блок Coral Wallet над способами оплаты. Баланс меньше заказа, поэтому
 * сценарий один: списать баланс скидкой (всё доступное или свою сумму), а
 * остаток оплатить обычным способом ниже. Блок виден только тому, у кого
 * есть кошелёк, — человеку с сохранёнными адресами; новый покупатель
 * кошелька ещё не имеет.
 *
 * Состояния: до применения (предложение списать), ввод своей суммы и после
 * применения (сколько списано и сколько осталось оплатить). Скидка
 * пересчитывается сама: цена товаров, доставка и промокод меняют итог, а
 * сообщение и сводка берут сумму из общего состояния заказа.
 */
const { t, hasSavedAddresses } = useStand()

const {
  walletMode,
  walletCustomAmount,
  isWalletAvailable,
  isWalletFullyCovering,
  isOrderFullyPaidByWallet,
  isWalletCustomAmountValid,
  walletDisplayBalanceFormat,
  walletMaxUsableFormat,
  walletAppliedAmountFormat,
  walletRemainingToPayFormat,
  applyWalletFullDiscount,
  openWalletCustomAmount,
  applyWalletCustomAmount,
  removeWalletDiscount,
} = useCheckout()

const isVisible = computed(
  () => hasSavedAddresses.value && (isWalletAvailable.value || walletMode.value === 'applied'),
)

const text = computed(() => ({
  title: t('wallet.balance', { amount: walletDisplayBalanceFormat.value }),
  payAll: t('wallet.payAll'),
  applyFull: t('wallet.applyFull'),
  spendUpTo: t('wallet.spendUpTo', { amount: walletMaxUsableFormat.value }),
  applyBelow: t('wallet.applyBelow'),
  otherAmount: t('wallet.otherAmount'),
  applyDiscount: t('wallet.applyDiscount'),
  question: t('wallet.question'),
  enterAmount: t('wallet.enterAmount'),
  max: t('wallet.max', { amount: walletMaxUsableFormat.value }),
  amountError: t('wallet.amountError', { amount: walletMaxUsableFormat.value }),
  applied: t('wallet.applied', { amount: walletAppliedAmountFormat.value }),
  remaining: t('wallet.remaining', { amount: walletRemainingToPayFormat.value }),
  fullyCovered: t('wallet.fullyCovered'),
  remove: t('wallet.remove'),
}))

// Кнопка «Применить» не гаснет молча: с неверной суммой она показывает, что
// не так. Ошибка уходит, как только сумму начинают править.
const isAmountTried = ref(false)

const hint = computed(() =>
  isAmountTried.value && !isWalletCustomAmountValid.value ? text.value.amountError : text.value.max,
)

const isAmountInvalid = computed(() => isAmountTried.value && !isWalletCustomAmountValid.value)

watch(walletCustomAmount, () => {
  isAmountTried.value = false
})

function applyCustom() {
  if (!isWalletCustomAmountValid.value) {
    isAmountTried.value = true

    return
  }

  applyWalletCustomAmount()
}
</script>

<template>
  <section v-if="isVisible" class="cc3-combined-wallet">
    <h2 class="cc3-combined-wallet__title">{{ text.title }}</h2>

    <div class="cc3-combined-wallet__card">
      <!-- Скидка ещё не применена: предлагаем списать доступный баланс. -->
      <template v-if="walletMode === 'idle'">
        <p class="cc3-combined-wallet__description">
          <template v-if="isWalletFullyCovering">
            {{ text.payAll }}
            <strong>{{ text.applyFull }}</strong>
          </template>

          <template v-else>
            {{ text.spendUpTo }}
            <strong>{{ text.applyBelow }}</strong>
          </template>
        </p>

        <button type="button" class="cc3-combined-wallet__link" @click="openWalletCustomAmount">
          {{ text.otherAmount }}
        </button>

        <button type="button" class="cc3-combined-wallet__apply" @click="applyWalletFullDiscount">
          {{ text.applyDiscount }}
        </button>
      </template>

      <!-- Своя сумма. -->
      <template v-else-if="walletMode === 'custom'">
        <p class="cc3-combined-wallet__description">{{ text.question }}</p>

        <div class="cc3-combined-wallet__field">
          <Cc3InputField
            v-model="walletCustomAmount"
            type="text"
            inputmode="numeric"
            :placeholder="text.enterAmount"
            :aria-label="text.enterAmount"
          />

          <span
            class="cc3-combined-wallet__hint"
            :class="{ 'cc3-combined-wallet__hint--error': isAmountInvalid }"
            :role="isAmountInvalid ? 'alert' : undefined"
          >
            {{ hint }}
          </span>
        </div>

        <button type="button" class="cc3-combined-wallet__apply" @click="applyCustom">
          {{ text.applyDiscount }}
        </button>
      </template>

      <!-- Скидка применена: сколько списано и сколько осталось оплатить. -->
      <template v-else>
        <p class="cc3-combined-wallet__description">
          {{ text.applied }}
          <strong v-if="isOrderFullyPaidByWallet">{{ text.fullyCovered }}</strong>
          <strong v-else>{{ text.remaining }}</strong>
        </p>

        <button type="button" class="cc3-combined-wallet__remove" @click="removeWalletDiscount">
          {{ text.remove }}
        </button>
      </template>
    </div>
  </section>
</template>

<style lang="scss">
.cc3-combined-wallet {
  // Те же 12 сверху, что у остальных блоков страницы.
  padding: var(--st-global-distance-space-inset-xl) var(--st-global-distance-space-inset-2xl) 0;

  &__card {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--st-global-distance-space-inset-xl);

    padding: var(--st-global-distance-space-inset-2xl);

    background-color: var(--st-content-background-color-default-solid-normal);
    border: 1px solid var(--st-content-border-color-neutral-implicit);
    border-radius: var(--st-global-radius-md);
  }

  // Заголовок вне карточки и с теми же отступами, что у «Способов оплаты».
  &__title {
    margin: 0;
    padding: var(--st-global-distance-space-inset-sm) 0
      calc(var(--st-global-distance-space-inset-xl) + var(--st-global-distance-space-inset-x));

    @include font('heading-xxs');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__description {
    margin: 0;

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);

    strong {
      font-weight: 700;
    }
  }

  &__link {
    align-self: flex-start;

    padding: 0;

    font-family: inherit;

    @include font('label-sm');

    color: var(--st-content-foreground-color-neutral-secondary);
    text-decoration: underline;
    background: none;
    border: none;
    cursor: pointer;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--st-global-distance-space-inset-sm);
  }

  &__hint {
    @include font('body-sm');

    color: var(--st-content-foreground-color-neutral-secondary);

    &--error {
      color: var(--st-content-foreground-color-negative-primary);
    }
  }

  // «Применить» — второстепенная кнопка (светлая заливка): залитая главная
  // здесь слишком яркая, главное действие страницы — оплата внизу. «Убрать» —
  // контурная.
  &__apply,
  &__remove {
    display: flex;
    align-items: center;
    justify-content: center;

    padding: var(--st-global-distance-space-inset-xl);
    width: 100%;

    font-family: inherit;

    @include font('label-md');

    border-radius: var(--st-global-radius-pill);
    cursor: pointer;
  }

  &__apply {
    color: var(--st-action-foreground-color-positive-normal);
    background-color: var(--st-action-background-color-positive-subtle-normal);
    border: none;
  }

  &__remove {
    color: var(--st-action-foreground-color-neutral-normal);
    background: none;
    border: 1px solid var(--st-action-border-color-neutral-subtle-normal);
  }
}
</style>
