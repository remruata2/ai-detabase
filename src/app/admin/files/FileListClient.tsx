"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { FileListEntry, deleteFileAction } from './actions';
import { cardContainer } from '@/styles/ui-classes';
import { format } from 'date-fns';

interface FileListClientProps {
  initialFiles: FileListEntry[];
  initialError?: string | null;
}

export default function FileListClient({
  initialFiles,
  initialError,
}: FileListClientProps) {
  const [files, setFiles] = useState<FileListEntry[]>(initialFiles);
  const [error, setError] = useState<string | null>(initialError || null);
  const [loading, setLoading] = useState<boolean>(false); // For delete action
  const [itemToDelete, setItemToDelete] = useState<FileListEntry | null>(null);

  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  useEffect(() => {
    setError(initialError || null);
  }, [initialError]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setLoading(true);
    try {
      const result = await deleteFileAction(itemToDelete.id);
      if (result.success) {
        setFiles(files.filter((file) => file.id !== itemToDelete.id));
        toast.success(result.message || 'File deleted successfully!');
      } else {
        toast.error(result.error || 'Failed to delete file.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
      console.error(err);
    }
    setLoading(false);
    setItemToDelete(null);
  };

  if (loading && !itemToDelete) setLoading(false); // Reset loading if dialog closed prematurely

  if (error && !loading) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  return (
    <div className={cardContainer}>
      {files.length === 0 && !loading ? (
        <p className="text-center text-gray-500 py-8">No files found.</p>
      ) : (
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[150px]">File No</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-[150px]">Entry Date</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell className="font-medium">{file.file_no}</TableCell>
                <TableCell>{file.category}</TableCell>
                <TableCell>{file.title}</TableCell>
                <TableCell>
                  {file.entry_date_real
                    ? format(new Date(file.entry_date_real), 'dd MMM yyyy')
                    : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/files/${file.id}`}>
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/files/${file.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setItemToDelete(file)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the file
              record "<strong>{itemToDelete?.file_no} - {itemToDelete?.title}</strong>".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)} disabled={loading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700">
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
