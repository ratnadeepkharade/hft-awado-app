import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HirebikePage } from './hirebike.page';

const routes: Routes = [
  {
    path: '',
    component: HirebikePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HirebikePageRoutingModule {}
