import type { CountryCode, FieldKey } from '../config/types'
import type { FieldValues } from './applySuggestion'
import type { AddressSuggestion } from './types'

/**
 * Сверка адреса, введённого руками, с тем, что знает сервис адресов.
 *
 * Сценарий как у Shopify: человек не выбрал подсказку, а дописал адрес сам —
 * с опечаткой в улице или чужим индексом. Мы спрашиваем того же провайдера,
 * что даёт подсказки, и если его лучший ответ расходится с введённым,
 * предлагаем исправление под полем: «Вы имели в виду …?». Ничего не
 * блокируем и не подставляем без спроса — решает человек.
 *
 * Здесь только чистые функции: собрать запрос, выбрать ответ, сравнить.
 * Когда спрашивать и что показать — в useAddressCheck.
 */

/** Рынки, где адрес читают от города к дому. */
const cityFirst: CountryCode[] = ['ru', 'kz']

/** Поля, изменение которых делает прошлую проверку устаревшей. */
export const CHECKED_KEYS: FieldKey[] = ['street', 'house', 'postal', 'city', 'region']

/** Слепок адресной части формы: по нему понимаем, менялся ли адрес. */
export function addressKey(values: FieldValues): string {
  return CHECKED_KEYS.map((key) => (values[key] ?? '').trim().toLowerCase()).join('|')
}

/**
 * Хватит ли введённого, чтобы спрашивать. Одна строка без города и индекса
 * даёт сервису угадывать город — подсказка будет про чужой адрес.
 */
export function isCheckable(values: FieldValues, country: CountryCode): boolean {
  const street = (values.street ?? '').trim()

  if (street.length < 3) {
    return false
  }

  // В России город стоит в самой строке адреса, а дом — отдельным полем.
  if (country === 'ru') {
    return Boolean((values.house ?? '').trim())
  }

  return Boolean((values.city ?? '').trim() || (values.postal ?? '').trim())
}

/**
 * Запрос к провайдеру из того, что ввёл человек.
 *
 * Индекс в запрос не кладём, если есть город: неверный индекс тянет поиск
 * в чужой район, а проверить его мы как раз и хотим. Город не повторяем,
 * если он уже стоит в строке адреса.
 */
export function composeCheckQuery(values: FieldValues, country: CountryCode): string {
  const street = (values.street ?? '').trim()
  const house = (values.house ?? '').trim()
  const city = (values.city ?? '').trim()
  const region = (values.region ?? '').trim()
  const postal = (values.postal ?? '').trim()

  const hasCityInLine = city !== '' && street.toLowerCase().includes(city.toLowerCase())
  const cityPart = hasCityInLine ? '' : city
  const tail = cityPart ? '' : postal

  const parts = cityFirst.includes(country)
    ? [cityPart, street, house, tail]
    : [street, house, cityPart, region, tail]

  return parts.filter(Boolean).join(', ')
}

/**
 * Сокращения, которые пишут по-разному, а значат одно. Сравнивать «W 34th St»
 * и «West 34th Street» как разные адреса — значит показывать человеку его же
 * адрес в другом написании, это шум.
 */
const ALIASES: Record<string, string> = {
  st: 'street',
  str: 'street',
  ave: 'avenue',
  av: 'avenue',
  rd: 'road',
  blvd: 'boulevard',
  dr: 'drive',
  ln: 'lane',
  ct: 'court',
  pl: 'place',
  sq: 'square',
  hwy: 'highway',
  pkwy: 'parkway',
  w: 'west',
  e: 'east',
  n: 'north',
  s: 'south',
  strasse: 'straße',
  'пр-кт': 'проспект',
  просп: 'проспект',
  пр: 'проспект',
  пер: 'переулок',
  'б-р': 'бульвар',
  бул: 'бульвар',
  ш: 'шоссе',
  наб: 'набережная',
  пл: 'площадь',
  мкр: 'микрорайон',
  'мкр-н': 'микрорайон',
  корп: 'к',
  корпус: 'к',
  стр: 'с',
  строение: 'с',
}

/** Слова-типы, которые ничего не говорят о самом адресе. */
const NOISE = new Set([
  'ул',
  'улица',
  'г',
  'город',
  'д',
  'дом',
  'обл',
  'область',
  'респ',
  'ul',
  'ulica',
])

/** Квартира в строке адреса: её сервис не знает, сравнивать её не с чем. */
const UNIT_MARKERS = new Set([
  'apt',
  'apartment',
  'suite',
  'ste',
  'unit',
  '#',
  'кв',
  'квартира',
  'whg',
  'wohnung',
  'm',
  'byt',
])

