import { BusinessHoursService } from '../business-hours.service';

describe('BusinessHoursService', () => {
  const service = new BusinessHoursService();

  describe('Casos limite de abertura (7h)', () => {
    test('6:59:59 deve ser rejeitado (BEFORE_OPENING)', () => {
      const date = new Date(2026, 4, 31, 6, 59, 59);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(false);
      expect(result.reason).toBe('BEFORE_OPENING');
    });

    test('7:00:00 deve ser aceito', () => {
      const date = new Date(2026, 4, 31, 7, 0, 0);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Casos limite de fechamento (17h)', () => {
    test('16:59:59 deve ser aceito', () => {
      const date = new Date(2026, 4, 31, 16, 59, 59);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('17:00:00 deve ser rejeitado (AFTER_CLOSING)', () => {
      const date = new Date(2026, 4, 31, 17, 0, 0);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(false);
      expect(result.reason).toBe('AFTER_CLOSING');
    });

    test('23:59:59 deve ser rejeitado (AFTER_CLOSING)', () => {
      const date = new Date(2026, 4, 31, 23, 59, 59);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(false);
      expect(result.reason).toBe('AFTER_CLOSING');
    });
  });

  describe('Horários do meio do expediente', () => {
    test('10:30:00 deve ser aceito', () => {
      const date = new Date(2026, 4, 31, 10, 30, 0);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('14:15:30 deve ser aceito', () => {
      const date = new Date(2026, 4, 31, 14, 15, 30);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Horários noturnos', () => {
    test('0:00:00 deve ser rejeitado (BEFORE_OPENING)', () => {
      const date = new Date(2026, 4, 31, 0, 0, 0);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(false);
      expect(result.reason).toBe('BEFORE_OPENING');
    });

    test('3:30:00 deve ser rejeitado (BEFORE_OPENING)', () => {
      const date = new Date(2026, 4, 31, 3, 30, 0);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(false);
      expect(result.reason).toBe('BEFORE_OPENING');
    });

    test('20:00:00 deve ser rejeitado (AFTER_CLOSING)', () => {
      const date = new Date(2026, 4, 31, 20, 0, 0);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(false);
      expect(result.reason).toBe('AFTER_CLOSING');
    });
  });
});
