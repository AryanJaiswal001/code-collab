import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="z-20 flex flex-col md:flex-row items-center justify-between min-h-[calc(100vh-80px)] py-10 px-6 md:px-12 xl:px-24">
      <div className="flex-1 flex flex-col justify-center items-start text-left max-w-2xl">
        <h1 className="text-5xl md:text-7xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-blue-700 to-blue-900 dark:from-blue-400 dark:via-blue-500 dark:to-blue-600 tracking-tight leading-[1.2] mb-6">
          Code With Intelligence and Seamless Collaboration
        </h1>

        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          Code Collab Editor is a powerful and intelligent code editor that
          enhances your coding experience with advanced features and seamless
          integration. A one-of-a-kind collaborative coding environment where
          you code with synchronized teamwork like never before.
        </p>

        <div className="flex items-center">
          <Button
            asChild
            size={"lg"}
            className="text-md px-8 py-6 rounded-full font-semibold shadow-lg hover:shadow-blue-500/25 transition-all"
          >
            <Link href="/auth/sign-in">
              Get Started
              <ArrowUpRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 flex justify-center items-center mt-12 md:mt-0 relative w-full max-w-lg md:max-w-xl">
        <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full w-full h-full z-0"></div>
        <Image
          src={"/home.svg"}
          alt="Hero Section"
          height={600}
          width={600}
          className="z-10 object-contain drop-shadow-2xl"
          priority
        />
      </div>
    </div>
  );
}
