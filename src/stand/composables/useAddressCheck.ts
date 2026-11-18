import { computed, onScopeDispose, ref, watch } from 'vue'
import type { Ref } from 'vue'

import { countries } from '../config/countries'
import type { FieldKey, StandField } from '../config/types'
import { resolveProvider } from '../suggest'
import { applySuggestion } from '../suggest/applySuggestion'
import type { FieldValues } from '../suggest/applySuggestion'
import {
  addressKey,
  compareAddress,
  composeCheckQuery,
  fixLabel,
  isCheckable,
  pickCandidate,
} from '../suggest/check'
import { isSuggestCoolingDown, startSuggestCooldown } from '../suggest/cooldown'
import type { AddressSuggestion } from '../suggest/types'
import { useStand } from './useStand'

/** Пауза после ухода из поля: человек часто сразу переходит в соседнее. */
const DELAY_MS = 600

/** Свой срок ожидания — как у подсказок: молчащий сервис не должен висеть. */
const TIMEOUT_MS = 5000

/**
 * Что показать под полем.
 *  - `value` — исправление-ссылка: «Вы имели в виду <value>?», по нажатию
 *    форма принимает его;
 *  - `note` — предупреждение без исправления: «Индекс может быть неверным»
 *    (исправление уже предложено под строкой адреса).
 */
export interface AddressFix {
  prefix: string
  value?: string
  suffix: string
  note?: string
}

/**
 * Проверка адреса, введённого руками, — подсказка «Вы имели в виду …?».
 *
 * Как у Shopify: проверяем, когда человек ушёл из адресного поля, и только
 * то, что он ввёл сам. Адрес из подсказки или с карты сервис уже знает —
 * форма сообщает об этом через trust(), и пока адрес не правили, вопросов
 * нет. Любая правка адреса снимает показанное исправление: оно было про
 * другой текст.
 *
 * Ответ не блокирует оплату и ничего не подставляет сам. Не ответил сервис,
 * нет ключа, не нашлось адреса — подсказки просто нет.
 */
export function useAddressCheck(
  values: Ref<FieldValues>,
  fields: Ref<StandField[]>,
  isActive: Ref<boolean>,
) {
  const { t, country } = useStand()

  const candidate = ref<AddressSuggestion>()
  const verdict = ref({ address: false, postal: false })

  /** Для какого адреса посчитан ответ — по нему понимаем, что он устарел. */
  const checkedKey = ref('')

  /** Адрес, который пришёл из подсказки, карты или принятого исправления. */
  const trustedKey = ref('')

  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined

  function cancel() {
    clearTimeout(timer)
    controller?.abort()
    timer = undefined
    controller = undefined
  }

  function clear() {
    candidate.value = undefined
    verdict.value = { address: false, postal: false }
    checkedKey.value = ''
  }

  const isEnabled = computed(() => Boolean(countries[country.value].addressCheck))

  const currentKey = computed(() => addressKey(values.value))

  // Правка адреса после ответа — ответ уже не про этот текст.
  watch(currentKey, (key) => {
    if (checkedKey.value && key !== checkedKey.value) {
      clear()
    }
  })

  watch(country, () => {
    cancel()
    clear()
    trustedKey.value = ''
  })

  async function run() {
    const snapshot = { ...values.value }
    const key = addressKey(snapshot)

    if (key === trustedKey.value || key === checkedKey.value) {
      return
    }

    if (isSuggestCoolingDown() || !isCheckable(snapshot, country.value)) {
      return
    }

    const current = new AbortController()
    const expiry = setTimeout(() => current.abort(), TIMEOUT_MS)

    controller = current

    try {
      const items = await resolveProvider(country.value).suggest(
        composeCheckQuery(snapshot, country.value),
        country.value,
        current.signal,
      )

      // Пока ждали ответа, адрес поправили — ответ про старый текст.
      if (current.signal.aborted || addressKey(values.value) !== key) {
        return
      }

      const found = pickCandidate(items, snapshot)

      checkedKey.value = key
      candidate.value = found
      verdict.value = found
        ? compareAddress(
            snapshot,
            found,
            country.value,
            fields.value.find((field) => field.key === 'region')?.options,
          )
        : { address: false, postal: false }
    } catch {
      if (!current.signal.aborted) {
        startSuggestCooldown()
      }
    } finally {
      clearTimeout(expiry)
    }
  }

  /** Человек ушёл из адресного поля — проверим, когда он остановится. */
  function schedule() {
    if (!isEnabled.value || !isActive.value) {
      return
    }

    cancel()
    timer = setTimeout(() => {
      void run()
    }, DELAY_MS)
  }

  /** Адрес пришёл не руками — проверять его незачем, пока его не правили. */
  function trust(next: FieldValues) {
    cancel()
    clear()
    trustedKey.value = addressKey(next)
  }

  const fixes = computed<Partial<Record<FieldKey, AddressFix>>>(() => {
    const found = candidate.value

    if (!found || checkedKey.value !== currentKey.value) {
      return {}
    }

    const prefix = t('address.check.prefix')
    const suffix = t('address.check.suffix')

    if (verdict.value.address) {
      return {
        street: { prefix, value: fixLabel(found), suffix },
        ...(verdict.value.postal
          ? { postal: { prefix, suffix, note: t('address.check.postalUnsure') } }
          : {}),
      }
    }

    if (verdict.value.postal) {
      return { postal: { prefix, value: found.postal, suffix } }
    }

    return {}
  })

  /**
   * Принять исправление. Адрес целиком раскладывается по полям той же
   * функцией, что и выбранная подсказка; индекс меняется только сам.
   * Квартиру, подъезд и остальное, что сервис не знает, не трогаем.
   */
  function accept(key: FieldKey): FieldValues {
    const found = candidate.value

    if (!found) {
      return values.value
    }

    const next =
      key === 'postal' && !verdict.value.address
        ? { ...values.value, postal: found.postal }
        : applySuggestion(values.value, 'street', found, fields.value, country.value)

    trust(next)

    return next
  }

  onScopeDispose(cancel)

  return { fixes, schedule, trust, accept }
}
