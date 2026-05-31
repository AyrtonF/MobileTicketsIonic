import { IssueTicketUseCase } from '../issue-ticket.usecase';
import { TicketStatus, TicketType } from '../../../domain/ticket';

describe('IssueTicketUseCase - Business Hours Integration', () => {
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      countIssuedByTypeBetween: jest.fn().mockResolvedValue(0),
      save: jest.fn(),
    };
  });

  describe('Descarte por fora do expediente', () => {
    test('Deve descartar com motivo OUTSIDE_BUSINESS_HOURS às 6:59', async () => {
      const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 6, 59, 0));
      const useCase = new IssueTicketUseCase(mockRepository, {
        now: mockNow,
        random: () => 0.5,
      });

      const result = await useCase.execute(TicketType.GERAL);

      expect(result.discarded).toBe(true);
      expect(result.discardReason).toBe('OUTSIDE_BUSINESS_HOURS');
      expect(result.ticket.status).toBe(TicketStatus.DESCARTADA);
    });

    test('Deve descartar com motivo OUTSIDE_BUSINESS_HOURS às 17:00', async () => {
      const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 17, 0, 0));
      const useCase = new IssueTicketUseCase(mockRepository, {
        now: mockNow,
        random: () => 0.5,
      });

      const result = await useCase.execute(TicketType.PRIORITARIA);

      expect(result.discarded).toBe(true);
      expect(result.discardReason).toBe('OUTSIDE_BUSINESS_HOURS');
      expect(result.ticket.status).toBe(TicketStatus.DESCARTADA);
    });

    test('Deve emitir normalmente às 7:00', async () => {
      const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 7, 0, 0));
      const useCase = new IssueTicketUseCase(mockRepository, {
        now: mockNow,
        random: () => 0.5,
      });

      const result = await useCase.execute(TicketType.GERAL);

      expect(result.discarded).toBe(false);
      expect(result.discardReason).toBeUndefined();
      expect(result.ticket.status).toBe(TicketStatus.EMITIDA);
    });

    test('Deve emitir normalmente às 16:59', async () => {
      const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 16, 59, 59));
      const useCase = new IssueTicketUseCase(mockRepository, {
        now: mockNow,
        random: () => 0.5,
      });

      const result = await useCase.execute(TicketType.EXAMES);

      expect(result.discarded).toBe(false);
      expect(result.discardReason).toBeUndefined();
      expect(result.ticket.status).toBe(TicketStatus.EMITIDA);
    });
  });

  describe('Descarte aleatório vs fora do expediente', () => {
    test('Deve priorizar OUTSIDE_BUSINESS_HOURS sobre RANDOM_5_PERCENT', async () => {
      const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 18, 0, 0));
      const useCase = new IssueTicketUseCase(mockRepository, {
        now: mockNow,
        random: () => 0.02, // 2% (dentro dos 5% de descarte aleatório)
      });

      const result = await useCase.execute(TicketType.GERAL);

      expect(result.discarded).toBe(true);
      expect(result.discardReason).toBe('OUTSIDE_BUSINESS_HOURS');
    });

    test('Deve retornar RANDOM_5_PERCENT quando dentro do expediente', async () => {
      const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 10, 0, 0));
      const useCase = new IssueTicketUseCase(mockRepository, {
        now: mockNow,
        random: () => 0.03, // 3% (dentro dos 5% de descarte aleatório)
      });

      const result = await useCase.execute(TicketType.GERAL);

      expect(result.discarded).toBe(true);
      expect(result.discardReason).toBe('RANDOM_5_PERCENT');
    });

    test('Deve não descartar quando fora do 5% e dentro do expediente', async () => {
      const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 12, 0, 0));
      const useCase = new IssueTicketUseCase(mockRepository, {
        now: mockNow,
        random: () => 0.08, // 8% (fora dos 5% de descarte)
      });

      const result = await useCase.execute(TicketType.PRIORITARIA);

      expect(result.discarded).toBe(false);
      expect(result.discardReason).toBeUndefined();
      expect(result.ticket.status).toBe(TicketStatus.EMITIDA);
    });
  });
});
