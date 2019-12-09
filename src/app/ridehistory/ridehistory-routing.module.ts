import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RidehistoryPage } from './ridehistory.page';

const routes: Routes = [
  {
    path: '',
    component: RidehistoryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RidehistoryPageRoutingModule {}
