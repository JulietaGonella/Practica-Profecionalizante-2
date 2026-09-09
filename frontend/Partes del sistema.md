Para gestionar la contraseña inicial y su restablecimiento sin comprometer el flujo de trabajo actual en fase de pruebas, esta es la estrategia recomendada para definir el comportamiento:

---

### 2. Flujo de Primer Inicio (Locales y Repartidores)

Cuando un usuario ingresa al sistema:

1. **Autenticación (Login):** El backend retorna los datos del usuario incluyendo la bandera `debe_cambiar_pass`.
2. **Redirección Forzada:** Si `debe_cambiar_pass === 1` o `true`, el Frontend redirige automáticamente a la pantalla `/actualizar-password-inicial`.
3. **Restricción de Navegación:** Se bloquea la navegación hacia el resto del panel/sistema hasta que complete el formulario de actualización de contraseña.
4. **Actualización:** Al ingresar la nueva contraseña, el backend la encripta, actualiza el registro y cambia `debe_cambiar_pass = 0`. Luego redirige al panel correspondiente.

---

### 3. Flujo de Recuperación de Contraseña (Olvidó su contraseña)

Aplica para todos los roles (**Cliente, Repartidor, Local y Admin**):

* **Formulario Público (`/recuperar-password`):** El usuario ingresa su email.
* **Token de Recuperación:** El backend genera un token temporal vinculado al usuario con tiempo de expiración (ej. 15 minutos).
* **Envío / Enlace:** Se envía el token por email (o se genera el enlace de restablecimiento `/restablecer-password?token=XYZ`).
* **Seteo de Nueva Clave:** El usuario ingresa la nueva clave, el token se consume/invalida y se actualiza la contraseña en la base de datos.
```

3. Gestión de Repartidores
- ver el tema de cuando se vence la licencia, seguro y cedula.
