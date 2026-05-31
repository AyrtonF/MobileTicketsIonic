import { TicketFlowService } from '../ticket-flow.service';
import { TicketType } from '../../ticket';

describe('TicketFlowService - calculateServiceMinutes', () => {
  const service = new TicketFlowService();

  describe('SP (Prioritária) - distribuição uniforme 10-20 minutos', () => {
    test('Deve gerar valores entre 10 e 20', () => {
      for (let i = 0; i < 100; i++) {
        const minutes = service.calculateServiceMinutes(TicketType.PRIORITARIA, Math.random);
        expect(minutes).toBeGreaterThanOrEqual(10);
        expect(minutes).toBeLessThanOrEqual(20);
      }
    });

    test('Deve gerar múltiplos valores diferentes (não apenas 2)', () => {
      const values = new Set<number>();
      for (let i = 0; i < 200; i++) {
        const minutes = service.calculateServiceMinutes(TicketType.PRIORITARIA, Math.random);
        values.add(minutes);
      }
      expect(values.size).toBeGreaterThan(2);
    });

    test('Valores específicos com random controlado para SP', () => {
      // random = 0 → 10
      expect(service.calculateServiceMinutes(TicketType.PRIORITARIA, () => 0)).toBe(10);
      // random = 0.5 → 15
      expect(service.calculateServiceMinutes(TicketType.PRIORITARIA, () => 0.5)).toBe(15);
      // random = 1 → 20
      expect(service.calculateServiceMinutes(TicketType.PRIORITARIA, () => 1)).toBe(20);
    });
  });

  describe('SG (Geral) - distribuição uniforme 2-8 minutos', () => {
    test('Deve gerar valores entre 2 e 8', () => {
      for (let i = 0; i < 100; i++) {
        const minutes = service.calculateServiceMinutes(TicketType.GERAL, Math.random);
        expect(minutes).toBeGreaterThanOrEqual(2);
        expect(minutes).toBeLessThanOrEqual(8);
      }
    });

    test('Deve gerar múltiplos valores diferentes (não apenas 2)', () => {
      const values = new Set<number>();
      for (let i = 0; i < 200; i++) {
        const minutes = service.calculateServiceMinutes(TicketType.GERAL, Math.random);
        values.add(minutes);
      }
      expect(values.size).toBeGreaterThan(2);
    });

    test('Valores específicos com random controlado para SG', () => {
      // random = 0 → 2
      expect(service.calculateServiceMinutes(TicketType.GERAL, () => 0)).toBe(2);
      // random = 0.5 → 5
      expect(service.calculateServiceMinutes(TicketType.GERAL, () => 0.5)).toBe(5);
      // random = 1 → 8
      expect(service.calculateServiceMinutes(TicketType.GERAL, () => 1)).toBe(8);
    });
  });

  describe('SE (Exames) - 1 minuto (95%) ou 5 minutos (5%)', () => {
    test('Deve retornar 1 minuto para valores < 0.95', () => {
      for (let i = 0; i < 94; i++) {
        const random = i / 100;
        const minutes = service.calculateServiceMinutes(TicketType.EXAMES, () => random);
        expect(minutes).toBe(1);
      }
    });

    test('Deve retornar 5 minutos para valores >= 0.95', () => {
      for (let i = 95; i < 100; i++) {
        const random = i / 100;
        const minutes = service.calculateServiceMinutes(TicketType.EXAMES, () => random);
        expect(minutes).toBe(5);
      }
    });

    test('Deve manter distribuição 95/5 em amostra aleatória', () => {
      const results = {
        one: 0,
        five: 0,
      };

      for (let i = 0; i < 10000; i++) {
        const minutes = service.calculateServiceMinutes(TicketType.EXAMES, Math.random);
        if (minutes === 1) results.one++;
        if (minutes === 5) results.five++;
      }

      const percentOne = (results.one / 10000) * 100;
      const percentFive = (results.five / 10000) * 100;

      expect(percentOne).toBeGreaterThan(90);
      expect(percentOne).toBeLessThan(99);
      expect(percentFive).toBeGreaterThan(1);
      expect(percentFive).toBeLessThan(10);
    });
  });
});
