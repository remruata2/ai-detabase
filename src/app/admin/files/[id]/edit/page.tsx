import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { UserRole } from "@/generated/prisma";
import EditFileForm from "../../EditFileForm"; // Adjusted path
import { getFileById, FileDetail, getCategoryListItems } from "../../actions"; // Adjusted path
import BackButton from "@/components/ui/BackButton";
import { pageContainer, pageTitle, cardContainer } from "@/styles/ui-classes";

interface EditFilePageProps {
  params: {
    id: string;
  };
}

export default async function EditFilePage({ params }: EditFilePageProps) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== UserRole.admin) {
    redirect("/unauthorized");
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return <p className={pageContainer}>Invalid file ID.</p>;
  }

  let file: FileDetail | null = null;
  let error: string | null = null;

  try {
    file = await getFileById(id);
  } catch (err) {
    console.error(`Failed to fetch file ${id}:`, err);
    error = `Failed to load file data. Error: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }

  if (error) {
    return (
      <div className={pageContainer}>
        <p className="text-red-500 p-4">{error}</p>
      </div>
    );
  }

  if (!file) {
    return (
      <div className={pageContainer}>
        <p className="text-center p-4">File not found.</p>
      </div>
    );
  }

  const categoryListItems = await getCategoryListItems();

  return (
    <div className={pageContainer}>
      <div className="flex justify-between items-center mb-6">
        <h1 className={pageTitle}>Edit File</h1>
        <BackButton href="/admin/files" />
      </div>
      <div className={cardContainer}>
        <EditFileForm
          id={id}
          initialData={file}
          categoryListItems={categoryListItems}
        />
      </div>
    </div>
  );
}