/** «Wörthstraße» и «Wörth Str.» — одна улица: отделяем «straße» от имени. */
function splitGerman(token: string): string[] {
  const match = token.match(/^(.{3,})(straße|strasse|str)$/)

  return match ? [match[1], 'straße'] : [token]
}

export function tokens(line: string): string[] {
  const raw = line
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/(\d)(st|nd|rd|th)\b/g, '$1')
    .replace(/[.,;()"«»]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  const result: string[] = []

  for (let index = 0; index < raw.length; index += 1) {
    const token = raw[index]

    if (UNIT_MARKERS.has(token)) {
      // Пропускаем и сам номер квартиры.
      index += 1
      continue
    }

    if (NOISE.has(token)) {
      continue
    }

    splitGerman(ALIASES[token] ?? token).forEach((part) => result.push(ALIASES[part] ?? part))
  }

  return result
}

/** Дом сравниваем без пробелов и типов: «43 к 2», «43к2», «43 корп. 2». */
function houseKey(house: string): string {
  return tokens(house).join('')
}

/** Индекс: в США значимы первые пять цифр, ZIP+4 не делает его другим. */
function postalKey(postal: string, country: CountryCode): string {
  const plain = postal.replace(/\s|-/g, '').toLowerCase()

  return country === 'us' ? plain.slice(0, 5) : plain
}

/**
 * Лучший ответ сервиса для проверки. Нужен адрес с домом, если дом введён:
 * улица без дома не исправление, а потеря данных.
 */
export function pickCandidate(
  items: AddressSuggestion[],
  values: FieldValues,
): AddressSuggestion | undefined {
  const typedHouse = houseKey(values.house ?? '')
  const hasDigits = /\d/.test(`${values.street ?? ''} ${values.house ?? ''}`)

  if (!hasDigits) {
    return items[0]
  }

  const withHouse = items.filter((item) => item.house !== '')

  return withHouse.find((item) => typedHouse && houseKey(item.house) === typedHouse) ?? withHouse[0]
}

export interface CheckVerdict {
  /** Улица, дом, город или регион расходятся — предлагаем адрес целиком. */
  address: boolean
  /** Индекс расходится с найденным адресом. */
  postal: boolean
}

/**
 * Сравнение введённого с ответом сервиса.
 *
 * Адрес считается тем же, если всё, что человек написал, есть в ответе:
 * сервис может добавить район или тип улицы — это не повод переспрашивать.
 * Пустые части ответа не сравниваем: не знает сервис индекса — не значит,
 * что введённый неверен.
 */
export function compareAddress(
  values: FieldValues,
  candidate: AddressSuggestion,
  country: CountryCode,
  /**
   * Варианты селекта региона. Сервис может отдать штат названием («New
   * York»), а в форме лежит код («NY») — это один и тот же штат.
   */
  regionOptions: { value: string; label: string }[] = [],
): CheckVerdict {
  const typedHouse = values.house ?? ''
  const typed = tokens([values.street, typedHouse, values.city].filter(Boolean).join(' '))

  const known = new Set(
    tokens(
      [
        candidate.lineWithoutHouse,
        candidate.streetLine,
        candidate.street,
        candidate.house,
        candidate.city,
        candidate.region,
        candidate.postal,
      ]
        .filter(Boolean)
        .join(' '),
    ),
  )

  const isLineSame = typed.every((token) => known.has(token))

  const isHouseSame =
    !typedHouse.trim() || !candidate.house || houseKey(typedHouse) === houseKey(candidate.house)

  const typedRegion = (values.region ?? '').trim().toLowerCase()
  const knownRegion = candidate.region.trim().toLowerCase()
  const regionOption = regionOptions.find(
    (option) =>
      option.value.toLowerCase() === typedRegion || option.label.toLowerCase() === typedRegion,
  )
  const isRegionSame =
    !typedRegion ||
    !knownRegion ||
    typedRegion === knownRegion ||
    regionOption?.value.toLowerCase() === knownRegion ||
    regionOption?.label.toLowerCase() === knownRegion

  const typedPostal = postalKey(values.postal ?? '', country)
  const knownPostal = postalKey(candidate.postal, country)
  const isPostalSame = !typedPostal || !knownPostal || typedPostal === knownPostal

  return {
    address: !(isLineSame && isHouseSame && isRegionSame),
    postal: !isPostalSame,
  }
}

/**
 * Строка исправления. Индекс в ней нужен: человек должен увидеть, что
 * поменяется и он, — у части провайдеров его нет в готовой строке.
 */
export function fixLabel(candidate: AddressSuggestion): string {
  const postal = candidate.postal.trim()

  if (!postal || candidate.label.includes(postal)) {
    return candidate.label
  }

  return `${candidate.label}, ${postal}`
}
