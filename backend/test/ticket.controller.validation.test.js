const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createTicketRouter } = require('../dist/interfaces/http/ticket.controller');

async function createServer(service) {
  const app = express();
  app.use(express.json());
  app.use('/api/tickets', createTicketRouter(service));

  const server = await new Promise((resolve) => {
    const listener = app.listen(0, () => resolve(listener));
  });

  return {
    server,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
  };
}

test('GET /overview retorna 400 para date inválido', async () => {
  const service = {
    getOverview: async () => ({ ok: true }),
    getReport: async () => ({ ok: true }),
    issueTicket: async () => ({}),
    callNextTicket: async () => ({}),
  };
  const { server, baseUrl } = await createServer(service);

  try {
    const response = await fetch(`${baseUrl}/api/tickets/overview?date=invalid-date`);
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.message, 'Parâmetro "date" inválido. Use formato YYYY-MM-DD ou data ISO válida.');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test('GET /reports retorna 400 para period inválido', async () => {
  const service = {
    getOverview: async () => ({ ok: true }),
    getReport: async () => ({ ok: true }),
    issueTicket: async () => ({}),
    callNextTicket: async () => ({}),
  };
  const { server, baseUrl } = await createServer(service);

  try {
    const response = await fetch(`${baseUrl}/api/tickets/reports?period=weekly`);
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.message, 'Parâmetro "period" inválido. Use "daily" ou "monthly".');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
