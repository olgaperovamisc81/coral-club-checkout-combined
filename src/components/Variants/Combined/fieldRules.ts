import type { CountryCode, FieldKey } from '@/stand/config/types'

/**
 * Правила проверки полей формы адреса и получателя.
 *
 * Правило возвращает ключ сообщения словаря, а не текст: тексты живут в
 * src/stand/i18n. Пустое обязательное поле и неверный формат — разные
 * сообщения: «Укажите индекс» и «Проверьте индекс, например 125009» говорят
 * человеку разное.
 */
export type FieldRuleResult = { key: string; params?: Record<string, string> } | undefined

type PostalRule = { pattern: RegExp; example: string }

const postalRules: Record<CountryCode, PostalRule> = {
  ru: { pattern: /^\d{6}$/, example: '125009' },
  kz: { pattern: /^\d{6}$/, example: '050000' },
  us: { pattern: /^\d{5}(-\d{4})?$/, example: '10118' },
  de: { pattern: /^\d{5}$/, example: '10115' },
  pl: { pattern: /^\d{2}-\d{3}$/, example: '00-950' },
  cz: { pattern: /^\d{3} ?\d{2}$/, example: '110 00' },
}

/** Какое сообщение просить, когда поле обязательное и пустое. */
const requiredKeys: Partial<Record<FieldKey, string>> = {
  street: 'error.street.required',
  house: 'error.house.required',
  postal: 'error.postal.required',
  city: 'error.city.required',
  region: 'error.region.required',
  recipientName: 'error.name.required',
  recipientFirstName: 'error.firstName.required',
  recipientLastName: 'error.lastName.required',
  recipientPhone: 'error.phone.required',
  recipientEmail: 'error.email.required',
}

/** Запасное сообщение для полей, которым своего не нашлось. */
const FALLBACK_REQUIRED = 'combined.fieldRequired'

/**
 * Проверка одного поля. `required` приходит из конфига страны: пустое
 * необязательное поле ошибкой не считается, а заполненное проверяется по
 * формату в любом случае.
 */
export function checkField(
  key: FieldKey,
  rawValue: string | undefined,
  country: CountryCode,
  required: boolean,
): FieldRuleResult {
  const value = (rawValue ?? '').trim()

  if (!value) {
    return required ? { key: requiredKeys[key] ?? FALLBACK_REQUIRED } : undefined
  }

  switch (key) {
    case 'house':
      return /\d/.test(value) ? undefined : { key: 'error.house.format' }

    case 'postal': {
      const rule = postalRules[country]

      return rule.pattern.test(value)
        ? undefined
        : { key: 'error.postal.format', params: { example: rule.example } }
    }

    // Имя из одного слова неверно только там, где получатель обязателен: у
    // необязательного (самовывоз) пишут как угодно.
    case 'recipientName':
      return !required || /\S+\s+\S+/.test(value) ? undefined : { key: 'error.name.required' }

    // Телефон по стране не проверяем: на тестовом стенде вводят любой номер,
    // а подсказка с кодом страны стоит в самом поле. Остаётся только «не пусто».

    case 'recipientEmail':
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? undefined : { key: 'error.email.format' }

    default:
      return undefined
  }
}
