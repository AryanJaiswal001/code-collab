import { getAllPlaygroundForUser } from "@/app/modules/dashboard/actions";
import Dashboard from "@/app/modules/dashboard/components/dashboard";

const Page = async () => {
  const playgrounds = await getAllPlaygroundForUser();

  return (
    <Dashboard
      projects={playgrounds}
      initialError={null}
    />
  );
};

export default Page;
