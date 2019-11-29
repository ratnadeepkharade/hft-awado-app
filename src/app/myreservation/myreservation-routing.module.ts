import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MyreservationPage } from './myreservation.page';

const routes: Routes = [
  {
    path: '',
    component: MyreservationPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MyreservationPageRoutingModule {}
