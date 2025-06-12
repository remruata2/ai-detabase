"use client";

import FileForm from "./FileForm";
import { updateFileAction, FileDetail, CategoryListItem } from "./actions";

interface EditFileFormProps {
  id: number;
  initialData: FileDetail;
  categoryListItems: CategoryListItem[];
}

export default function EditFileForm({
  id,
  initialData,
  categoryListItems,
}: EditFileFormProps) {
  // Create a bound action for this specific file ID
  const updateActionWithId = async (formData: FormData) => {
    return await updateFileAction(id, formData);
  };

  return (
    <FileForm
      initialData={initialData}
      onSubmitAction={updateActionWithId}
      submitButtonText="Update File"
      categoryListItems={categoryListItems}
    />
  );
}
