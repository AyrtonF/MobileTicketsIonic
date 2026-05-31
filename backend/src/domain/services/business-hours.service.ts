/**
 * Serviço para validação de horário comercial.
 * Expediente: 7h até 17h (23:59:59)
 * - 07:00:00 até 16:59:59 → Dentro do expediente
 * - 00:00:00 até 06:59:59 → Fora (BEFORE_OPENING)
 * - 17:00:00 até 23:59:59 → Fora (AFTER_CLOSING)
 */

export interface BusinessHoursValidation {
  isWithinBusinessHours: boolean;
  reason?: 'BEFORE_OPENING' | 'AFTER_CLOSING';
}

export class BusinessHoursService {
  /**
   * Valida se uma data/hora está dentro do expediente comercial.
   *
   * @param date Data e hora a validar
   * @returns Objeto indicando se está dentro do expediente e motivo, se fora
   */
  validate(date: Date): BusinessHoursValidation {
    const hour = date.getHours();

    if (hour < 7) {
      return {
        isWithinBusinessHours: false,
        reason: 'BEFORE_OPENING',
      };
    }

    if (hour >= 17) {
      return {
        isWithinBusinessHours: false,
        reason: 'AFTER_CLOSING',
      };
    }

    return {
      isWithinBusinessHours: true,
    };
  }
}
