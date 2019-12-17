import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RestService } from 'src/app/rest.service';
import { ToastService } from '../../services/toast.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  public angForm: FormGroup;
  registerApi: Observable<any>;
 
  correctCredentials: boolean;


  constructor(private router: Router, 
    public httpClient: HttpClient, 
    public restService: RestService,
    private toastService: ToastService,
    private fb: FormBuilder) {
      this.createForm();

     }

  ngOnInit() {
  }
  createForm() {
    this.angForm = this.fb.group({
       
       email: ['',[ Validators.required, Validators.email,Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/)]],
       password: ['', [Validators.required ]],
       firstname: ['',[ Validators.required ]],
       lastname: ['', [Validators.required ]],
       
 
   
    });
    
  }
  submitRegister() {
    if (this.angForm.invalid) {
      return;
  }
  let Form = JSON.stringify(this.angForm.value);
  const headers = new HttpHeaders().set("Content-Type", 'application/json');
    this.registerApi = this.httpClient.post('http://193.196.52.237:8081/register', Form,{headers});
    this.registerApi
      .subscribe((data) => {
        console.log('my data: ', data);
        this.restService.setToken(data.token);
        this.toastService.showToast("Registration Successful!")
        this.router.navigateByUrl('/login');
        
      }, (error) => {
        console.log(error);
        this.toastService.showToast("Registration failed!")
        
      });
  }
  login(){
    this.router.navigateByUrl('/login');
  }
}
