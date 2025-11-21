import PortfolioSurface from "@/components/portfolio/portfolio-surface";

export const metadata = {
  title: "Tidview Portfolio",
};

export default function PortfolioPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6 lg:py-12">
      <PortfolioSurface />
    </main>
  );
}
