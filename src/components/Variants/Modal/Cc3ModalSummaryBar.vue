<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import Cc3Icon from '@/components/Icon/Cc3Icon.vue'
import { useCheckout } from '@/composables/useCheckout'
import { useSummarySticky } from '@/composables/useSummarySticky'
import { useStand } from '@/stand/composables/useStand'

import Cc3ModalOrderSummaryBody from './Cc3ModalOrderSummaryBody.vue'

/**
 * Шапка сводки заказа над телом чекаута.
 *
 * Стоит в начале страницы и уезжает вверх вместе с ней: прилипшая полоса
 * занимала бы место на каждом экране. По нажатию раскрывается в полную
 * сводку — ту же самую, что и внизу.
 *
 * До этого кнопка переключала флаг, который в концептах никто не читал:
 * шеврон поворачивался, и больше ничего не происходило.
 */
const { t } = useStand()
const { summary } = useCheckout()
const { isExpanded, toggle, setBarHeight, resetSticky } = useSummarySticky()

const text = computed(() => ({
  title: t('summary.title'),
}))

const headRef = ref<HTMLElement>()

// Линия, на которой полоса отдаёт сумму блоку сводки, проходит по её
// нижнему краю. Высоту берём с живого элемента, а не числом: подписи
// переводятся, и в немецком полоса выше.
onMounted(() => setBarHeight(headRef.value?.offsetHeight ?? 0))

onBeforeUnmount(resetSticky)
</script>

<template>
  <div class="cc3-modal-summary-bar">
    <button ref="headRef" type="button" class="cc3-modal-summary-bar__head" @click="toggle">
      <span class="cc3-modal-summary-bar__label">
        {{ text.title }}
        <Cc3Icon
          name="chevron-down"
          :size="24"
          class="cc3-modal-summary-bar__chevron"
          :class="{ 'cc3-modal-summary-bar__chevron--open': isExpanded }"
        />
      </span>

      <span class="cc3-modal-summary-bar__total">{{ summary.totalFormatRounded }}</span>
    </button>
  </div>

  <!--
    Раскрытая сводка стоит в обычном потоке страницы: она раздвигает
    содержимое и уезжает вверх вместе с ним, а не висит поверх.
  -->
  <div v-if="isExpanded" class="cc3-modal-summary-bar__panel">
    <Cc3ModalOrderSummaryBody compact />
  </div>
</template>

<style lang="scss">
.cc3-modal-summary-bar {
  // Непрозрачная основа под полосой: токен neutral-disable — полупрозрачный
  // налёт (8% синего), и под ним должна быть белая страница.
  background-color: var(--st-content-background-color-default-solid-normal);

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--st-global-distance-space-inset-xl);

    padding: var(--st-global-distance-space-inset-xl) var(--st-global-distance-space-inset-2xl);
    width: 100%;

    text-align: left;
    background-color: var(--st-content-background-color-neutral-disable);
    border: none;
    cursor: pointer;
  }

  &__label {
    display: flex;
    align-items: center;
    gap: var(--st-global-distance-space-inset-md);

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__chevron {
    transition: transform 0.15s ease;

    &--open {
      transform: rotate(180deg);
    }
  }

  &__total {
    @include font('heading-xxs');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__panel {
    // Серая подложка чуть светлее самой полосы: панель отличается от белой
    // страницы, но не спорит с полосой над ней. Готового токена между surface
    // (4%, почти не видно) и disable (8%, как у полосы) нет, поэтому берём
    // три четверти от disable — около 6%. Подложка непрозрачная: панель
    // уезжает под полосу и содержимое, а токен полупрозрачный — белая основа
    // под ним ничего не пропускает. Тени нет — панель отделяет линия снизу.
    background-color: var(--st-content-background-color-default-solid-normal);
    background-image: linear-gradient(
      color-mix(in srgb, var(--st-content-background-color-neutral-disable) 75%, transparent),
      color-mix(in srgb, var(--st-content-background-color-neutral-disable) 75%, transparent)
    );
    border-bottom: 1px solid var(--st-content-border-color-neutral-implicit);
  }
}
</style>
