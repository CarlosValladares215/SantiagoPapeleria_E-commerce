import { Controller, Get } from '@nestjs/common';

@Controller('sonar-test')
export class SonarTestController {
    // Code Smell: Variables definidas pero no usadas
    private unusedVariable = 'This is a test';

    @Get()
    getHello(): string {
        // Code Smell: Console.log en código de producción
        console.log('Testing SonarQube');

        // Code Smell: Código comentado
        // var oldCode = "This should be deleted";

        // Code Smell: Duplicación de código intencional
        const a = 1;
        const b = 2;
        const result = a + b;

        if (a == 1) { // Code Smell: '==' en lugar de '==='
            return 'Hello check';
        }

        if (true) { // Code Smell: Bloque redundante
            return 'Hello World';
        } else {
            return 'Unreachable code'; // Bug: Código inalcanzable
        }
    }

    // Code Smell: Función duplicada (Copy-Paste)
    duplicateFunction1() {
        const x = 10;
        const y = 20;
        return x + y;
    }

    // Code Smell: Función duplicada exactametne igual a la anterior
    duplicateFunction2() {
        const x = 10;
        const y = 20;
        return x + y;
    }

    // Seguridad: Credenciales "Hardcoded" (Sonar lo detectará como Vulnerabilidad o Hotspot)
    connectToDb() {
        const password = "admin1234"; // Security Hotspot: Hardcoded password
        return "Connected with " + password;
    }
}
