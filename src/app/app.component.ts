// app.component.ts
import { Component, Injectable, OnInit } from '@angular/core';
import { BehaviorSubject, Subject, Observable, of, throwError } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatTreeModule } from '@angular/material/tree';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectionModel } from '@angular/cdk/collections';
import { CdkTreeModule, FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { map, tap } from 'rxjs/operators';
import { debug } from 'console';
import { ApiService } from './services/api-call.service';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';



// Define TodoItemNode and TodoItemFlatNode interfaces
export class TodoItemNode {
  id!: number;
  name!: string;
  children!: TodoItemNode[]; // Optional children property
  item?: string; // Optional item property
  expandable!: boolean;
  status!: boolean;
}

export class TodoItemFlatNode {
  id!: number;
  name!: string;
  level!: number;
  expandable!: boolean;
  adding!: boolean;
  item!: string; // Ensure this property is used correctly
  status!: string; // Ensure this is a string if that's what your API returns
  children!: TodoItemFlatNode[]; // Optional children property
  called: boolean = false;
}



// ApiCallService
@Injectable({
  providedIn: 'root'
})
export class ApiCallService {
  private getApiUrl = 'http://localhost:1337/api/posts-report?populate=*';
  private childApiUrl = 'http://localhost:1337/api/childrenNode';
  private postApiUrl = 'http://localhost:1337/api/create';
  private deleteApiUrl = 'http://localhost:1337/api/delete/id';
  private rootnode = 'http://localhost:1337/api/rootnode';

  constructor(private http: HttpClient) {

  }

  getNodes(): Observable<TodoItemNode[]> {
    return this.http.get<TodoItemNode[]>(this.rootnode).pipe(
      map(nodes => {
        //   debugger
        console.log(nodes);
        // Directly return nodes as they include the status from the API
        return nodes.map(node => ({
          ...node,

        }));
      })
    );
  }

  // if(!node.children){}

  getChildren(parentId: number): Observable<any> {
    const url = `${this.childApiUrl}/${parentId}`;
    return this.http.get<any>(url);
  }






  deleteNode(id: number): Observable<void> {
    const url = `${this.deleteApiUrl}/${id}`;
    console.log('Deleting node with ID:', id);
    return this.http.delete<void>(url).pipe(
      tap(() => {
        console.log('Node successfully deleted');
      }),
      catchError(error => {
        console.error('Error deleting node:', error);
        return throwError(() => error);
      })
    );
  }
}



// ChecklistDatabase Service
@Injectable({
  providedIn: 'root'
})
export class ChecklistDatabase {
  public dataChange = new BehaviorSubject<TodoItemNode[]>([]);
  private nodes: TodoItemNode[] = [];
  constructor(private http: HttpClient, private apiService: ApiCallService) {
    this.initialize();
  }

  get data(): TodoItemNode[] {
    return this.dataChange.value;
  }



  // initialize(): void {
  //   this.apiService.getNodes().subscribe(
  //     (nodes: TodoItemNode[]) => {
  //       // Update the data in BehaviorSubject with the fetched nodes
  //       this.dataChange.next(nodes);
  //     },
  //     error => {
  //       // Handle errors if needed
  //       console.error('Error fetching nodes:', error);
  //     }
  //   );
  // }

  initialize(): void {
    this.apiService.getNodes().subscribe(
      (nodes: TodoItemNode[]) => {
        nodes.forEach(node => {
          node.children = node.children || []; // Initialize children if not present
        });
        this.dataChange.next(nodes);
      },
      error => {
        console.error('Error fetching nodes:', error);
      }
    );
  }





  updateItem(node: TodoItemNode, name: string): void {
    node.name = name;
    this.dataChange.next(this.data);
  }

  removeItem(node: TodoItemNode): void {
    const parent = this.getParentNode(node);
    if (parent) {
      if (parent.children) {
        parent.children = parent.children.filter(child => child !== node);

        if (parent.children.length === 0) {
          this.removeItem(parent); // Recursively remove parent if it has no children
        }
      }
      this.dataChange.next(this.data);
    } else {
      const data = this.data.filter(rootNode => rootNode !== node);
      this.dataChange.next(data);
    }
  }

  getParentNode(node: TodoItemNode): TodoItemNode | null {
    const nodes = this.data;
    function findParentRecursively(nodes: TodoItemNode[], node: TodoItemNode): TodoItemNode | null {
      for (const item of nodes) {
        if (item.children?.includes(node)) {
          return item;
        }
        const result = findParentRecursively(item.children || [], node);
        if (result) return result;
      }
      return null;
    }
    return findParentRecursively(nodes, node);
  }






}

// AppComponent
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MatIconModule,
    MatTreeModule,
    MatCheckboxModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatButtonModule,
    CommonModule,
    FormsModule,
    MatInputModule,
    CdkTreeModule,
    MatSelectModule,
    MatOptionModule,
  ],
  templateUrl: 'app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [ChecklistDatabase],
})
export class AppComponent implements OnInit {

