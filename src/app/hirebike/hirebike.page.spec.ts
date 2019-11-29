import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HirebikePage } from './hirebike.page';

describe('HirebikePage', () => {
  let component: HirebikePage;
  let fixture: ComponentFixture<HirebikePage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HirebikePage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(HirebikePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
