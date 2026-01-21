import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { Router, RouterLink } from '@angular/router';

import { StepAccountTypeComponent } from './components/step-account-type/step-account-type.component';
import { StepPersonalInfoComponent } from './components/step-personal-info/step-personal-info.component';
import { StepBusinessInfoComponent } from './components/step-business-info/step-business-info.component';
import { StepShippingLocationComponent } from './components/step-shipping-location/step-shipping-location.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StepAccountTypeComponent,
    StepPersonalInfoComponent,
    StepBusinessInfoComponent,
    StepShippingLocationComponent
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  registerForm: FormGroup;
  isWholesaler = false;
  currentStep = 1;
  // totalSteps is handled by getter


  isSubmitting = false;

  constructor() {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', [Validators.required]],
      nombres: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]],
      cedula: [''], // Inicialmente vacío
      telefono: [''], // Inicialmente vacío
      tipo_cliente: ['MINORISTA', Validators.required],
      // Campos opcionales inicializados en null o vacío
      datos_fiscales: this.fb.group({
        tipo_identificacion: ['RUC'],
        identificacion: [''],
        razon_social: [''],
        direccion_matriz: [''],
        ciudad_fiscal: [''],
        telefono_negocio: ['']
      }),
      direcciones_entrega: this.fb.group({
        alias: ['Principal'],
        calle_principal: [''],
        ciudad: [''],
        provincia: [''],
        codigo_postal: [''],
        referencia: [''],
        lat: [null],
        lng: [null]
      }),
      preferencias: this.fb.group({
        acepta_boletin: [true]
      }),
      terminos: [false, Validators.requiredTrue]
    }, { validators: this.passwordMatchValidator });

    this.onTypeChange();
    // Ejecutar validación inicial
    this.updateValidators();
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirm_password')?.value
      ? null : { 'mismatch': true };
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
      // MAYORISTA: Requiere Cédula (10 dígitos), Teléfono y Datos Fiscales.
      cedulaControl?.setValidators([Validators.required, Validators.pattern(/^\d{10}$/)]);
      telefonoControl?.setValidators([Validators.required, Validators.minLength(12), Validators.maxLength(12)]);

      fiscalGroup.get('identificacion')?.setValidators([Validators.required, Validators.pattern(/^\d{13}$/)]);
      fiscalGroup.get('razon_social')?.setValidators([Validators.required]);
      addressGroup.get('calle_principal')?.setValidators([Validators.required]);
      addressGroup.get('ciudad')?.setValidators([Validators.required]);
    } else {
      // MINORISTA: Requiere Cédula (10 dígitos) y Teléfono.
      cedulaControl?.setValidators([Validators.required, Validators.pattern(/^\d{10}$/)]);
      telefonoControl?.setValidators([Validators.required, Validators.minLength(12), Validators.maxLength(12)]);

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


  get totalSteps(): number {
    return this.isWholesaler ? 4 : 3;
  }

  get currentDisplayStep(): number {
    if (this.currentStep === 4 && !this.isWholesaler) {
      return 3; // Para el minorista, el paso 4 es visualmente el 3
    }
    return this.currentStep;
  }

  get progressPercentage(): number {
    const percentage = (this.currentDisplayStep / this.totalSteps) * 100;
    return Math.round(percentage);
  }

  private scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  validateCurrentStep(): boolean {
    let isValid = true;
    const controlsToCheck: string[] = [];
    const groupsToCheck: string[] = [];

    switch (this.currentStep) {
      case 1:
        controlsToCheck.push('tipo_cliente');
        break;
      case 2:
        controlsToCheck.push('nombres', 'email', 'password', 'confirm_password', 'terminos', 'cedula', 'telefono');
        // Check for password mismatch specifically since it's a group validator
        if (this.registerForm.hasError('mismatch')) {
          this.registerForm.get('confirm_password')?.markAsTouched();
          isValid = false;
        }
        break;
      case 3:
        groupsToCheck.push('datos_fiscales');
        break;
      case 4:
        groupsToCheck.push('direcciones_entrega');
        break;
    }

    // Validate individual controls
    controlsToCheck.forEach(controlName => {
      const control = this.registerForm.get(controlName);
      if (control) {
        if (control.invalid) {
          control.markAsTouched();
          isValid = false;
        }
      }
    });

    // Validate groups
    groupsToCheck.forEach(groupName => {
      const group = this.registerForm.get(groupName) as FormGroup;
      if (group) {
        if (group.invalid) {
          group.markAllAsTouched();
          isValid = false;
        }
      }
    });

    return isValid;
  }

  nextStep() {
    // START VALIDATION BLOCK
    if (!this.validateCurrentStep()) {
      return;
    }
    // END VALIDATION BLOCK

    // Async Check for Cedula and Email on Step 2
    if (this.currentStep === 2) {
      this.isSubmitting = true;
      const email = this.registerForm.get('email')?.value;
      const cedula = this.registerForm.get('cedula')?.value;

      // 1. Check Cedula Availability
      if (cedula) {
        this.authService.checkCedulaAvailability(cedula).subscribe({
          next: (res) => {
            if (res.exists) {
              this.isSubmitting = false;
              this.registerForm.get('cedula')?.setErrors({ notUnique: true });
              this.registerForm.get('cedula')?.markAsTouched();
              this.cdr.detectChanges();
            } else {
              // 2. Cedula OK, Check Email Availability
              this.checkEmailAndProceed(email);
            }
          },
          error: (err) => {
            this.isSubmitting = false;
            console.error('Error checking cedula:', err);
            // Block progress on network error to prevent submitting with potentially duplicate data or incomplete validation
            alert('No se pudo verificar la cédula. Por favor revise su conexión e intente nuevamente.');
            this.cdr.detectChanges();
          }
        });
        return;
      } else {
        // Should ideally not happen due to validators, but if optional/empty -> proceed to check email
        this.checkEmailAndProceed(email);
        return;
      }
    }

    this.proceedToNext();
  }

  private proceedToNext() {
    if (this.currentStep === 1) {
      this.currentStep++;
    } else if (this.currentStep === 2) {
      if (this.isWholesaler) {
        this.currentStep++; // Go to Business Info
      } else {
        this.currentStep = 4; // Skip to Location
      }
    } else if (this.currentStep === 3) {
      this.currentStep++; // Go to Location
    }
    this.scrollToTop();
    this.cdr.detectChanges();
  }

  private checkEmailAndProceed(email: string) {
    if (email) {
      this.authService.checkEmailAvailability(email).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          if (res.exists) {
            this.registerForm.get('email')?.setErrors({ notUnique: true });
            this.registerForm.get('email')?.markAsTouched();
            this.cdr.detectChanges();
          } else {
            this.proceedToNext();
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Error checking email:', err);
          alert('No se pudo verificar el correo. Por favor revise su conexión e intente nuevamente.');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.isSubmitting = false;
      this.proceedToNext();
    }
  }

  prevStep() {
    if (this.currentStep === 1) return;

    if (this.currentStep === 4) {
      if (this.isWholesaler) {
        this.currentStep--; // Go back to Business
      } else {
        this.currentStep = 2; // Go back to Personal
      }
    } else {
      this.currentStep--;
    }
    this.scrollToTop();
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isSubmitting = true;
      // Usar getRawValue para obtener todo sin modificaciones
      const formValue = this.registerForm.getRawValue();
      console.log('Enviando registro (Raw):', formValue);

      // Helper to cleanup empty strings to undefined
      const clean = (val: string) => val === '' ? undefined : val;

      const payload: any = {
        name: formValue.nombres.trim(),
        email: formValue.email,
        password: formValue.password,
        client_type: formValue.tipo_cliente,
        cedula: clean(formValue.cedula),
        telefono: clean(formValue.telefono?.replace(/-/g, '')) // Remove hyphens for backend
      };

      // Add Business Data if Mayorista
      if (this.isWholesaler) {
        // Construct the object expected by backend using datos_fiscales (fiscal data)
        const datosFiscales = formValue.datos_fiscales;

        payload.datos_negocio = {
          nombre_negocio: datosFiscales.razon_social,
          ruc: datosFiscales.identificacion,
          direccion_negocio: datosFiscales.direccion_matriz,
          ciudad: datosFiscales.ciudad_fiscal,
          telefono_negocio: datosFiscales.telefono_negocio
        };
      }

      // Add Delivery Address if user filled it (has lat/lng from map)
      const direccion = formValue.direcciones_entrega;
      if (direccion.lat && direccion.lng) {
        payload.direcciones_entrega = [{
          alias: direccion.alias || 'Principal',
          calle_principal: direccion.calle_principal,
          ciudad: direccion.ciudad,
          provincia: direccion.provincia,
          codigo_postal: direccion.codigo_postal,
          referencia: direccion.referencia,
          location: {
            lat: direccion.lat,
            lng: direccion.lng
          }
        }];
      }

      this.authService.registerNew(payload).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          console.log('Registro exitoso', res);

          if (res.access_token && res.user) {
            // Redirect to Verify and pass email for context
            console.log('Registro exitoso, redirigiendo a verificación');
            this.router.navigate(['/verify-email'], {
              queryParams: { email: formValue.email }
            });
          } else {
            // Fallback
            this.router.navigate(['/verify-email'], {
              queryParams: { email: formValue.email }
            });
          }
        },
        error: (err) => {
          this.isSubmitting = false;
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