  nodeStatusList: { [key: number]: { node: TodoItemFlatNode; status: boolean } } = {};
  flatNodeMap = new Map<TodoItemFlatNode, TodoItemNode>();
  nestedNodeMap = new Map<TodoItemNode, TodoItemFlatNode>();
  selectedParent: TodoItemFlatNode | null = null;
  newItemName = '';
  private searchTerms = new Subject<string>();
  treeControl: FlatTreeControl<TodoItemFlatNode>;
  treeFlattener: MatTreeFlattener<TodoItemNode, TodoItemFlatNode>;
  dataSource: MatTreeFlatDataSource<TodoItemNode, TodoItemFlatNode>;
  selectedNode: TodoItemFlatNode | null = null; // Use null to indicate no selection
  newParentId: string | null = null;
  checklistSelection = new SelectionModel<TodoItemFlatNode>(true);
  editingNodeLevel !: TodoItemFlatNode;
  optionnodes: TodoItemFlatNode[] = [];
  dropdownData: TodoItemFlatNode[] = [];
  editingNode: TodoItemFlatNode | null = null;
  editingNodePosition: TodoItemFlatNode | null = null;
  filterName: string = '';
  noDataMessage: any = '';
  isExpandable = (node: TodoItemFlatNode) => node.expandable;
  constructor(private apiService: ApiService, private cdr: ChangeDetectorRef, private apiCallService: ApiCallService, private _database: ChecklistDatabase, private http: HttpClient, private checklistDatabase: ChecklistDatabase) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren
    );
    this.treeControl = new FlatTreeControl<TodoItemFlatNode>(
      this.getLevel,
      this.isExpandable
    );
    this.dataSource = new MatTreeFlatDataSource(
      this.treeControl,
      this.treeFlattener
    );

    _database.dataChange.subscribe(data => {
      this.dataSource.data = data;
      this.getdropddownnode();
    });




  }





  ngOnInit(): void {
    this.searchTerms.pipe(
      debounceTime(300), // Wait for 300ms pause in events
      distinctUntilChanged(), // Only emit when the current value is different from the last
      switchMap((term: string) => {
        if (term.trim().length === 0) {
          // Fetch all data when search term is empty
          return this.apiService.getAllData();
        } else {
          // Fetch filtered data based on the search term
          return this.apiService.getFilteredData(term);
        }
      }),
      catchError(error => {
        console.error('Error fetching data:', error);
        // Set a user-friendly error message
        this.noDataMessage = 'An error occurred while fetching data. Please try again later.';
        // Return an empty array to prevent further processing
        return of([]);
      })
    ).subscribe(data => {
      if (data.length === 0) {
        if (this.filterName.trim().length > 0) {
          // If search term is not empty and no data is found
          this.noDataMessage = 'No results found for your search.';
        } else {
          // If search term is empty, clear the message
          this.noDataMessage = '';
        }
        this.updateTreeData([]); // Optionally, you can clear the tree or handle empty data
      } else {
        // If data is not empty, clear the no data message and update tree
        this.noDataMessage = '';
        this.updateTreeData(data);
      }
    });
  }






  getLevel = (node: TodoItemFlatNode) => node.level;
  //isExpandable = (node: TodoItemFlatNode) => node.expandable;
  getChildren = (node: TodoItemNode): TodoItemNode[] => node.children || [];
  hasChild = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.expandable;
  //  hasChild = (_: number, node: TodoItemNode) => !!node.children && node.children.length > 0;
  // hasChild = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.status;

  hasNoContent = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.name === '';
  isAddingNewItem = (node: TodoItemFlatNode) => node.adding = true;
  newItemParentNode: TodoItemFlatNode | null = null;

  transformer = (node: TodoItemNode, level: number) => {
    debugger
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode = existingNode && existingNode.name === node.name ? existingNode : new TodoItemFlatNode();
    flatNode.id = node.id;
    flatNode.name = node.name;
    flatNode.level = level;
    // flatNode.expandable = !!node.children?.length;
    if (node.status === undefined) {
      flatNode.expandable = !!node.children?.length;
    }
    else {
      flatNode.expandable = node.status;
    }

    flatNode.adding = false;
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  // fetchFilteredData(): void {
  //   this.apiService.getFilteredData(this.filterName).subscribe(
  //     (data) => {
  //       // Assuming `data` is already in the tree format from the API
  //       this.updateTreeData(data);
  //     },
  //     (error) => {
  //       console.error('Error fetching data:', error);
  //     }
  //   );
  // }


  onFilterChange(term: string): void {
    this.searchTerms.next(term); // Emit the search term
  }


  updateTreeData(nodes: TodoItemNode[]): void {
    this.dataSource.data = nodes;
  }







  addNewItem(node: TodoItemFlatNode) {
    this.isAddingNewItem(node);
    this.newItemParentNode = node;

    this.newItemName = '';
    this.treeControl.expand(node);

  }

  refreshTree() {
    this._database.initialize();
    this.dataSource.data = [...this._database.data];
  }

  edit(node: TodoItemFlatNode) {
    this.editingNode = node;
  }



  saveEdit(node: TodoItemFlatNode, name: string) {
    const nestedNode = this.flatNodeMap.get(node);
    if (nestedNode) {
      this._database.updateItem(nestedNode, name);
      this.refreshTree();
      this.editingNode = null;
    }
  }

  deleteItem(node: TodoItemFlatNode) {
    const nestedNode = this.flatNodeMap.get(node);
    if (nestedNode) {
      this.http.delete(`http://localhost:1337/api/delete/${nestedNode.id}`).pipe(
        tap(response => {
          const res = response as { message: string }; // Type assertion
          if (res.message === 'Node successfully deleted') {
            console.log('Node successfully deleted:', res);
            this._database.removeItem(nestedNode); // Remove from local data only after successful backend deletion
            this.refreshTree(); // Refresh after deletion
          } else if (res.message === 'Node has children and cannot be deleted') {
            alert('Cannot delete a node with children. Please delete child nodes first.');
          } else {
            alert('Node not found or an unexpected issue occurred.');
          }
        }),
        catchError(error => {
          console.error('Error communicating with the backend:', error);
          alert('An error occurred while communicating with the server.');
          return throwError(() => error);
        })
      ).subscribe();
    }
  }




  hasChildren(node: TodoItemFlatNode): boolean {
    const nestedNode = this.flatNodeMap.get(node);
    return nestedNode ? (nestedNode.children?.length ?? 0) > 0 : false;
  }

  saveNode(node: TodoItemFlatNode, name: string) {
    const nestedNode = this.flatNodeMap.get(node);
    if (nestedNode) {
      const body = {
        data: { name: name, parentId: nestedNode.id }
      };
      this.http.post('http://localhost:1337/api/create', body).pipe(
        tap(response => {
          console.log('Node successfully added:', response);
          this.refreshTree(); // Refresh after adding
        }),
        catchError(error => {
          console.error('Error sending node to backend:', error);
          return throwError(() => error);
        })
      ).subscribe();
    }
  }

  editName(node: TodoItemFlatNode, newName: string): void {
    const nestedNode = this.flatNodeMap.get(node);
    if (nestedNode) {
      this.updateNodeName(nestedNode.id, newName);
    }
  }



  updateNodeName(id: number, newName: string) {
    const body = {
      data: { name: newName }
    };
    this.http.put(`http://localhost:1337/api/editname/${id}`, body).pipe(
      tap(response => {
        console.log('Node successfully updated:', response);
        this.refreshTree(); // Refresh after update
      }),
      catchError(error => {
        console.error('Error updating node:', error);
        alert('An error occurred while updating the node.');
        return throwError(() => error);
      })
    ).subscribe();
  }




  onSelection(id: number) {
    // debugger
    const newParent = this.editingNodeLevel;

    if (!newParent || !newParent.id) {
      alert('New parent is not valid.');
      return;
    }

    // Create the body with the new parent ID
    const body = {
      data: {
        newParentId: newParent.id // Ensure this is the correct field name expected by your backend
      }
    };

    // Perform the HTTP PUT request
    this.http.put(`http://localhost:1337/api/editposition/${id}`, body).pipe(
      tap(response => {
        console.log('Node successfully updated:', response);
        this.refreshTree(); // Refresh the tree view after successful update
      }),
      catchError(error => {
        console.error('Error updating node:', error);
        alert('An error occurred while updating the node.');
        return throwError(() => error);
      })
    ).subscribe();
  }

  updateNodePosition(nodeId: number, newParentId: number) {
    const url = `http://localhost:1337/api/editposition/${nodeId}`;
    const body = { newParentId: newParentId };

    return this.http.put(url, body).pipe(
      catchError(error => {
        console.error('Error updating node position:', error);
        return throwError(error);
      })
    );
  }


  deleteChild(parent: TodoItemNode, target: TodoItemNode): boolean {
    if (!parent.children) {
      // If parent.children is undefined, return false
      return false;
    }

    const index = parent.children.indexOf(target);
    if (index >= 0) {
      parent.children.splice(index, 1);
      return true;
    }

    // Recursively search for the target in the children
    return parent.children.some((child) => this.deleteChild(child, target));
  }




  childTree(newParent: TodoItemNode, subtree: TodoItemNode): void {
    if (!newParent.children) {
      newParent.children = [];
    }
    newParent.children.push(subtree);
  }

  updateData(): void {
    this._database.dataChange.next(this._database.data);
  }

  updatePosition(node: TodoItemFlatNode) {
    this.editingNodePosition = node;
    this.getdropddownnode(node);
    // this.editingNodeLevel = node.item;
    this.treeControl.expand(node);
  }

  getdropddownnode(selectedNode: TodoItemFlatNode | null = null): void {
    if (!selectedNode) {
      return;
    }

    const nodeId = selectedNode.id;
    const apiUrl = `http://localhost:1337/api/getName/${nodeId}`;

    this.http.get<TodoItemFlatNode[]>(apiUrl).subscribe(
      (data) => {
        if (data && data.length > 0) {
          this.optionnodes = data; // Populate optionnodes with the API data
          console.log('Option Nodes:', this.optionnodes); // Log to verify the structure
        } else {
          console.error('No data received or data is empty');
          alert('No dropdown data available for the selected node.');
        }
      });
  }








  // getdropddownnode(excludeNode: TodoItemFlatNode | null = null): TodoItemFlatNode[] {
  //   const allNodes: TodoItemFlatNode[] = [];


  //   const excludeSet = new Set<TodoItemFlatNode>();

  //   // Function to add a node and all its descendants to the exclude set
  //   const addChildrenToExcludeSet = (node: TodoItemNode) => {
  //     if (node.children) {
  //       node.children.forEach((childNode) => {
  //         const childFlatNode = this.nestedNodeMap.get(childNode);
  //         if (childFlatNode) {
  //           excludeSet.add(childFlatNode);
  //           addChildrenToExcludeSet(childNode);
  //         }
  //       });
  //     }
  //   };

  //   // Function to find and add parent of a given node to the exclude set
  //   const addParentToExcludeSet = (node: TodoItemNode) => {
  //     const parent = this._database.getParentNode(node); // Find parent of the given node
  //     if (parent) {
  //       const parentFlatNode = this.nestedNodeMap.get(parent);
  //       if (parentFlatNode) {
  //         excludeSet.add(parentFlatNode);
  //       }
  //     }
  //   };

  //   if (excludeNode) {
  //     // Add the excludeNode itself to the exclude set
  //     excludeSet.add(excludeNode);

  //     // Fetch the nested node corresponding to excludeNode
  //     const nestedNode = this.flatNodeMap.get(excludeNode);
  //     if (nestedNode) {
  //       addChildrenToExcludeSet(nestedNode);
  //       addParentToExcludeSet(nestedNode);
  //     }
  //     // console.log('Exclude Node:', excludeNode);
  //     // console.log('Exclude Set:', Array.from(excludeSet));
  //   }

  //   const collectAllNodes = (nodes: TodoItemNode[], level: number) => {
  //     nodes.forEach((node) => {
  //       const flatNode = this.transformer(node, level);
  //       if (!excludeSet.has(flatNode)) {
  //         allNodes.push(flatNode);
  //       }
  //       if (node.children) {
  //         collectAllNodes(node.children, level + 1);
  //       }
  //     });
  //   };

  //   collectAllNodes(this._database.data, 0);
  //   return allNodes;
  // }

  // handleNodeClick(node: TodoItemFlatNode) {
  //   // Check if the node is expanded
  //   if (this.treeControl.isExpanded(node)) {
  //     this.apiCallService.getChildren(node.id).subscribe((children) => {
  //       const node1 = this.flatNodeMap.get(node);
  //       if (node1) {
  //         // Ensure node1.children is an array
  //         if (!node1.children) {
  //           node1.children = [];
  //         }

  //         // Add the fetched children to node1's children array
  //         node1.children.push(...children); // Use spread operator to merge arrays

  //         // Log to verify
  //         console.log(node1);

  //         // Update tree control data
  //         this.treeControl.dataNodes = [...this.treeControl.dataNodes];
  //       }
  //     });
  //   }
  // }

  // handleNodeClick(node: TodoItemFlatNode) {
  //   // Check if the node is expanded
  //   if (this.treeControl.isExpanded(node)) {
  //     this.apiCallService.getChildren(node.id).subscribe((children) => {
  //       const node1 = this.flatNodeMap.get(node);
  //       if (node1) {
  //         // Ensure node1.children is an array
  //         if (!node1.children) {
  //           node1.children = [];
  //         }

  //         // Add the fetched children to node1's children array
  //         node1.children.push(...children);





  //         this.treeControl.dataNodes = [...this.treeControl.dataNodes];


  //         if (this.dataSource) {
  //           this.dataSource.data = [...this.dataSource.data];
  //         }
  //       } else {
  //         console.error('Node not found in flatNodeMap');
  //       }
  //     }, (error) => {
  //       console.error('Error fetching children:', error);
  //     });
  //   }
  // }


  handleNodeClick(node: TodoItemFlatNode) {
    // Find the corresponding node in the flatNodeMap
    const node1 = this.flatNodeMap.get(node);

    // Check if the node exists in the map and if it has children
    if (node1 && node1.children && node1.children.length > 0) {
      // Children are already loaded, no need to call the API
      return;
    }

    // If node1 or node1.children is not present or empty, proceed to call the API
    this.apiCallService.getChildren(node.id).subscribe(
      (children) => {
        if (node1) {
          // Ensure node1.children is an array
          if (!node1.children) {
            node1.children = [];
          }

          // Add the fetched children to node1's children array
          node1.children.push(...children);

          // Update the tree control and data source
          this.treeControl.dataNodes = [...this.treeControl.dataNodes];
          if (this.dataSource) {
            this.dataSource.data = [...this.dataSource.data];
          }
        } else {
          console.error('Node not found in flatNodeMap');
        }
      },
      (error) => {
        console.error('Error fetching children:', error);
      }
    );
  }






}




















