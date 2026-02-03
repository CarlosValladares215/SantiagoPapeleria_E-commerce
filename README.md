## ¿Como utilizar el asistente virtual?

Para que el bot Ollama funcione de forma local usted debera de descargarlo desde su sitio oficial

https://ollama.com/download

Una vez descargado el programa se escribira en la terminal la siguiente linea

```
ollama pull llama3:8b
```

Cuando termine de descargar se debe de ejecutar la siguiente linea desde la terminal para que corra

```
ollama run llama3:8b
```

Para evitar que el bot consuma recursos en segundo plano se debera de ingresar al administrador de tareas y en la sección de "Aplicaciones de arraque" se debera de deshabilitar el bot Ollama, tal como se puede observar en la siguiente imagen:

<img width="687" height="40" alt="image" src="https://github.com/user-attachments/assets/ef4473ee-751b-45b6-89f8-4b2afbba811d" />


Para ejecutar ollama de forma local se debe de correr el backend usando la siguiente sentencia

```
npm run start:ai
```
