<script setup lang="ts">
defineProps<{
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /**
   * Необратимое действие: главной становится «Отмена», а подтверждение
   * остаётся обычной кнопкой — случайное нажатие не должно ничего стирать.
   */
  destructive?: boolean
}>()

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div class="cc3-modal-confirm-dialog" role="alertdialog" aria-modal="true">
      <div class="cc3-modal-confirm-dialog__backdrop" @click="$emit('cancel')" />

      <div class="cc3-modal-confirm-dialog__card">
        <p class="cc3-modal-confirm-dialog__message">{{ message }}</p>

        <button
          type="button"
          class="cc3-modal-confirm-dialog__confirm"
          :class="{ 'cc3-modal-confirm-dialog__confirm--quiet': destructive }"
          @click="$emit('confirm')"
        >
          {{ confirmLabel ?? 'Delete' }}
        </button>

        <button
          type="button"
          class="cc3-modal-confirm-dialog__cancel"
          :class="{ 'cc3-modal-confirm-dialog__cancel--primary': destructive }"
          @click="$emit('cancel')"
        >
          {{ cancelLabel ?? 'Cancel' }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss">
.cc3-modal-confirm-dialog {
  // Teleport выносит попап в body — цветовая схема и токены не наследуются,
  // повторяем те же объявления, что и в Cc3ModalDeliveryDialog.
  color-scheme: light;

  @include cc3-light-tokens;

  position: fixed;
  inset: 0;
  z-index: 200;

  display: flex;
  align-items: center;
  justify-content: center;

  &__backdrop {
    position: absolute;
    inset: 0;

    background-color: rgb(9 22 32 / 40%);
  }

  &__card {
    position: relative;

    display: flex;
    flex-direction: column;
    gap: var(--st-global-distance-space-inset-xl);

    margin: 0 var(--st-global-distance-space-inset-2xl);
    padding: var(--st-global-distance-space-inset-2xl);
    width: 100%;
    max-width: 340px;

    background-color: var(--st-content-background-color-default-solid-normal);
    border-radius: var(--st-global-radius-2xl);
    box-shadow: 0 8px 24px 0 rgb(4 8 13 / 16%);
  }

  &__message {
    margin: 0;

    @include font('body-md');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__confirm {
    display: flex;
    align-items: center;
    justify-content: center;

    padding: var(--st-global-distance-space-inset-lg);
    width: 100%;
    height: 44px;

    font-family: inherit;

    @include font('label-md');

    color: var(--st-action-foreground-color-onprimary-normal);
    background-color: var(--st-action-background-color-positive-normal);
    border: none;
    border-radius: var(--st-global-radius-md);
    cursor: pointer;
  }

  &__cancel {
    display: flex;
    align-items: center;
    justify-content: center;

    padding: var(--st-global-distance-space-inset-lg);
    width: 100%;
    height: 44px;

    font-family: inherit;

    @include font('label-md');

    color: var(--st-action-foreground-color-neutral-normal);
    background-color: var(--st-content-background-color-default-solid-normal);
    border: 1px solid var(--st-action-border-color-neutral-subtle-normal);
    border-radius: var(--st-global-radius-md);
    cursor: pointer;
  }

  // Необратимое действие: «Отмена» заливается и встаёт выше, подтверждение
  // становится контурной кнопкой под ней.
  &__confirm--quiet {
    order: 2;

    color: var(--st-action-foreground-color-neutral-normal);
    background-color: var(--st-content-background-color-default-solid-normal);
    border: 1px solid var(--st-action-border-color-neutral-subtle-normal);
  }

  &__cancel--primary {
    order: 1;

    color: var(--st-action-foreground-color-onprimary-normal);
    background-color: var(--st-action-background-color-positive-normal);
    border: none;
  }
}
</style>
