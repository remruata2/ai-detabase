import CategoryForm from "../CategoryForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createCategoryAction } from "../actions";
import { Metadata } from "next";
import { pageContainer, pageTitle, cardContainer } from "@/styles/ui-classes";
import BackButton from "@/components/ui/BackButton";

export const metadata: Metadata = {
  title: "Add New Category",
};

export default function NewCategoryPage() {
  return (
    <div className={pageContainer}>
      <div className={`max-w-2xl mx-auto ${cardContainer}`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className={pageTitle}>Add New Category</h1>
          <BackButton href="/admin/categories" text="Back to Categories" />
        </div>
        <CategoryForm
          submitAction={createCategoryAction}
          buttonText="Create Category"
        />
      </div>
    </div>
  );
}