// toggleNode(node: TodoItemFlatNode): void {
//   // Toggle the node's expanded state
//   this.treeControl.toggle(node);

//   // Fetch children if the node is expanded
//   if (this.treeControl.isExpanded(node)) {
//     this.apiCallService.getChildren(node.id).subscribe((children) => {
//       // Log the children array directly
//       console.log('Children:', children);

//       // Update node's children if the data is available
//       if (children) {
//         node.children = children; // Ensure `children` is correctly typed and used

//         // Optionally, refresh the tree control
//         this.treeControl.dataNodes = [...this.treeControl.dataNodes];
//       }
//     });
//   }
// }













// applyFilter() {
//   this.checklistDatabase.applyFilter();

// }





// applyFilter(event: Event): void {
//   const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();

//   // Create the HttpParams object
//   const params = new HttpParams().set('name', filterValue);

//   // Call the API directly
//   this.http.get<any[]>('http://localhost:1337/api/filter', { params })
//     .subscribe(
//       data => {
//         this.dataSourcey = data;

//       },
//       error => {
//         console.error('Error fetching filtered data', error);
//       }
//     );
// }

// toggleNode(node: TodoItemFlatNode): void {
//   // Toggle the node
//   this.treeControl.toggle(node);

//   // Get children and update node
//   this.apiCallService.getChildren(node.id).subscribe((children) => {
//     // Log the children array directly
//     console.log('Children:', children);

