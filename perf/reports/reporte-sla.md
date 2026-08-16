# Reporte de SLA — Sección D

Prueba de carga con k6 (`constant-arrival-rate`, 10 rps durante 30 s) contra `GET /api/asisya/seguimiento`. Umbral de SLA: tiempo de respuesta promedio < 1500 ms.

| Modo | avg | p95 | p99 | rps real | tasa de error | Veredicto (avg < 1500 ms) |
|---|---|---|---|---|---|---|
| normal | 45 ms | 43 ms | 44 ms | 9.8 | 0.00% | PASA |
| degradado | 1828 ms | 2186 ms | 2228 ms | 9.2 | 0.00% | FALLA |
