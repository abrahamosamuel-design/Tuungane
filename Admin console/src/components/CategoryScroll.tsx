import { Link } from "@tanstack/react-router";

export type CategoryItem = {
  id: string;
  name: string;
  icon: React.ReactNode;
  colorClass: string;
  isMore?: boolean;
  link?: string;
};

export function CategoryScroll({ title, categories }: { title: string; categories: CategoryItem[] }) {
  return (
    <div className="py-5 bg-white md:hidden">
      <div className="mb-4 px-6 flex items-center justify-between">
        <h3 className="text-base font-bold text-navy">{title}</h3>
        <Link to="/services" className="text-sm font-semibold text-orange hover:underline">
          View All
        </Link>
      </div>
      <div className="flex overflow-x-auto pb-4 px-6 gap-3 no-scrollbar snap-x">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={cat.link || `/services`}
            search={!cat.link && !cat.isMore ? ({ q: cat.name } as any) : undefined}
            className="flex flex-1 min-w-[72px] flex-col items-center gap-2 snap-start"
          >
            <div className={`flex h-[72px] w-[72px] items-center justify-center rounded-[24px] ${cat.colorClass} text-white shadow-sm transition-transform hover:scale-105 active:scale-95`}>
              {cat.icon}
            </div>
            <span className="text-[12px] font-bold text-navy text-center leading-tight">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
