const test = require('node:test');
const assert = require('node:assert/strict');
const { IssueTicketUseCase } = require('../dist/application/usecases/issue-ticket.usecase');
const { TicketDiscardReason, TicketStatus, TicketType } = require('../dist/domain/ticket');

function createRepository() {
  return {
    saved: [],
    async countIssuedByTypeBetween() {
      return 0;
    },
    async save(ticket) {
      this.saved.push(ticket);
    },
  };
}

test('descarta senha antes do expediente com motivo BEFORE_OPENING', async () => {
  const repository = createRepository();
  const useCase = new IssueTicketUseCase(repository, {
    now: () => new Date(2026, 4, 31, 6, 59, 0, 0),
    random: () => 0.9,
  });

  const result = await useCase.execute(TicketType.GERAL);

  assert.equal(result.discarded, true);
  assert.equal(result.discardReason, TicketDiscardReason.BEFORE_OPENING);
  assert.equal(result.ticket.status, TicketStatus.DESCARTADA);
});

test('permite emissao exatamente as 07:00', async () => {
  const repository = createRepository();
  const useCase = new IssueTicketUseCase(repository, {
    now: () => new Date(2026, 4, 31, 7, 0, 0, 0),
    random: () => 0.9,
  });

  const result = await useCase.execute(TicketType.PRIORITARIA);

  assert.equal(result.discarded, false);
  assert.equal(result.discardReason, null);
  assert.equal(result.ticket.status, TicketStatus.EMITIDA);
});

test('descarta senha exatamente as 17:00 com motivo AFTER_CLOSING', async () => {
  const repository = createRepository();
  const useCase = new IssueTicketUseCase(repository, {
    now: () => new Date(2026, 4, 31, 17, 0, 0, 0),
    random: () => 0.9,
  });

  const result = await useCase.execute(TicketType.EXAMES);

  assert.equal(result.discarded, true);
  assert.equal(result.discardReason, TicketDiscardReason.AFTER_CLOSING);
  assert.equal(result.ticket.status, TicketStatus.DESCARTADA);
});

test('permite emissao as 16:59', async () => {
  const repository = createRepository();
  const useCase = new IssueTicketUseCase(repository, {
    now: () => new Date(2026, 4, 31, 16, 59, 0, 0),
    random: () => 0.9,
  });

  const result = await useCase.execute(TicketType.GERAL);

  assert.equal(result.discarded, false);
  assert.equal(result.discardReason, null);
  assert.equal(result.ticket.status, TicketStatus.EMITIDA);
});