//     // Update the node with fetched children
//     const node1 = this.flatNodeMap.get(node);
//     if (node1) {
//       node1.children.push( children); // Assuming node1 has a `children` property
//       console.log(node1);

//     }

//   });

//   this.refreshTree()
//  // this.dataSource.data=[...data]
// }





// toggleNode(node: TodoItemFlatNode): void {
//   // Toggle the node's expanded state
//   this.treeControl.toggle(node);

//   // Fetch children if the node is expanded
//   if (this.treeControl.isExpanded(node)) {
//     this.apiCallService.getChildren(node.id).subscribe((children) => {
//       // Log the children array directly
//       console.log('Children:', children);

//       // Update node's children if the data is available
//       if (children) {
//         node.children = children; // Ensure `children` is correctly typed and used

//         // Optionally, refresh the tree control
//         this.treeControl.dataNodes = [...this.treeControl.dataNodes];
//       }
//     });
//   }
// }












// applyFilter() {
//   this.checklistDatabase.applyFilter();

// }





// applyFilter(event: Event): void {
//   const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();

//   // Create the HttpParams object
//   const params = new HttpParams().set('name', filterValue);

//   // Call the API directly
//   this.http.get<any[]>('http://localhost:1337/api/filter', { params })
//     .subscribe(
//       data => {
//         this.dataSourcey = data;

