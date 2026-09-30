import {
  DETECTION_CATEGORIES,
  isCategorySelected,
  toggleCategoryClasses,
} from "./quickCategoriesUtils";

export interface QuickCategoriesProps {
  classes: string;
  onChange: (nextClasses: string) => void;
  disabled?: boolean;
}

export function QuickCategories({ classes, onChange, disabled = false }: QuickCategoriesProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">Quick categories</span>
      <div className="flex flex-wrap gap-1.5">
        {DETECTION_CATEGORIES.map((category) => {
          const isSelected = isCategorySelected(classes, category.items);
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => onChange(toggleCategoryClasses(classes, category.items))}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                isSelected
                  ? "border-primary bg-primary/20 text-primary-foreground shadow-sm shadow-primary/20"
                  : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{category.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
