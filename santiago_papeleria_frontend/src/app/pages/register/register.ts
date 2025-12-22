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
        referencia: [''],
        telefono_negocio: [''] // Temporary field for business phone separate from personal
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
      // Usar getRawValue para obtener todo sin modificaciones
      const formValue = this.registerForm.getRawValue();
      console.log('Enviando registro (Raw):', formValue);

      // Helper to cleanup empty strings to undefined
      const clean = (val: string) => val === '' ? undefined : val;

      const payload: any = {
        name: formValue.nombres,
        email: formValue.email,
        password: formValue.password,
        client_type: formValue.tipo_cliente,
        cedula: clean(formValue.cedula),
        telefono: clean(formValue.telefono)
      };

      // Add Business Data if Mayorista
      if (this.isWholesaler) {
        // Construct the object expected by backend using the RAW form group values
        const datosFiscales = formValue.datos_fiscales;
        const datosDireccion = formValue.direcciones_entrega;

        payload.datos_negocio = {
          nombre_negocio: datosFiscales.razon_social,
          ruc: datosFiscales.identificacion,
          direccion_negocio: datosDireccion.calle_principal,
          ciudad: datosDireccion.ciudad,
          telefono_negocio: datosDireccion.telefono_negocio
        };
      }

      this.authService.registerNew(payload).subscribe({
        next: (res) => {
          console.log('Registro exitoso', res);

          if (res.access_token && res.user) {
            // AUTO-LOGIN
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('token', res.access_token);
            }
            // Update Auth State
            this.authService.setSession(res.user);

            // Redirect to Home
            this.router.navigate(['/']);
          } else {
            // Fallback
            this.router.navigate(['/verify-email'], {
              queryParams: { email: formValue.email }
            });
          }
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
