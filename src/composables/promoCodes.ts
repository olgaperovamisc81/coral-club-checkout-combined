/**
 * Тестовые промокоды стенда. Настоящих правил скидок мы не знаем, поэтому
 * набор нарочно маленький: по одному коду на каждое состояние поля.
 */
export type PromoRule =
  | { kind: 'percent'; percent: number }
  | { kind: 'expired' }

const rules: Record<string, PromoRule> = {
  BODY2: { kind: 'percent', percent: 6 },
  CORAL10: { kind: 'percent', percent: 10 },
  OLD2024: { kind: 'expired' },
}

/** Код сравнивается без учёта регистра и пробелов по краям. */
export function findPromoRule(code: string): PromoRule | undefined {
  return rules[code.trim().toUpperCase()]
}
