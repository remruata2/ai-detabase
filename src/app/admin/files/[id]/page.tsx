import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth-options";
import { UserRole } from "@/generated/prisma";
import { getFileById, FileDetail } from "../actions"; // Corrected path to actions.ts
import BackButton from "@/components/ui/BackButton"; // Corrected import for default export
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { pageContainer, pageTitle, cardContainer } from "@/styles/ui-classes";
import { format } from "date-fns";

interface ViewFilePageProps {
  params: {
    id: string;
  };
}

interface DetailItemProps {
  label: string;
  value?: string | null;
  isHtml?: boolean;
}

const DetailItem: React.FC<DetailItemProps> = ({
  label,
  value,
  isHtml = false,
}) => {
  if (value === null || value === undefined || value.trim() === "") return null;
  return (
    <div className="mb-4 pt-4 first:pt-0">
      <h3 className="text-sm font-medium text-gray-500">{label}</h3>
      {isHtml ? (
        <div className="mt-1 text-md text-gray-900 prose prose-sm max-w-none">
          <div dangerouslySetInnerHTML={{ __html: value }} />
        </div>
      ) : (
        <p className="mt-1 text-md text-gray-900 whitespace-pre-wrap">
          {value}
        </p>
      )}
    </div>
  );
};

export default async function ViewFilePage({ params }: ViewFilePageProps) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== UserRole.admin) {
    redirect("/unauthorized");
  }

  // In Next.js 15, we need to await params before accessing its properties
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id)) {
    return (
      <div className={pageContainer}>
        <p className="text-red-500 p-4">Invalid file ID.</p>
      </div>
    );
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

  return (
    <div className={pageContainer}>
      <div className="flex justify-between items-center mb-6">
        <h1 className={pageTitle}>File Details</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/admin/files/${file.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <BackButton href="/admin/files" />
        </div>
      </div>
      <div className={cardContainer}>
        <div className="px-4 py-5 sm:p-6">
          {" "}
          {/* Adjusted padding and removed divider for DetailItem's own top border/padding */}
          <DetailItem label="File No" value={file.file_no} />
          <DetailItem label="Category" value={file.category} />
          <DetailItem label="Title" value={file.title} />
          {file.entry_date_real && (
            <DetailItem
              label="Entry Date"
              value={format(new Date(file.entry_date_real), "PPP")}
            />
          )}
          {file.entry_date && file.entry_date_real !== file.entry_date && (
            <DetailItem
              label="Original Entry Date String"
              value={file.entry_date}
            />
          )}
          <DetailItem label="Note" value={file.note} isHtml={true} />
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <DetailItem
              key={`doc${num}`}
              label={`Document ${num}`}
              value={file[`doc${num}` as keyof FileDetail] as string | null}
            />
          ))}
          {file.created_at && (
            <DetailItem
              label="Created At"
              value={format(new Date(file.created_at), "PPP p")}
            />
          )}
          {file.updated_at && (
            <DetailItem
              label="Last Updated At"
              value={format(new Date(file.updated_at), "PPP p")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
