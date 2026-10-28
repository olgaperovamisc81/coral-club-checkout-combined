/**
 * Пункты, которые в стенде «сейчас закрыты»: по одному на страну, чтобы
 * состояние можно было увидеть, а не искать. Закрытый пункт выбрать можно —
 * заказ заберут, когда он откроется, — но человек должен об этом знать.
 */
const closedPointIds = new Set([
  'ru-cdek-rudnevka',
  'kz-cdek-abaya',
  'de-dhl-packstation-407',
  'pl-inpost-waw77b',
  'cz-zasilkovna-karlovo',
  'us-usps-madison',
])

export function isPointClosed(id: string | undefined) {
  return id !== undefined && closedPointIds.has(id)
}
