import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { CollectionFormComponent } from './collection-form/collection-form.component';
import { CollectionLinksComponent } from './collection-links/collection-links.component';
import { CreateCollectionComponent } from './create-collection/create-collection.component';
import { EditCollectionComponent } from './edit-collection/edit-collection.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { PageConfirmCollectionComponent } from './page-confirm-collection/page-confirm-collection.component';
import { PageHomeComponent } from './page-home/page-home.component';

import { CollectionService } from './shared/collection/collection.service';
import { AuthInfoService } from './shared/auth-info/auth-info.service';

@NgModule({
  declarations: [
    AppComponent,
    CollectionFormComponent,
    CollectionLinksComponent,
    CreateCollectionComponent,
    EditCollectionComponent,
    FooterComponent,
    HeaderComponent,
    PageConfirmCollectionComponent,
    PageHomeComponent
  ],
  imports: [
    AppRoutingModule,
    BrowserModule,
    FormsModule,
    HttpModule
  ],
  providers: [
    AuthInfoService,
    CollectionService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }