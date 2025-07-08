"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Controller } from "react-hook-form";
import TiptapEditor from "@/components/ui/TiptapEditor";
import { ActionResponse, FileDetail, CategoryListItem } from "./actions"; // Added CategoryListItem
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Define the Zod schema based on actions.ts (or import if centralized and exported)
const fileFormSchema = z.object({
  file_no: z.string().min(1, { message: "File No is required" }).max(100),
  category: z.string().min(1, { message: "Category is required" }).max(500),
  title: z.string().min(1, { message: "Title is required" }).max(500),
  note: z.string().optional().nullable(),
  doc1: z.any().optional(), // Changed for file input
  entry_date: z.string().optional().nullable(), // Expects YYYY-MM-DD from date input or empty string
});

type FileFormValues = z.infer<typeof fileFormSchema>;

interface FileFormProps {
  initialData?: FileDetail | null;
  onSubmitAction: (formData: FormData) => Promise<ActionResponse>;
  submitButtonText?: string;
  categoryListItems: CategoryListItem[]; // New prop for combobox data
}

export default function FileForm({
  initialData,
  onSubmitAction,
  submitButtonText = "Submit",
  categoryListItems, // Destructure new prop
}: FileFormProps) {
  const [fileNoPopoverOpen, setFileNoPopoverOpen] = useState(false);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  const router = useRouter();
  const form = useForm<FileFormValues>({
    resolver: zodResolver(fileFormSchema),
    defaultValues: {
      file_no: initialData?.file_no || "",
      category: initialData?.category || "",
      title: initialData?.title || "",
      note: initialData?.note || "",
      doc1: initialData?.doc1 || "",
      entry_date:
        initialData?.entry_date_real || new Date().toISOString().split("T")[0], // Use entry_date_real or today's date
    },
  });

  const {
    formState: { isSubmitting },
  } = form;

  async function onSubmit(data: FileFormValues) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === "doc1") {
        // Handle file input: data.doc1 will be a FileList
        if (value && (value as FileList).length > 0) {
          formData.append(key, (value as FileList)[0]);
        }
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    try {
      const result = await onSubmitAction(formData);
      if (result.success) {
        toast.success(result.message || "Operation successful!");
        router.push("/admin/files");
        router.refresh(); // To ensure the list page shows updated data
      } else {
        toast.error(result.error || "An error occurred.");
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, errors]) => {
            if (errors && errors.length > 0) {
              form.setError(field as keyof FileFormValues, {
                type: "manual",
                message: errors.join(", "),
              });
            }
          });
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error("Form submission error:", error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="file_no"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>File No *</FormLabel>
              <Popover
                open={fileNoPopoverOpen}
                onOpenChange={setFileNoPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? categoryListItems.find(
                            (item) => item.file_no === field.value
                          )?.file_no
                        : "Select File No"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Search file no..." />
                    <CommandList>
                      <CommandEmpty>No file number found.</CommandEmpty>
                      <CommandGroup>
                        {categoryListItems.map((item) => (
                          <CommandItem
                            value={item.file_no}
                            key={item.id}
                            onSelect={(currentValue: string) => {
                              form.setValue(
                                "file_no",
                                currentValue === field.value
                                  ? ""
                                  : currentValue,
                                { shouldValidate: true, shouldDirty: true }
                              );
                              const linkedItem = categoryListItems.find(
                                (li) => li.file_no === currentValue
                              );
                              if (linkedItem) {
                                form.setValue("category", linkedItem.category, {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                });
                              }
                              setFileNoPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0", // Added shrink-0
                                item.file_no === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="truncate">{item.file_no}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Category *</FormLabel>
              <Popover
                open={categoryPopoverOpen}
                onOpenChange={setCategoryPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? categoryListItems.find(
                            (item) => item.category === field.value // Potential issue if categories are not unique, shows first match
                          )?.category
                        : "Select Category"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Search category..." />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        {/* Create a unique list of categories for selection if needed, here using all */}
                        {categoryListItems.map((item) => (
                          <CommandItem
                            value={item.category} // Using category as value, ensure it's unique enough or handle selection carefully
                            key={`${item.id}-cat-${item.category}`}
                            onSelect={(currentValue: string) => {
                              form.setValue(
                                "category",
                                currentValue === field.value
                                  ? ""
                                  : currentValue,
                                { shouldValidate: true, shouldDirty: true }
                              );
                              const linkedItem = categoryListItems.find(
                                (li) => li.category === currentValue
                              );
                              if (linkedItem) {
                                form.setValue("file_no", linkedItem.file_no, {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                });
                              }
                              setCategoryPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0", // Added shrink-0
                                item.category === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="truncate">{item.category}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="Enter title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="entry_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entry Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value || ""} />
              </FormControl>
              <FormDescription>
                The date associated with the file entry.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {isClient && (
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Controller
                    name="note"
                    control={form.control}
                    defaultValue={field.value || ""}
                    render={({ field: controllerField }) => {
                      if (!isClient) {
                        return (
                          <div className="w-full p-2 border rounded min-h-[200px] bg-gray-100 text-gray-500 flex items-center justify-center">
                            Loading editor...
                          </div>
                        );
                      }
                      return (
                        <TiptapEditor
                          initialHtml={controllerField.value}
                          onChange={controllerField.onChange}
                        />
                      );
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="doc1"
          render={({ field: { onChange, onBlur, name, ref } }) => (
            <FormItem>
              <FormLabel>Upload Document/Image</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  onChange={(e) => onChange(e.target.files)}
                  onBlur={onBlur}
                  name={name}
                  ref={ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {isSubmitting ? "Submitting..." : submitButtonText}
        </Button>
      </form>
    </Form>
  );
}
