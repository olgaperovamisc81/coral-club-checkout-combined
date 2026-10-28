<script setup lang="ts">
import { computed } from 'vue'

import Cc3Icon from '@/components/Icon/Cc3Icon.vue'
import { useStand } from '@/stand/composables/useStand'

/**
 * Строка поиска адреса под картой самовывоза. Выглядит и ведёт себя как поле,
 * но печатать в ней нельзя: нажатие открывает шторку поиска, где курсор уже
 * стоит в поле, а подсказки идут списком. Так на маленьком экране клавиатура
 * не закрывает карту, а подсказкам хватает места.
 *
 * Выбранный адрес остаётся в строке, чтобы было видно, от чего считаются
 * ближайшие пункты.
 */
defineProps<{
  /** Адрес, выбранный в поиске; пока не выбран — строка пустая. */
  address: string
}>()

const emit = defineEmits<{
  open: []
}>()

const { t } = useStand()

const text = computed(() => ({
  placeholder: t('concept.common.findAddress'),
}))
</script>

<template>
  <div class="cc3-combined-pickup-search-field" @click="emit('open')">
    <Cc3Icon name="search-md" :size="20" class="cc3-combined-pickup-search-field__icon" />

    <input
      :value="address"
      type="text"
      readonly
      :placeholder="text.placeholder"
      :aria-label="text.placeholder"
      class="cc3-combined-pickup-search-field__input"
      @focus="emit('open')"
    />
  </div>
</template>

<style lang="scss">
.cc3-combined-pickup-search-field {
  display: flex;
  align-items: center;
  gap: var(--st-global-distance-space-stack-sm);

  padding: 0 var(--st-global-distance-space-inset-md);
  height: 52px;

  background-color: var(--st-content-background-color-neutral-primary);
  border: 2px solid var(--st-content-border-color-neutral-implicit);
  border-radius: var(--st-global-radius-sm);
  cursor: text;

  &__icon {
    flex-shrink: 0;

    color: var(--st-content-foreground-color-neutral-secondary);
  }

  &__input {
    flex: 1;

    min-width: 0;
    padding: 0;

    font-family: inherit;

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);
    background: none;
    border: none;
    cursor: inherit;
    text-overflow: ellipsis;

    &::placeholder {
      color: var(--st-content-foreground-color-neutral-secondary);
    }

    &:focus {
      outline: none;
    }
  }
}
</style>
