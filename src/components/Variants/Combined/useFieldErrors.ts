import { computed, ref, type Ref } from 'vue'

import { useStand } from '@/stand/composables/useStand'
import type { FieldKey, StandField } from '@/stand/config/types'

import { checkField } from './fieldRules'

/**
 * Ошибки полей формы: что не так и когда это показывать.
 *
 * Ошибка считается всегда, а показывается в двух случаях: человек уже ушёл из
 * этого поля или нажал кнопку, которая идёт дальше. Пустая форма при загрузке
 * не красная: людям она читается как упрёк, а не как подсказка.
 */
export function useFieldErrors(
  fields: Ref<StandField[]>,
  values: Ref<Partial<Record<FieldKey, string>>>,
) {
  const { country, t } = useStand()

  const touched = ref<FieldKey[]>([])
  const isSubmitAttempted = ref(false)

  const messages = computed(() => {
    const result: Partial<Record<FieldKey, string>> = {}

    for (const field of fields.value) {
      const error = checkField(
        field.key,
        values.value[field.key],
        country.value,
        Boolean(field.required),
      )

      if (error) {
        result[field.key] = t(error.key, error.params)
      }
    }

    return result
  })

  /** Текст ошибки, который надо показать сейчас. */
  const visible = computed(() => {
    const result: Partial<Record<FieldKey, string>> = {}

    for (const [key, message] of Object.entries(messages.value) as [FieldKey, string][]) {
      if (isSubmitAttempted.value || touched.value.includes(key)) {
        result[key] = message
      }
    }

    return result
  })

  /** Ошибок нет совсем: все обязательные заполнены и всё в нужном формате. */
  const isValid = computed(() => Object.keys(messages.value).length === 0)

  function touch(key: FieldKey) {
    if (!touched.value.includes(key)) {
      touched.value = [...touched.value, key]
    }
  }

  /** Показать все ошибки разом — после нажатия «Продолжить» и подобных. */
  function reveal() {
    isSubmitAttempted.value = true
  }

  return { messages, visible, isValid, touch, reveal }
}
