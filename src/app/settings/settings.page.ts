import { Component, OnInit } from '@angular/core';
import { Router, LoadChildrenCallback } from '@angular/router';
import { ToastService } from '../services/toast.service';
@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  constructor(private router: Router,private toastService: ToastService) { }

  ngOnInit() {
  }
  ChangePassword() {
    this.router.navigateByUrl('/reset-password');
  }
  DeactivateUser(){
    this.toastService.showToast("Account Deactivated Sucessfully");
    this.router.navigateByUrl('/logout');
  }
}
