/**
 * @jest-environment node
 */
const jwt = require('jsonwebtoken');
const verificarToken = require('../middlewares/authMiddlware');
const { permitirRoles } = require('../middlewares/authMiddlware');

const SECRETO = 'secreto-de-pruebas-con-al-menos-32-caracteres';

const crearRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const crearReq = (authorization) => ({
  header: (nombre) => (nombre === 'Authorization' ? authorization : undefined)
});

describe('Pruebas de Seguridad - Middleware de autenticación (Cuadro 3.49)', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = SECRETO;
  });

  test('PT-S1: sin token debería responder 401', () => {
    const res = crearRes();
    const next = jest.fn();
    verificarToken(crearReq(undefined), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('PT-S2: con un token falso (firma inválida) debería responder 401', () => {
    const falso = jwt.sign({ id: 'usuario-ajeno', rol: 'admin_ciat' }, 'otro-secreto');
    const res = crearRes();
    const next = jest.fn();
    verificarToken(crearReq(`Bearer ${falso}`), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('Con un token expirado debería responder 401', () => {
    const expirado = jwt.sign({ id: 'u1', rol: 'agronomo', exp: Math.floor(Date.now() / 1000) - 60 }, SECRETO);
    const res = crearRes();
    const next = jest.fn();
    verificarToken(crearReq(`Bearer ${expirado}`), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('Con un token sin firma (alg none) debería responder 401', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: 'u1', rol: 'admin_ciat' })).toString('base64url');
    const res = crearRes();
    const next = jest.fn();
    verificarToken(crearReq(`Bearer ${header}.${payload}.`), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('Con un token válido debería inyectar el usuario y continuar', () => {
    const valido = jwt.sign({ id: 'u1', rol: 'agronomo' }, SECRETO, { expiresIn: '8h' });
    const req = crearReq(`Bearer ${valido}`);
    const res = crearRes();
    const next = jest.fn();
    verificarToken(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.usuario).toEqual({ id: 'u1', rol: 'agronomo' });
  });

  test('permitirRoles debería responder 403 a un rol no autorizado', () => {
    const res = crearRes();
    const next = jest.fn();
    permitirRoles('admin_ciat', 'agronomo')({ usuario: { id: 'u2', rol: 'productor' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('permitirRoles debería permitir un rol autorizado', () => {
    const res = crearRes();
    const next = jest.fn();
    permitirRoles('admin_ciat', 'agronomo')({ usuario: { id: 'u1', rol: 'agronomo' } }, res, next);
    expect(next).toHaveBeenCalled();
  });
});
