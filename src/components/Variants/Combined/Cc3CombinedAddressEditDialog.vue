<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import Cc3Icon from '@/components/Icon/Cc3Icon.vue'
import { useStand } from '@/stand/composables/useStand'

import Cc3ModalConfirmDialog from '../Modal/Cc3ModalConfirmDialog.vue'
import type { DeliveryProfile } from '../Modal/deliveryProfile'
import Cc3CombinedAddressForm from './Cc3CombinedAddressForm.vue'

/**
 * Правка сохранённого адреса курьера — окном на весь экран. Внутри та же
 * форма, что на странице, только открытая сразу с данными адреса; внизу
 * окна, всегда на виду, «Сохранить изменения» и «Удалить». Пока обязательные поля не заполнены,
 * сохранить нельзя: адрес без них страница всё равно не примет.
 */
const props = defineProps<{
  editProfile: DeliveryProfile
}>()

const emit = defineEmits<{
  close: []
  confirm: [profile: DeliveryProfile]
  delete: [id: string]
}>()

const { t } = useStand()

const text = computed(() => ({
  title: t('combined.editTitle'),
  close: t('common.close'),
  save: t('combined.saveChanges'),
  remove: t('common.delete'),
}))

const draft = ref<{ profile: DeliveryProfile; complete: boolean }>()
const isDeleteConfirmOpen = ref(false)

const isSaveDisabled = computed(() => !draft.value?.complete)

function onChange(payload: { profile: DeliveryProfile; complete: boolean }) {
  draft.value = payload
}

function save() {
  if (draft.value?.complete) {
    emit('confirm', draft.value.profile)
  }
}

function deleteProfile() {
  isDeleteConfirmOpen.value = false
  emit('delete', props.editProfile.id)
}

/**
 * Пока окно открыто, страница под ним не прокручивается — иначе палец,
 * не попавший по форме, возит чекаут за ней.
 */
let bodyOverflow = ''

onMounted(() => {
  bodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflow
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="cc3-combined-address-edit-dialog"
      role="dialog"
      aria-modal="true"
      @keydown="onKeydown"
    >
      <div class="cc3-combined-address-edit-dialog__header">
        <h2 class="cc3-combined-address-edit-dialog__title">{{ text.title }}</h2>

        <button
          type="button"
          class="cc3-combined-address-edit-dialog__close"
          :aria-label="text.close"
          @click="emit('close')"
        >
          <Cc3Icon name="x-md" :size="24" />
        </button>
      </div>

      <div class="cc3-combined-address-edit-dialog__body">
        <Cc3CombinedAddressForm :edit-profile="editProfile" @change="onChange" />

        <!-- Кнопки прилипают к низу окна: форма длинная и уходит под них. -->
        <div class="cc3-combined-address-edit-dialog__actions">
          <button
            type="button"
            class="cc3-combined-address-edit-dialog__save"
            :disabled="isSaveDisabled"
            @click="save"
          >
            {{ text.save }}
          </button>

          <button
            type="button"
            class="cc3-combined-address-edit-dialog__delete"
            @click="isDeleteConfirmOpen = true"
          >
            {{ text.remove }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Cc3ModalConfirmDialog
    v-if="isDeleteConfirmOpen"
    message="Do you want to delete this address?"
    @confirm="deleteProfile"
    @cancel="isDeleteConfirmOpen = false"
  />
</template>

<style lang="scss">
.cc3-combined-address-edit-dialog {
  // Teleport выносит окно в body, вне .cc3-combined-checkout — цветовая схема
  // и токены не наследуются, повторяем объявления.
  color-scheme: light;

  @include cc3-light-tokens;

  position: fixed;
  inset: 0;
  z-index: 100;

  display: flex;
  flex-direction: column;

  width: 100%;

  @include mediaMinWidth('sm') {
    max-width: 375px;
  }

  height: 100dvh;
  margin: 0 auto;

  background-color: var(--st-content-background-color-default-solid-normal);

  &__header {
    position: relative;

    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;

    padding: var(--st-global-distance-space-inset-2xl);

    border-bottom: 1px solid var(--st-content-border-color-neutral-onsubtle);
  }

  &__title {
    margin: 0;

    @include font('label-md');

    color: var(--st-content-foreground-color-neutral-primary);
  }

  &__close {
    position: absolute;
    inset-inline-end: var(--st-global-distance-space-inset-2xl);
    inset-block-start: 50%;

    display: flex;

    padding: 0;

    color: var(--st-content-foreground-color-neutral-primary);
    background: none;
    border: none;
    cursor: pointer;
    transform: translateY(-50%);
  }

  // Форма длиннее экрана: прокручивается тело, а кнопки липнут к его низу.
  &__body {
    flex: 1;

    min-height: 0;

    overflow-y: auto;
    overscroll-behavior: contain;
  }

  // Кнопки прилипают к низу окна и видны всегда, а форма прокручивается под
  // ними; в конце формы они встают на своё место. Фон нужен, чтобы поля не
  // просвечивали сквозь кнопки.
  &__actions {
    position: sticky;
    inset-block-end: 0;
    z-index: 1;

    display: flex;
    flex-direction: column;
    gap: var(--st-global-distance-space-inset-md);

    padding: var(--st-global-distance-space-inset-xl) var(--st-global-distance-space-inset-2xl)
      var(--st-global-distance-space-inset-2xl);

    background-color: var(--st-content-background-color-default-solid-normal);
  }

  &__save,
  &__delete {
    display: flex;
    align-items: center;
    justify-content: center;

    padding: var(--st-global-distance-space-inset-xl);
    width: 100%;

    font-family: inherit;

    @include font('label-md');

    border: none;
    border-radius: var(--st-global-radius-pill);
    cursor: pointer;
  }

  &__save {
    color: var(--st-action-foreground-color-onprimary-normal);
    background-color: var(--st-action-background-color-positive-normal);

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__delete {
    color: var(--st-action-foreground-color-neutral-normal);
    background: none;
  }
}
</style>
