"use client";

import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { toast } from "sonner";

const AddRepo = () => {
  return (
    <Button
      variant="outline"
      className="rounded-2xl"
      onClick={() => toast.info("GitHub import can be added next.")}
    >
      <ArrowDown className="mr-2 h-4 w-4" />
      Import Repo
    </Button>
  );
};

export default AddRepo;
