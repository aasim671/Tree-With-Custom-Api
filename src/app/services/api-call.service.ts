import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { off } from 'node:process';

// Define the interface for the node object used in API communication
export interface ApiNode {
  name: string;
  parentId: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:1337/api/filter';
  private getApiUrl = 'http://localhost:1337/api/posts-report?populate=*';
  private baseUrl = 'http://localhost:1337/api/node';


  constructor(private http: HttpClient) { }


  // Method to get filtered data from the API
  // getFilteredData(name: string): Observable<any> {
  //   return this.http.get<any>(`${this.apiUrl}?name=${name}`)
  //     .pipe(
  //       tap(data => console.log('Fetched data:', data))

  //     );
  // }


  getFilteredData(name: string): Observable<any> {
    const url = `${this.apiUrl}?name=${encodeURIComponent(name)}`;

    return this.http.get<any>(url).pipe(
      tap(data => console.log('Fetched data:', data)),
      catchError(error => {
        console.error('Error fetching filtered data:', error);
        return of([]); // Return an empty array or appropriate fallback
      })
    );
  }




  getAllData(): Observable<any> {
    return this.http.get<any>(this.getApiUrl)

      .pipe(
        tap(data => console.log('Fetched all data:', data)),

      );
  }

}













// Method to get nodes from the backend
// getNodes(): Observable<any> {
//   return this.http.get<any>(this.getApiUrl).pipe(
//     tap(response => {
//       console.log('Nodes fetched successfully:', response);
//     }),
//     catchError(error => {
//       console.error('Error fetching nodes:', error);
//       return throwError(() => error);
//     })
//   );
// }

// Method to send nodes to the backend
// sendNodes(nodes: ApiNode[]): Observable<any> {
//   console.log('Sending nodes:', nodes);
//   return this.http.post<any>(this.postApiUrl, nodes).pipe(
//     tap(response => {
//       console.log('Nodes successfully sent:', response);
//     }),
//     catchError(error => {
//       console.error('Error sending nodes to backend:', error);
//       return throwError(() => error);
//     })
//   );
// }

