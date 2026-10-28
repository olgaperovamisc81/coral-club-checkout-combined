<script setup lang="ts">
/**
 * Плашка с пояснением внутри окон и блоков комбинированной версии: «рядом
 * нет пунктов», «такой адрес уже есть», «ничего не найдено». Один вид на все
 * случаи; тон меняет только цвет фона — нейтральный для сведений и тёплый
 * для предупреждений, после которых человеку нужно что-то решить.
 */
withDefaults(
  defineProps<{
    tone?: 'neutral' | 'warning'
  }>(),
  { tone: 'neutral' },
)
</script>

<template>
  <p class="cc3-combined-notice" :class="`cc3-combined-notice--tone--${tone}`" role="status">
    <slot />
  </p>
</template>

<style lang="scss">
.cc3-combined-notice {
  margin: 0;
  padding: var(--st-global-distance-space-inset-xl);

  @include font('body-md');

  color: var(--st-content-foreground-color-neutral-primary);
  background-color: var(--st-content-background-color-neutral-subtle);
  border-radius: var(--st-global-radius-md);

  &--tone--warning {
    background-color: var(--st-content-background-color-warning-subtle);
  }
}
</style>
