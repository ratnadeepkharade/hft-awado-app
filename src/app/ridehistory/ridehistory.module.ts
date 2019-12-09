import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RidehistoryPageRoutingModule } from './ridehistory-routing.module';

import { RidehistoryPage } from './ridehistory.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RidehistoryPageRoutingModule
  ],
  declarations: [RidehistoryPage]
})
export class RidehistoryPageModule {}