//       },
//       error => {
//         console.error('Error fetching filtered data', error);
//       }
//     );
// }



// async handleNodeClick(node: TodoItemFlatNode) {
//   let nodeID = node.id;
//   this.nodeStatusList[nodeID] = {
//     node: node,
//     status: this.treeControl.isExpanded(node)
//   };

//   // Check if the node is already processed
//   if (node.called) {
//     // Mark node as processed
//     return;
//   }

//   node.called = true; // Mark this node as processed

//   if (this.treeControl.isExpanded(node)) {
//     let flatNode: TodoItemNode = this.flatNodeMap.get(node)!;

//     // Ensure flatNode exists
//     if (flatNode) {
//       let length = flatNode.children ? flatNode.children.length : 0;

//       // If there are no children already, fetch them
//       if (length === 0) {
//         try {
//           // Fetch children using the treeService and convert Observable to Promise
//           let childs = await this.apiCallService.getChildren(node.id).toPromise();

//           // Ensure the fetched data is an array
//           if (!Array.isArray(childs)) {
//             throw new Error('Fetched data is not an array');
//           }

//           // Convert received data to TodoItemNode array
//           let mappedChildren = this.mapToTodoItemNodeArray(childs);

//           // Update flatNode's children
//           flatNode.children = mappedChildren;

