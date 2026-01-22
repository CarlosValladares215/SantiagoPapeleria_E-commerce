import { Component } from '@angular/core';

@Component({
    selector: 'app-sonar-test',
    template: '<p>Sonar Test Works</p>',
})
export class SonarTestComponent {

    // Code Smell: Variable pública que debería ser privada o usada
    public testVar: any = "data"; // Code Smell: uso de 'any'

    constructor() {
        this.complexMethod(1, 2, 3);
    }

    // Code Smell: Complejidad Ciclomática Alta (Muchas sentencias if/else anidadas)
    complexMethod(a: number, b: number, c: number) {
        if (a > 0) {
            if (b > 0) {
                if (c > 0) {
                    console.log("All positive");
                } else {
                    console.log("C negative");
                }
            } else {
                console.log("B negative");
                if (c > 0) {
                    console.log("C positive");
                }
            }
        } else {
            // Code Smell: Bloque vacío
        }
    }

    duplicateCode() {
        // Code Smell: Código duplicado del backend (Sonar detecta duplicidad cross-project a veces, o local)
        const x = 10;
        const y = 20;
        return x + y;
    }
}
