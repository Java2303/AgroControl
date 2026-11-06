const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Carga next.config.js y los .env en el entorno de prueba
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  // Rutas que SonarCloud usa para la cobertura
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'backend/src/**/*.{js,jsx,ts,tsx}',
    '!backend/src/**/*.d.ts',
  ],
}

module.exports = createJestConfig(customJestConfig)