//           // Log to verify
//           console.log(flatNode);

//           // Update tree control data
//           this.treeControl.dataNodes = [...this.treeControl.dataNodes];
//         } catch (error) {
//           console.error('Error fetching node data', error);
//         }
//       }
//     }
//   }
// }

// private mapToTodoItemNodeArray(data: any[]): TodoItemNode[] {
//   return data.map(item => {
//     let node = new TodoItemNode();
//     node.id = item.id;
//     node.name = item.name;
//     node.children = []; // Initialize empty array for children
//     node.status = item.status;
//     return node;
//   });
// }



// getDatabypage(node: TodoItemFlatNode) {
//   const nodeId = node.id;
//   if (!nodeId) return;
//   this.http.get<any>(`${apiUrl}/getfilter/?parentId=${nodeId}`).subscribe(
//     (response: any) => {
//       try {
//         const nodes = response.nodes || [];
//         const childNodes = this._database.mapNodes(nodes); // Map the response to TodoItemNode[]
//         const parentNode = this.flatNodeMap.get(node);
//         if (parentNode) {
//           parentNode.children = childNodes; // Append children to the node
//           parentNode.expandable = childNodes.length > 0; // Update expandable status
//           this._database.dataChange.next(this._database.data); // Trigger change detection
//           this.treeControl.expand(node); // Expand the node to show the children
//         }
//       } catch (error) {
//         console.error('Error processing data:', error);
//       }
//     },
//     error => {
//       console.error('Error fetching data:', error);
//     }
//   );
// }

