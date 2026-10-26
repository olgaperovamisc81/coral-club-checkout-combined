<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useAddressGuard } from '@/composables/useAddressGuard'
import { useCheckout } from '@/composables/useCheckout'
import { useCourierVariants } from '@/composables/useCourierVariants'
import { useStand } from '@/stand/composables/useStand'

// Хедер, сводка заказа и подвал те же, что в остальных концептах —
// переиспользуем компоненты напрямую, а не копируем разметку. Своё у этой
// версии — блок доставки, способ доставки и способ оплаты.
import Cc3InlineDeliverySlots from '../Inline/Cc3InlineDeliverySlots.vue'
import Cc3ModalFooter from '../Modal/Cc3ModalFooter.vue'
import Cc3ModalHeader from '../Modal/Cc3ModalHeader.vue'
import Cc3ModalOrderSummary from '../Modal/Cc3ModalOrderSummary.vue'
import Cc3ModalSummaryBar from '../Modal/Cc3ModalSummaryBar.vue'
import type { DeliveryProfile, DeliveryProfileMethod } from '../Modal/deliveryProfile'
import Cc3CombinedDeliveryOptions from './Cc3CombinedDeliveryOptions.vue'
import Cc3CombinedDeliverySection from './Cc3CombinedDeliverySection.vue'
import Cc3CombinedPaymentMethods from './Cc3CombinedPaymentMethods.vue'

/**
 * Комбинированная версия: берёт форму прямо на странице у инлайна, а адресную
 * книгу, карту и поиск — окнами, как модальная. Поля с подписью внутри,
 * способ доставки и оплаты — сгруппированными списками.
 *
 * Адрес считается добавленным, когда заполнены обязательные поля: кнопки
 * «Сохранить» нет. Пока полей не хватает, вместо способов доставки стоит
 * плашка, а оплата не создаёт заказ — см. useAddressGuard.
 */
const { summary, setDeliveryPrice } = useCheckout()
const { t } = useStand()
const { courierVariants, defaultVariantId, priceOf } = useCourierVariants()

const text = computed(() => ({
  optionsTitle: t('delivery.variants'),
}))

const state = ref<{ method: DeliveryProfileMethod; profile?: DeliveryProfile }>({
  method: 'courier',
})

const { armGuard, disarmGuard, setAddressSaved } = useAddressGuard()

// Блок доставки сообщает состояние ещё в своём setup, то есть до onMounted
// родителя. Поэтому после взвода сторожа сразу пересказываем ему, что уже есть.
onMounted(() => {
  armGuard()
  setAddressSaved(Boolean(state.value.profile))
})

onBeforeUnmount(disarmGuard)

function onState(payload: { method: DeliveryProfileMethod; profile?: DeliveryProfile }) {
  state.value = payload
  setAddressSaved(Boolean(payload.profile))
}

/**
 * Блок способов показывается только у курьера. У пункта выдачи выбирать
 * нечего: цена и срок принадлежат самому пункту, они видны в его карточке.
 */
const isOptionsVisible = computed(() => state.value.method === 'courier')

const isResolved = computed(() => Boolean(state.value.profile))

const courierVariant = ref(defaultVariantId.value)

// Набор вариантов зависит от страны, и выбранного в новом наборе может не
// оказаться — тогда не выбрано ничего. Возвращаем выбор на первый.
watch(courierVariants, (list) => {
  if (!list.some((variant) => variant.id === courierVariant.value)) {
    courierVariant.value = defaultVariantId.value
  }
})

/**
 * Строка «Доставка» в итогах берёт цену отсюда. У пункта выдачи и у ещё не
 * заполненного адреса цены нет — строка обнуляется.
 */
watch(
  [courierVariant, isOptionsVisible, isResolved, courierVariants],
  () => {
    setDeliveryPrice(
      isOptionsVisible.value && isResolved.value ? priceOf(courierVariant.value) : 0,
    )
  },
  { immediate: true },
)
</script>

<template>
  <div class="cc3-combined-checkout">
    <Cc3ModalHeader :cart-count="summary.itemsCount" />
    <Cc3ModalSummaryBar />

    <div class="cc3-combined-checkout__body">
      <Cc3CombinedDeliverySection @state="onState" />

      <section v-if="isOptionsVisible" class="cc3-combined-checkout__options">
        <h2 class="cc3-combined-checkout__options-title">{{ text.optionsTitle }}</h2>

        <Cc3CombinedDeliveryOptions v-model="courierVariant" :resolved="isResolved" />

        <div v-if="isResolved" class="cc3-combined-checkout__slots">
          <Cc3InlineDeliverySlots :variant-id="courierVariant" />
        </div>
      </section>

      <Cc3CombinedPaymentMethods />
      <Cc3ModalOrderSummary />
      <Cc3ModalFooter />
    </div>
  </div>
</template>

<style lang="scss">
.cc3-combined-checkout {
  color-scheme: light;

  @include cc3-light-tokens;

  display: flex;
  flex-direction: column;

  margin: 0 auto;

  // Макет собран под 375px, но телефон бывает шире: на телефоне блок тянется
  // во всю ширину, а рамка в 375px остаётся только на десктопе, где стенд
  // смотрят как превью мобильного экрана.
  width: 100%;

  @include mediaMinWidth('sm') {
    max-width: 375px;
  }

  background-color: var(--st-content-background-color-default-solid-normal);

  // Шапка общая с модальной версией и рисует свою линию. Здесь линий нет,
  // поэтому гасим её, не трогая саму модальную.
  .cc3-modal-header {
    border-bottom: none;
  }

  // Разделителей между блоками нет, как в макете: блоки разделяют только
  // отступы.
  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--st-global-distance-space-inset-xl);

    padding-top: var(--st-global-distance-space-inset-2xl);

    // Сводка и подвал общие с модальной версией и своих отступов не знают.
    // Сводке нужны те же 12 сверху, что и остальным блокам с заголовком, а
    // подвалу — 4, чтобы зазор между ними остался прежним, 16.
    > .cc3-modal-order-summary {
      padding-top: var(--st-global-distance-space-inset-xl);
    }

    > .cc3-modal-footer {
      margin-top: var(--st-global-distance-space-inset-xs);
    }
  }

  // Отступы по краям как у остальных блоков страницы: сами списки
  // ничего не знают о том, куда их поставили.
  &__options {
    padding-right: var(--st-global-distance-space-inset-2xl);
    padding-left: var(--st-global-distance-space-inset-2xl);
  }

  // Слоты — общий компонент с инлайном, там отступ над ними свой. Здесь
  // список способов стоит рамкой, и слотам нужен воздух под ней.
  &__slots {
    padding-top: var(--st-global-distance-space-inset-2xl);
  }

  &__options-title {
    margin: 0;
    padding: var(--st-global-distance-space-inset-sm) 0
      calc(var(--st-global-distance-space-inset-xl) + var(--st-global-distance-space-inset-x));

    @include font('heading-xxs');

    color: var(--st-content-foreground-color-neutral-primary);
  }
}
</style>
