<script setup lang="ts">
import { computed } from 'vue'

import { useAddressGuard } from '@/composables/useAddressGuard'
import { useCourierVariants } from '@/composables/useCourierVariants'
import { useStand } from '@/stand/composables/useStand'

/**
 * Способ доставки курьера в комбинированной версии: сгруппированный список
 * вместо отдельных карточек. Пока адрес не заполнен, вместо цен стоит
 * плашка-подсказка, и она же объясняет, чего не хватает для оплаты:
 * заполнение формы адреса здесь и есть «сохранение», отдельной кнопки нет.
 *
 * Заголовок рисует тот, кто ставит блок, — как и у остальных блоков
 * страницы.
 */
const props = defineProps<{
  /** Адрес заполнен — показываем варианты, иначе плашку. */
  resolved: boolean
}>()

const selected = defineModel<string>({ default: 'standard' })

const { t } = useStand()
const { courierVariants } = useCourierVariants()
const { isWarningVisible } = useAddressGuard()

const text = computed(() => ({
  hint: t('delivery.variants.hint'),
  required: t('combined.addressRequired'),
}))

const isWarning = computed(() => !props.resolved && isWarningVisible.value)
</script>

<template>
  <div v-if="resolved" class="cc3-combined-delivery-options">
    <label
      v-for="variant in courierVariants"
      :key="variant.id"
      class="cc3-combined-delivery-options__row"
    >
      <span class="cc3-combined-delivery-options__content">
        <span class="cc3-combined-delivery-options__title">{{ variant.title }}</span>
        <span v-if="variant.caption" class="cc3-combined-delivery-options__caption">
          {{ variant.caption }}
        </span>
      </span>

      <input
        v-model="selected"
        type="radio"
        name="cc3-combined-courier-variant"
        :value="variant.id"
        class="cc3-combined-delivery-options__radio"
      />
    </label>
  </div>

  <div v-else class="cc3-combined-delivery-options__placeholder">
    <p v-if="isWarning" class="cc3-combined-delivery-options__warning" role="alert">
      {{ text.required }}
    </p>

    <p class="cc3-combined-delivery-options__hint">{{ text.hint }}</p>
  </div>
</template>

<style lang="scss">
.cc3-combined-delivery-options {
  @include cc3-combined-choice-list;

  &__row {
    @include cc3-combined-choice-row;
  }

  &__content {
    display: flex;
    flex-direction: column;
  }

  &__title {
    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__caption {
    @include font('body-sm');

    color: var(--st-content-foreground-color-neutral-secondary);
  }

  &__radio {
    @include cc3-modal-radio-control;
  }

  &__placeholder {
    display: flex;
    flex-direction: column;
    gap: var(--st-global-distance-space-inset-md);
  }

  &__hint {
    margin: 0;
    padding: var(--st-global-distance-space-inset-xl) var(--st-global-distance-space-inset-2xl);

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-tetriary);
    background-color: var(--st-content-background-color-neutral-subtle);
    border-radius: var(--st-global-radius-md);
  }

  // Без рамки и подложки: в рамке строка читается как ещё одна кнопка,
  // а нажимать на неё нечего.
  &__warning {
    margin: 0;

    @include font('body-sm');

    color: var(--st-content-foreground-color-negative-primary);
  }
}
</style>
