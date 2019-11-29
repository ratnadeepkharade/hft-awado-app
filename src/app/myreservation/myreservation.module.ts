import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MyreservationPageRoutingModule } from './myreservation-routing.module';

import { MyreservationPage } from './myreservation.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MyreservationPageRoutingModule
  ],
  declarations: [MyreservationPage]
})
export class MyreservationPageModule {}
