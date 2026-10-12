<script setup lang="ts">
import { computed } from 'vue'

import type { DeliveryProfileMethod } from './deliveryProfile'

/**
 * Свитчер «Курьер / Самовывоз» над карточкой доставки — общий для модального
 * и инлайн-концепта: поведение одно, различаются только подписи, поэтому
 * их передаёт сам концепт.
 *
 * Стоит над карточкой всегда, пока она собрана. Раньше сменить способ можно
 * было только через «Изменить», а респонденты читали «Курьер» в заголовке
 * карточки как название, а не как переключатель, и считали, что самовывоз
 * из такого состояния не выбрать.
 */
const props = defineProps<{
  active: DeliveryProfileMethod
  courierLabel: string
  pickupLabel: string
}>()

defineEmits<{ select: [method: DeliveryProfileMethod] }>()

const tabs = computed(() => [
  {
    method: 'courier' as const,
    label: props.courierLabel,
    isActive: props.active === 'courier',
  },
  {
    method: 'pickup' as const,
    label: props.pickupLabel,
    isActive: props.active === 'pickup',
  },
])
</script>

<template>
  <div class="cc3-modal-delivery-method-switch">
    <div class="cc3-modal-delivery-method-switch__group">
      <button
        v-for="tab in tabs"
        :key="tab.method"
        type="button"
        class="cc3-modal-delivery-method-switch__tab"
        :class="{ 'cc3-modal-delivery-method-switch__tab--active': tab.isActive }"
        :aria-pressed="tab.isActive"
        @click="$emit('select', tab.method)"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>

<style lang="scss">
.cc3-modal-delivery-method-switch {
  padding: var(--st-global-distance-space-inset-lg) var(--st-global-distance-space-inset-2xl)
    var(--st-global-distance-space-inset-xl);

  &__group {
    display: flex;
    gap: var(--st-global-distance-space-inset-none);

    padding: var(--st-global-distance-space-inset-xs);

    background-color: var(--st-content-background-color-neutral-onsubtle);
    border-radius: var(--st-global-radius-xl);
  }

  &__tab {
    flex: 1;

    padding: var(--st-global-distance-space-inset-md) var(--st-global-distance-space-inset-2xl);

    font-family: inherit;

    @include font('body-sm');

    color: var(--st-content-foreground-color-neutral-primary);
    background: none;
    border: none;
    border-radius: var(--st-global-radius-md);
    cursor: pointer;

    &--active {
      background-color: var(--st-content-background-color-default-solid-normal);
      box-shadow:
        0 1px 4px 0 rgb(4 8 13 / 8%),
        0 1px 2px 0 rgb(4 8 13 / 8%);
    }
  }
}
</style>
