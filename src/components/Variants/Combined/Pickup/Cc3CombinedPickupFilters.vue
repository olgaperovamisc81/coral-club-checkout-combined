<script setup lang="ts">
/**
 * Фильтр пунктов по службам доставки — ряд таблеток с горизонтальной
 * прокруткой. Стоит под картой и под полем адреса в списке.
 */
type PickupFilter = {
  id: string
  label: string
  active: boolean
}

defineProps<{
  filters: PickupFilter[]
  /**
   * Плавающий вид над картой: таблетки сплошные, без рамки и подложки, чтобы
   * карта была видна между ними и под ними.
   */
  floating?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
}>()
</script>

<template>
  <div
    class="cc3-combined-pickup-filters"
    :class="{ 'cc3-combined-pickup-filters--floating': floating }"
  >
    <button
      v-for="filter in filters"
      :key="filter.id"
      type="button"
      class="cc3-combined-pickup-filters__chip"
      :class="{ 'cc3-combined-pickup-filters__chip--active': filter.active }"
      @click="emit('select', filter.id)"
    >
      {{ filter.label }}
    </button>
  </div>
</template>

<style lang="scss">
.cc3-combined-pickup-filters {
  display: flex;
  flex-shrink: 0;
  flex-wrap: nowrap;
  gap: var(--st-global-distance-space-inset-md);

  padding: var(--st-global-distance-space-inset-xl) var(--st-global-distance-space-inset-2xl);

  overflow-x: auto;

  background-color: var(--st-content-background-color-default-solid-normal);

  &--floating {
    position: absolute;
    inset-block-end: 0;
    inset-inline: 0;
    z-index: 2;

    padding-block-end: var(--st-global-distance-space-inset-4xl);

    background: none;

    .cc3-combined-pickup-filters__chip {
      border-color: transparent;
      box-shadow: 0 1px 4px 0 rgb(4 8 13 / 14%);

      &--active {
        color: var(--st-action-foreground-color-onprimary-normal);
        background-color: var(--st-action-background-color-positive-normal);
        box-shadow: none;
      }
    }
  }

  &__chip {
    flex-shrink: 0;

    padding: var(--st-global-distance-space-inset-sm) var(--st-global-distance-space-inset-xl);

    font-family: inherit;

    @include font('label-md');

    color: var(--st-content-foreground-color-neutral-primary);
    background-color: var(--st-content-background-color-default-solid-normal);
    border: 1px solid var(--st-content-border-color-neutral-implicit);
    border-radius: var(--st-global-radius-pill);
    cursor: pointer;

    &--active {
      color: var(--st-action-foreground-color-positive-normal);
      border-color: var(--st-action-foreground-color-positive-normal);
    }
  }
}
</style>
