import { Request, Response, Router } from 'express';
import { TicketService } from '../../application/ticket-service';
import { TicketPeriod, TicketType } from '../../domain/entities/ticket';

class RequestValidationError extends Error {}

function parseReferenceDate(value: unknown): Date | null {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new RequestValidationError('Parâmetro "date" inválido.');
  }

  const trimmed = value.trim();
  const localDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (localDateMatch) {
    const [, year, month, day] = localDateMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);

    if (
      parsed.getFullYear() !== Number(year)
      || parsed.getMonth() !== Number(month) - 1
      || parsed.getDate() !== Number(day)
    ) {
      throw new RequestValidationError('Parâmetro "date" inválido. Use formato YYYY-MM-DD ou data ISO válida.');
    }

    return parsed;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    throw new RequestValidationError('Parâmetro "date" inválido. Use formato YYYY-MM-DD ou data ISO válida.');
  }

  return parsed;
}

function parseTicketType(value: unknown): TicketType {
  if (value === TicketType.PRIORITARIA || value === TicketType.GERAL || value === TicketType.EXAMES) {
    return value;
  }

  throw new Error('Tipo de senha inválido.');
}

function parsePeriod(value: unknown): TicketPeriod {
  if (value == null || value === '') {
    return 'daily';
  }

  if (value === 'daily' || value === 'monthly') {
    return value;
  }

  throw new RequestValidationError('Parâmetro "period" inválido. Use "daily" ou "monthly".');
}

export function createTicketRouter(service: TicketService): Router {
  const router = Router();

  router.post('/issue', async (request: Request, response: Response) => {
    try {
      const type = parseTicketType(request.body?.type);
      const result = await service.issueTicket(type);
      response.status(201).json(result);
    } catch (error) {
      response.status(400).json({ message: error instanceof Error ? error.message : 'Falha ao emitir senha.' });
    }
  });

  router.post('/next', async (request: Request, response: Response) => {
    try {
      const guiche = typeof request.body?.guiche === 'string' && request.body.guiche.trim().length > 0
        ? request.body.guiche.trim()
        : 'Guichê 1';

      const result = await service.callNextTicket(guiche);
      response.json(result);
    } catch (error) {
      response.status(400).json({ message: error instanceof Error ? error.message : 'Falha ao chamar a próxima senha.' });
    }
  });

  router.get('/overview', async (request: Request, response: Response) => {
    try {
      const referenceDate = parseReferenceDate(request.query.date) ?? new Date();
      const result = await service.getOverview(referenceDate);
      response.json(result);
    } catch (error) {
      if (error instanceof RequestValidationError) {
        response.status(400).json({ message: error.message });
        return;
      }

      response.status(500).json({ message: error instanceof Error ? error.message : 'Falha ao carregar o painel.' });
    }
  });

  router.get('/reports', async (request: Request, response: Response) => {
    try {
      const referenceDate = parseReferenceDate(request.query.date) ?? new Date();
      const period = parsePeriod(request.query.period);
      const result = await service.getReport(period, referenceDate);
      response.json(result);
    } catch (error) {
      if (error instanceof RequestValidationError) {
        response.status(400).json({ message: error.message });
        return;
      }

      response.status(500).json({ message: error instanceof Error ? error.message : 'Falha ao gerar relatório.' });
    }
  });

  return router;
}