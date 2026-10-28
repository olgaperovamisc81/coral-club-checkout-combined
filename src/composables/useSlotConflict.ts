import { computed, ref } from 'vue'

/**
 * Имитация «слот пропал, пока человек оформлял заказ». Настоящего склада
 * интервалов у стенда нет, поэтому сценарий задан правилом: при первой
 * оплате с выбранным слотом этот слот оказывается занятым, из ряда он
 * убирается, а человека возвращают к выбору. Срабатывает один раз за
 * прогон — повторная оплата с новым слотом проходит.
 *
 * Взводит только комбинированная версия, и только там, где слоты вообще
 * есть. У остальных версий проверка выключена и ничего не меняет.
 * Состояние на уровне модуля: кнопка оплаты и ряд слотов стоят в разных
 * ветках дерева и через props друг друга не видят.
 */
type SlotSelection = { date: string; time: string }

const isArmed = ref(false)
const selection = ref<SlotSelection>()
const taken = ref<SlotSelection>()
const isMessageVisible = ref(false)
let hasTriggered = false

/** Прокрутка к ряду слотов: её регистрирует страница. */
const anchor = ref<(() => void) | undefined>()

export function useSlotConflict() {
  function arm(value: boolean) {
    isArmed.value = value

    if (!value) {
      isMessageVisible.value = false
      anchor.value = undefined
    }
  }

  function reportSelection(value: SlotSelection | undefined) {
    selection.value = value
  }

  function registerAnchor(value: (() => void) | undefined) {
    anchor.value = value
  }

  /** Можно ли оплачивать: если слот «пропал», возвращает к выбору. */
  function ensureSlotAvailable(): boolean {
    isMessageVisible.value = false

    if (!isArmed.value || hasTriggered || !selection.value) {
      return true
    }

    hasTriggered = true
    taken.value = { ...selection.value }
    isMessageVisible.value = true
    anchor.value?.()

    return false
  }

  return {
    takenSlot: computed(() => taken.value),
    isMessageVisible: computed(() => isMessageVisible.value),
    arm,
    reportSelection,
    registerAnchor,
    ensureSlotAvailable,
  }
}
