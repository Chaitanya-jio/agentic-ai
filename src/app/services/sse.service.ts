import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SseService {

  constructor(private zone: NgZone, private http: HttpClient) {}

  connect(url: string): Observable<string> {
    return new Observable<string>((observer) => {
      const eventSource = new EventSource(url);

      // Listen for messages from the server
      eventSource.onmessage = (event) => {
        this.zone.run(() => {
          observer.next(event.data);
        });
      };

      // Handle errors
      eventSource.onerror = (error) => {
        this.zone.run(() => {
          observer.error(error);
        });
        eventSource.close(); // Close connection on error
      };

      // Cleanup when the subscription is unsubscribed
      return () => {
        eventSource.close();
      };
    });
  };

  post(url: string, body: any): Observable<string> {
    return new Observable<string>((observer) => {
      // Send a POST request to initiate the stream
      this.http.post(url, body).subscribe({
        next: () => {
          // Open the SSE stream after POST succeeds
          const eventSource = new EventSource(url);
          eventSource.onmessage = (event) => observer.next(event.data);
          eventSource.onerror = (error) => {
            observer.error(error);
            eventSource.close();
          };

          return () => eventSource.close(); // Cleanup
        },
        error: (err) => observer.error(err),
      });
    });
  }



}
