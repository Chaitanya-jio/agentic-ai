import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SessionService } from './services/session.service';
import { OpenAiApiService } from './services/open-ai-api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  selectedFile: File | null = null;
  textContent: string = '';
  sidenavOpened = false;
  isUploading = false;
  uploadedFileName: string = '';
  uploadError: string = '';
  successMessage: string = '';

  constructor(
    private http: HttpClient,
    private sessionService: SessionService,
    private openAiApiService: OpenAiApiService
  ) {}

  toggleSidenav() {
    this.sidenavOpened = !this.sidenavOpened;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
      this.uploadedFileName = file.name;
      this.uploadError = '';
      this.successMessage = '';
    } else {
      this.selectedFile = null;
      this.uploadedFileName = '';
      this.uploadError = 'Please select a valid PDF file';
      event.target.value = ''; // Reset file input
    }
  }

  onSubmit() {
    if (this.selectedFile) {
      this.isUploading = true;
      const userId = this.sessionService.getSessionId(); // Get the user ID from the session
      const additionalText = '""'; // Set additional text as required

      this.openAiApiService.uploadPdf(this.selectedFile, userId, additionalText)
        .subscribe(
          response => {
            console.log('Upload successful', response);
            this.openAiApiService.setCollectionName(response.collection_name);
            this.isUploading = false;
            this.selectedFile = null;
            //this.uploadedFileName = '';
            this.successMessage = 'Successfully updated Knowledge base';
          },
          error => {
            console.error('Upload failed', error);
            this.isUploading = false;
            this.uploadError = 'Upload failed. Please try again.';
            this.successMessage = '';
          }
        );
    } else {
      this.uploadError = 'Please select a PDF file first';
      this.successMessage = '';
    }
  }
}
