import { Link, useParams } from "react-router-dom";

import { AdminCareerDetail, useAdminCareerDetailPage } from "@/features/admin";
import { routePaths } from "@/routes/paths";
import { EmptyState } from "@/shared/components";
import { ContentPageSkeleton } from "@/shared/components/Skeletons";

export default function AdminCareerDetailPage(): JSX.Element {
  const { careerId } = useParams<{ careerId: string }>();
  const { career, isLoading } = useAdminCareerDetailPage(careerId);

  if (isLoading) {
    return <ContentPageSkeleton />;
  }

  if (!career) {
    return (
      <EmptyState
        title="Career not found"
        description="This career could not be loaded. Go back to the full library and choose another career."
        action={
          <Link className="button button--secondary" to={routePaths.adminCareers}>
            Back to career library
          </Link>
        }
      />
    );
  }

  return <AdminCareerDetail career={career} />;
}
