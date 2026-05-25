# Alcance del MVP

## Objetivo

Crear una app para controlar boletas de eventos desde que se crean hasta que se usan en la entrada.

## Actores iniciales

- Administrador: crea eventos, boletas, precios y distribuidores.
- Distribuidor: recibe boletas para vender o entregar.
- Comprador/asistente: paga una boleta y la presenta el dia del evento.
- Taquilla/entrada: valida si la boleta esta pagada y marca su uso.

## Flujo principal

1. Crear un evento con fecha, lugar y estado.
2. Crear un lote de boletas con precio y codigos internos.
3. Registrar distribuidores o personas que reciben boletas.
4. Asignar boletas a distribuidores.
5. Registrar la venta de una boleta.
6. Guardar metodo de pago: transferencia o efectivo.
7. Adjuntar o registrar evidencia: pantallazo, referencia o nota de efectivo.
8. Validar el pago y marcar la boleta como pagada.
9. El dia del evento, consultar la boleta y marcarla como usada.
10. Revisar resumen: total vendido, pendiente, pagado, usado y capitalizacion.

## Estados de boleta

- `available`: creada y disponible.
- `assigned`: entregada a un distribuidor.
- `reserved`: apartada, pendiente de pago.
- `sold`: venta registrada, pago pendiente de validar.
- `paid`: pago validado.
- `used`: boleta usada en la entrada.
- `void`: anulada.

## Datos minimos

- Evento: nombre, fecha, lugar, estado.
- Distribuidor: nombre, telefono, correo opcional.
- Boleta: codigo, precio, estado, distribuidor, comprador y uso.
- Pago: metodo, monto, capitalizacion, evidencia, estado y revisor.

## Fuera de alcance por ahora

- Pasarela de pago automatica.
- Envio automatico por WhatsApp o correo.
- Roles avanzados y auditoria completa.
- Escaneo QR real.
- Persistencia definitiva con migraciones.

Estos puntos se pueden agregar despues sin cambiar la arquitectura base.
