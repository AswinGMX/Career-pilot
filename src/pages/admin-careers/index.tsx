import { AdminCareerLibrary, useAdminCareerLibraryPage } from "@/features/admin";
import { TablePageSkeleton } from "@/shared/components/Skeletons";

export default function AdminCareersPage(): JSX.Element {
  const { categories, category, filteredCareers, isLoading, search, setCategory, setSearch } = useAdminCareerLibraryPage();

  if (isLoading) {
    return <TablePageSkeleton />;
  }

  return (
    <AdminCareerLibrary
      categories={categories}
      careers={filteredCareers}
      category={category}
      onCategoryChange={setCategory}
      onSearchChange={setSearch}
      search={search}
    />
  );
}
