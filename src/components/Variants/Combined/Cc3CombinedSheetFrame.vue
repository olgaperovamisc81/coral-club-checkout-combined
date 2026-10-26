<script setup lang="ts">
/**
 * Рамка нижней шторки: скруглённый верх и «ручка». Содержимое — слот.
 * Шторка стоит у нижнего края родителя; растягивать её на всю высоту или
 * оставлять по размеру содержимого решает родитель через `tall`.
 */
defineProps<{
  /** Шторка почти на весь экран, как у поиска; иначе — по высоте содержимого. */
  tall?: boolean
}>()
</script>

<template>
  <div class="cc3-combined-sheet-frame" :class="{ 'cc3-combined-sheet-frame--tall': tall }">
    <span class="cc3-combined-sheet-frame__handle" />

    <slot />
  </div>
</template>

<style lang="scss">
.cc3-combined-sheet-frame {
  position: absolute;
  inset-block-end: 0;
  inset-inline: 0;
  z-index: 3;

  display: flex;
  flex-direction: column;

  padding-top: var(--st-global-distance-space-inset-lg);
  max-height: 100%;

  overflow: hidden;

  background-color: var(--st-content-background-color-default-solid-normal);
  border-radius: var(--st-global-radius-xl) var(--st-global-radius-xl) 0 0;
  box-shadow: 0 -4px 16px 0 rgb(4 51 103 / 11%);

  &--tall {
    height: calc(100% - 48px);
  }

  &__handle {
    flex-shrink: 0;

    align-self: center;
    margin-bottom: var(--st-global-distance-space-inset-xl);
    width: 48px;
    height: 4px;

    background-color: var(--st-content-background-color-neutral-mute);
    border-radius: var(--st-global-radius-pill);
  }
}
</style>
