const test = require('node:test');
const assert = require('node:assert/strict');
const { TicketFlowService } = require('../dist/domain/services/ticket-flow.service');
const { TicketType } = require('../dist/domain/ticket');

test('calcula TM uniforme para SP entre 10 e 20', () => {
  const service = new TicketFlowService();

  assert.equal(service.calculateServiceMinutes(TicketType.PRIORITARIA, () => 0), 10);
  assert.equal(service.calculateServiceMinutes(TicketType.PRIORITARIA, () => 0.5), 15);
  assert.equal(service.calculateServiceMinutes(TicketType.PRIORITARIA, () => 1), 20);
});

test('calcula TM uniforme para SG entre 2 e 8', () => {
  const service = new TicketFlowService();

  assert.equal(service.calculateServiceMinutes(TicketType.GERAL, () => 0), 2);
  assert.equal(service.calculateServiceMinutes(TicketType.GERAL, () => 0.5), 5);
  assert.equal(service.calculateServiceMinutes(TicketType.GERAL, () => 1), 8);
});

test('mantem regra de SE em 95% para 1 minuto e 5% para 5 minutos', () => {
  const service = new TicketFlowService();

  assert.equal(service.calculateServiceMinutes(TicketType.EXAMES, () => 0.949), 1);
  assert.equal(service.calculateServiceMinutes(TicketType.EXAMES, () => 0.95), 5);
});
