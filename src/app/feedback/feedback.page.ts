import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RestService } from '../rest.service';
import { UserService } from '../services/user.service';
import { Storage } from '@ionic/storage';
import { Observable } from 'rxjs';
import { FeedbackService } from 'src/app/services/feedback.service';

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.page.html',
  styleUrls: ['./feedback.page.scss'],
})
export class FeedbackPage implements OnInit {
  feedbackApi:  Observable<any>;
  content: "";
  bikeId=this.feedbackService.getBikeid();

  constructor(private router: Router,
    public httpClient: HttpClient,
    public restService: RestService,
    public userService: UserService,
    private storage: Storage,
    public feedbackService: FeedbackService) { }

  ngOnInit() {
  }
  submitFeedback() {
    this.storage.get('token').then((token) => {
      let url = 'http://193.196.52.237:8081/feedbacks'
      
      const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
      this.feedbackApi = this.httpClient.post<any>(url, {"content": this.content,"bikeId":this.bikeId},{headers});
      this.feedbackApi.subscribe((resp) => {
        console.log("rides response", resp);
        
        //this.loadingService.hideLoader();
      }, (error) => {console.log(error)
        //this.loadingService.hideLoader();
      });
    });
}
}