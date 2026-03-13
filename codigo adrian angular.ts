import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { QuerieService } from '../../service/querie/querie.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-queries',
  templateUrl: './queries.component.html',
  styleUrl: './queries.component.css'
})
export class QueriesComponent {
  consultaForm = new FormGroup({
    cedula: new FormControl('', Validators.required), // Agregado el control 'cedula'
    token: new FormControl('', Validators.required)
  });
  
  isConsultaRealizada: boolean = false;
  isConsultando: boolean = false;
  areNames: boolean = false;
  areLastnames: boolean = false;
  isCounter: boolean = false;
  isService: boolean = false;
  isBarber: boolean = false;
  isDate: boolean = false;
  namesHTML: string = '';
  lastNamesHTML: string = '';
  Counter: string = '';
  Service: string = '';
  Barber: string = '';
  Date: string = '';
  sales: any[] = [];
  errorMessage: string = ''; // Add a property to store the error message

  constructor(private router: Router, private quierieService: QuerieService) { }

  isConsultaPage(): boolean {
    return this.router.url === '/queries';
  }

  async onConsultar() {
    console.log('Consultando cortes');
    
    // Ejecuta el reCAPTCHA con la acción 'consultar'
    const token = await this.quierieService.executeRecaptcha('submit');
    this.consultaForm.controls['token'].setValue(token);
    if (this.consultaForm.invalid || this.isConsultando) {
      return; // Evitar el reenvío si el formulario no es válido o ya se está enviando
    }

    this.isConsultando = true; // Bloquea el botón
    console.log("Consultando");

    try {
      console.log('Argumento enviado:', this.consultaForm.value);
      // Envía el comentario
      const response = await this.quierieService.sendFeedback(this.consultaForm.value);
      if (response && response.success) {
        if (response.names){
          this.areNames = true;
          this.namesHTML = response.names;
        } if (response.lastNames) {
          this.areLastnames = true;
          this.lastNamesHTML = response.lastNames;
        } 
        // Ensure the counter value is displayed even when it is 0
        this.isCounter = true;
        const remainingCuts = 5 - response.counter;
        this.Counter = `${remainingCuts}`;
        
        if (response.services) {
          this.isService = true;
          this.Service = response.services;
        } if (response.barbers) {
          this.isBarber = true;
          this.Barber = response.barbers;
        } if (response.dates) {
          this.isDate = true;
          this.Date = response.dates;
        } if (response.sales && this.Counter !== '5') {
          this.sales = response.sales; // Store the sales data
        }

        this.isConsultaRealizada = true; // Mostrar animación de éxito
      } else if (response && !response.success) {
        this.errorMessage = response.message; // Store the error message
        console.log(this.errorMessage);
      } else {
        console.error('Error: La respuesta del servidor no fue OK.');
      }

    } catch (error) {
      console.error('Error submitting feedback', error);
      console.log(error);
    } finally {
      this.isConsultando = false; // Habilita nuevamente el botón si es necesario
    }
  }
}
