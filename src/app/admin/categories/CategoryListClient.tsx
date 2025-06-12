"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CategoryList } from "@/generated/prisma"; // Assuming CategoryList is the type from Prisma
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { deleteCategoryAction } from "./actions";
import { Pencil, Trash2 } from "lucide-react";
import { cardContainer } from "@/styles/ui-classes";

interface CategoryListClientProps {
  categories: CategoryList[];
}

export default function CategoryListClient({
  categories: initialCategories,
}: CategoryListClientProps) {
  const [categories, setCategories] = useState<CategoryList[]>(initialCategories);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryList | null>(null);

  // Update categories if initialCategories prop changes (e.g., after revalidation)
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const handleDeleteClick = (category: CategoryList) => {
    setCategoryToDelete(category);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirmation = async () => {
    if (!categoryToDelete) return;

    const result = await deleteCategoryAction(categoryToDelete.id);

    if (result.success) {
      toast.success("Category deleted successfully.");
      // Optimistically update UI or rely on revalidatePath from server action
      setCategories((prevCategories) =>
        prevCategories.filter((cat) => cat.id !== categoryToDelete.id)
      );
    } else {
      toast.error(result.error || "Failed to delete category.");
    }
    setShowDeleteDialog(false);
    setCategoryToDelete(null);
  };

  

  return (
    <>
      <div className={cardContainer}>
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[200px]">File No</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.file_no}</TableCell>
                <TableCell>{category.category}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild className="mr-2">
                    <Link href={`/admin/categories/${category.id}/edit`} className="text-indigo-600 hover:text-indigo-900" title="Edit">
                      <Pencil className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(category)}
                    className="text-red-600 hover:text-red-900"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {categories.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-500">No categories found. Get started by adding a new one!</p>
        )}
      </div>

      {categoryToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                category "<strong>{categoryToDelete.category}</strong>" (File No: {categoryToDelete.file_no}).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirmation}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
