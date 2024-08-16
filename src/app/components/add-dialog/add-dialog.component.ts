import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-add-dialog',
  templateUrl: './add-dialog.component.html',
  styleUrls: ['./add-dialog.component.css'],
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule,MatDialogModule,MatButtonModule]
})
export class AddDialogComponent {
  newItem: string = '';

  constructor(
    public dialogRef: MatDialogRef<AddDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  onSave(): void {
    if (this.newItem.trim()) {
      this.dialogRef.close(this.newItem);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
