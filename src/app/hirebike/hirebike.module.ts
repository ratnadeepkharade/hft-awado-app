import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HirebikePageRoutingModule } from './hirebike-routing.module';

import { HirebikePage } from './hirebike.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HirebikePageRoutingModule
  ],
  declarations: [HirebikePage]
})
export class HirebikePageModule {}
