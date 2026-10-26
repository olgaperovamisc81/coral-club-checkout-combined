<script setup lang="ts">
import { computed } from 'vue'

import { useStand } from '@/stand/composables/useStand'

import Cc3CombinedPickupSheetFrame from './Cc3CombinedPickupSheetFrame.vue'

/**
 * Шторка выбранного пункта: название, адрес, получатель, срок и цена, часы
 * работы и кнопка «Привезти сюда». Появляется над картой по нажатию на метку.
 */
defineProps<{
  title: string
  address: string
  recipient: string
  meta: string
}>()

const emit = defineEmits<{
  confirm: []
}>()

const { t } = useStand()

const text = computed(() => ({
  hours: t('pickup.hours'),
  hoursWeekday: t('pickup.hours.weekday'),
  hoursWeekend: t('pickup.hours.weekend'),
  confirm: t('combined.bringHere'),
}))
</script>

<template>
  <Cc3CombinedPickupSheetFrame>
    <div class="cc3-combined-pickup-sheet">
      <h3 class="cc3-combined-pickup-sheet__title">{{ title }}</h3>

      <div class="cc3-combined-pickup-sheet__point">
        <p class="cc3-combined-pickup-sheet__address">{{ address }}</p>
        <p v-if="recipient" class="cc3-combined-pickup-sheet__recipient">{{ recipient }}</p>
      </div>

      <p class="cc3-combined-pickup-sheet__recipient">{{ meta }}</p>

      <div class="cc3-combined-pickup-sheet__hours">
        <p class="cc3-combined-pickup-sheet__hours-title">{{ text.hours }}</p>
        <p class="cc3-combined-pickup-sheet__hours-text">{{ text.hoursWeekday }}</p>
        <p class="cc3-combined-pickup-sheet__hours-text">{{ text.hoursWeekend }}</p>
      </div>

      <button type="button" class="cc3-combined-pickup-sheet__confirm" @click="emit('confirm')">
        {{ text.confirm }}
      </button>

    </div>
  </Cc3CombinedPickupSheetFrame>
</template>

<style lang="scss">
.cc3-combined-pickup-sheet {
  display: flex;
  flex-direction: column;
  gap: var(--st-global-distance-space-inset-xl);

  padding: var(--st-global-distance-space-inset-2xl);

  &__title {
    margin: 0;

    @include font('heading-xxs');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__point {
    display: flex;
    flex-direction: column;
  }

  &__address {
    margin: 0;

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  // Получатель и срок с ценой — зелёным, как в блоке доставки на странице.
  &__recipient {
    margin: 0;

    @include font('body-md');

    color: var(--st-content-foreground-color-positive-primary);
  }

  &__hours {
    display: flex;
    flex-direction: column;
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

  &__confirm {
    display: flex;
    align-items: center;
    justify-content: center;

    padding: var(--st-global-distance-space-inset-xl);
    width: 100%;

    font-family: inherit;

    @include font('label-md');

    color: var(--st-action-foreground-color-onprimary-normal);
    background-color: var(--st-action-background-color-positive-normal);
    border: none;
    border-radius: var(--st-global-radius-pill);
    cursor: pointer;
  }
}
</style>
