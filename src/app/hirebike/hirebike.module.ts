import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HirebikePageRoutingModule } from './hirebike-routing.module';

import { HirebikePage } from './hirebike.page';
import { HereMapComponent } from '../components/here-map/here-map.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HirebikePageRoutingModule
  ],
  declarations: [HirebikePage,
    HereMapComponent]
})
export class HirebikePageModule {}
