"use client";

import FileForm from "./FileForm";
import { createFileAction, CategoryListItem } from "./actions";

interface NewFileFormProps {
  categoryListItems: CategoryListItem[];
}

export default function NewFileForm({ categoryListItems }: NewFileFormProps) {
  return (
    <FileForm
      onSubmitAction={createFileAction}
      submitButtonText="Create File"
      categoryListItems={categoryListItems}
    />
  );
}
