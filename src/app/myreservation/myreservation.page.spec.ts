import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { MyreservationPage } from './myreservation.page';

describe('MyreservationPage', () => {
  let component: MyreservationPage;
  let fixture: ComponentFixture<MyreservationPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MyreservationPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(MyreservationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
