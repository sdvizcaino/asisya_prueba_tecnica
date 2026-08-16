# SLA normal vs degradado — Sección D

Evidencia de la Etapa 7. Prueba de carga con k6 (`constant-arrival-rate`, 10 rps durante 30 s)
contra `GET /api/asisya/seguimiento`. Umbral de SLA: tiempo de respuesta promedio < 1500 ms.

| Modo | avg | p95 | p99 | rps real | tasa de error | Veredicto (avg < 1500 ms) |
|---|---|---|---|---|---|---|
| normal | 45 ms | 43 ms | 44 ms | 9.8 | 0.00% | PASA |
| degradado | 1828 ms | 2186 ms | 2228 ms | 9.2 | 0.00% | FALLA |

**Lectura:** en modo normal, la latencia base (`LATENCY_MS=40`) mantiene el SLA con amplio margen.
En modo degradado, la latencia artificial adicional de 1400–2200 ms que el sandbox añade
exclusivamente a `/api/asisya/seguimiento` (`MODE=degradado`) empuja el promedio muy por encima
del umbral de 1.5 s — el contraste es exactamente el comportamiento que esta sección busca
demostrar. El análisis de los 6 cuellos de botella hipotetizados se documenta en
`docs/seccion-d-estrategia.md` (Etapa 8).

Reporte completo (comando y tabla regenerable): `perf/reports/reporte-sla.md`.
