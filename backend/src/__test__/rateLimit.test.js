/**
 * @jest-environment node
 */
const { limitarIntentos } = require('../middlewares/rateLimit');

const crearRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.set = jest.fn(() => res);
  return res;
};

// Simula una solicitud que llega a través de un proxy (Cloudflare) con una IP de nodo variable
const crearReq = (ipCliente, ipProxy) => ({
  ip: ipProxy,
  socket: { remoteAddress: ipProxy },
  get: (cabecera) => (cabecera.toLowerCase() === 'cf-connecting-ip' ? ipCliente : undefined),
});

describe('Pruebas de Seguridad - Límite de intentos (PT-S11)', () => {
  test('Bloquea con 429 al superar el máximo de intentos desde la misma IP', () => {
    const limitador = limitarIntentos({ ventanaMs: 60000, maximo: 3 });
    const codigos = [];
    for (let i = 0; i < 4; i++) {
      const res = crearRes();
      const next = jest.fn();
      limitador(crearReq('190.0.0.1', '10.0.0.1'), res, next);
      codigos.push(next.mock.calls.length ? 'next' : res.status.mock.calls[0][0]);
    }
    expect(codigos).toEqual(['next', 'next', 'next', 429]);
  });

  test('Cuenta por IP real del cliente aunque el nodo del proxy cambie en cada solicitud', () => {
    const limitador = limitarIntentos({ ventanaMs: 60000, maximo: 3 });
    let bloqueada = false;
    for (let i = 0; i < 4; i++) {
      const res = crearRes();
      limitador(crearReq('190.0.0.2', `172.68.0.${i}`), res, jest.fn());
      if (res.status.mock.calls[0]?.[0] === 429) bloqueada = true;
    }
    expect(bloqueada).toBe(true);
  });

  test('Clientes distintos no se bloquean entre sí', () => {
    const limitador = limitarIntentos({ ventanaMs: 60000, maximo: 1 });
    const nextA = jest.fn();
    const nextB = jest.fn();
    limitador(crearReq('190.0.0.3', '10.0.0.1'), crearRes(), nextA);
    limitador(crearReq('190.0.0.4', '10.0.0.1'), crearRes(), nextB);
    expect(nextA).toHaveBeenCalled();
    expect(nextB).toHaveBeenCalled();
  });
});
