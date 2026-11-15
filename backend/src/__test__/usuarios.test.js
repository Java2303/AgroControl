const { validarCambioUsuario } = require('../utils/usuarios');

const ADMIN = '11111111-1111-1111-1111-111111111111';
const OTRO = '22222222-2222-2222-2222-222222222222';

describe('Administración de usuarios (UC-04)', () => {
    test('acepta cambiar el rol y el estado de otra cuenta', () => {
        expect(validarCambioUsuario({ rol: 'agronomo', activo: false }, ADMIN, OTRO))
            .toEqual({ cambios: { rol: 'agronomo', activo: false } });
    });

    test('rechaza un rol que no existe', () => {
        expect(validarCambioUsuario({ rol: 'superusuario' }, ADMIN, OTRO).error).toBeDefined();
    });

    test('rechaza un estado que no es booleano', () => {
        expect(validarCambioUsuario({ activo: 'no' }, ADMIN, OTRO).error).toBeDefined();
    });

    test('rechaza una petición sin cambios', () => {
        expect(validarCambioUsuario({}, ADMIN, OTRO).error).toBeDefined();
    });

    test('el administrador no puede cambiarse el rol ni desactivarse', () => {
        expect(validarCambioUsuario({ activo: false }, ADMIN, ADMIN).error).toMatch(/propia cuenta/);
    });
});
