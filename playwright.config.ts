import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000, // el spec de estado recorre 4 transiciones de 3 s
  expect: { timeout: 15_000 }, // margen para expect.poll sobre el polling de la UI
  fullyParallel: true, // bonus: paralelización
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 2 : 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    video: 'on', // exigido por el punto 4 de la Sección B1
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000/health',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /seccion-c\/test-asistencia-falla.*\.spec\.ts/,
    },
    {
      name: 'mobile-chrome', // el escenario del enunciado es "desde su celular"
      use: { ...devices['Pixel 7'] },
      testIgnore: /seccion-c\/test-asistencia-falla.*\.spec\.ts/,
    },
    {
      name: 'seccion-c-falla', // solo evidencia; no entra en test:e2e
      use: { ...devices['Desktop Chrome'] },
      testMatch: /seccion-c\/test-asistencia-falla.*\.spec\.ts/,
      retries: 0,
    },
  ],
});
