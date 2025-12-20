import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm: FormGroup;
  isWholesaler = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor() {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      nombres: ['', Validators.required],
      cedula: [''], // Inicialmente vacío
      telefono: [''], // Inicialmente vacío
      tipo_cliente: ['MINORISTA', Validators.required],
      // Campos opcionales inicializados en null o vacío
      datos_fiscales: this.fb.group({
        tipo_identificacion: ['RUC'],
        identificacion: [''],
        razon_social: [''],
        direccion_matriz: ['']
      }),
      direcciones_entrega: this.fb.group({
        alias: ['Principal'],
        calle_principal: [''],
        ciudad: [''],
        referencia: ['']
      }),
      preferencias: this.fb.group({
        acepta_boletin: [true]
      })
    });

    this.onTypeChange();
    // Ejecutar validación inicial
    this.updateValidators();
  }

  onTypeChange() {
    this.registerForm.get('tipo_cliente')?.valueChanges.subscribe(val => {
      this.isWholesaler = val === 'MAYORISTA';
      this.updateValidators();
    });
  }

  updateValidators() {
    const fiscalGroup = this.registerForm.get('datos_fiscales') as FormGroup;
    const addressGroup = this.registerForm.get('direcciones_entrega') as FormGroup;
    const cedulaControl = this.registerForm.get('cedula');
    const telefonoControl = this.registerForm.get('telefono');

    if (this.isWholesaler) {
      // MAYORISTA: Requiere Cédula, Teléfono y Datos Fiscales.
      cedulaControl?.setValidators([Validators.required]); // Ahora requerido también
      telefonoControl?.setValidators([Validators.required]);

      fiscalGroup.get('identificacion')?.setValidators([Validators.required]);
      fiscalGroup.get('razon_social')?.setValidators([Validators.required]);
      addressGroup.get('calle_principal')?.setValidators([Validators.required]);
      addressGroup.get('ciudad')?.setValidators([Validators.required]);
    } else {
      // MINORISTA: Requiere Cédula. Teléfono opcional.
      cedulaControl?.setValidators([Validators.required]);
      telefonoControl?.clearValidators();

      fiscalGroup.get('identificacion')?.clearValidators();
      fiscalGroup.get('razon_social')?.clearValidators();
      addressGroup.get('calle_principal')?.clearValidators();
      addressGroup.get('ciudad')?.clearValidators();
    }

    cedulaControl?.updateValueAndValidity();
    telefonoControl?.updateValueAndValidity();
    fiscalGroup.get('identificacion')?.updateValueAndValidity();
    fiscalGroup.get('razon_social')?.updateValueAndValidity();
    addressGroup.get('calle_principal')?.updateValueAndValidity();
    addressGroup.get('ciudad')?.updateValueAndValidity();
  }

  onSubmit() {
    if (this.registerForm.valid) {
      const formValue = this.registerForm.value;

      // Limpiar datos si no es mayorista para no enviar basura
      if (!this.isWholesaler) {
        delete formValue.datos_fiscales;
        delete formValue.direcciones_entrega;
      } else {
        // Ajustar estructura si es necesario (el backend espera arreglo en direcciones, pero el form es objeto simple por simplicidad inicial)
        if (formValue.direcciones_entrega) {
          formValue.direcciones_entrega = [formValue.direcciones_entrega];
        }
      }
      console.log('Enviando registro:', formValue);

      // Helper to cleanup empty strings to undefined
      const clean = (val: string) => val === '' ? undefined : val;

      const payload = {
        name: formValue.nombres,
        email: formValue.email,
        password: formValue.password,
        client_type: formValue.tipo_cliente,
        cedula: clean(formValue.cedula),
        telefono: clean(formValue.telefono)
      };

      this.authService.registerNew(payload).subscribe({
        next: (res) => {
          console.log('Registro exitoso', res);
          // Save for verify-email page
          localStorage.setItem('pendingVerificationEmail', formValue.email);
          localStorage.setItem('pendingVerificationName', formValue.nombres);

          // Redirect to verification page
          this.router.navigate(['/verify-email'], {
            queryParams: { email: formValue.email }
          });
        },
        error: (err) => {
          console.error('Error en registro', err);
          if (err.status === 409) {
            alert(err.error?.message || 'Email o Cédula ya registrados');
          } else {
            alert('Error al registrar usuario: ' + (err.error?.message || 'Error desconocido'));
          }
        }
      });
    } else {
      this.registerForm.markAllAsTouched();
    }
  }
}
