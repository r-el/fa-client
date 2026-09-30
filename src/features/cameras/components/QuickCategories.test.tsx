import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuickCategories } from "./QuickCategories";
import {
  isCategorySelected,
  parseClassesList,
  toggleCategoryClasses,
} from "./quickCategoriesUtils";

describe("QuickCategories pure functions", () => {
  it("parseClassesList parses and trims comma-separated classes", () => {
    expect(parseClassesList(" person, Car , , TRUCK ")).toEqual(["person", "car", "truck"]);
  });

  it("isCategorySelected returns true only if all category items are present", () => {
    expect(isCategorySelected("person, car", ["person"])).toBe(true);
    expect(isCategorySelected("person, car", ["person", "dog"])).toBe(false);
    expect(isCategorySelected("", ["person"])).toBe(false);
  });

  it("toggleCategoryClasses adds items when not selected and removes when selected", () => {
    const withPerson = toggleCategoryClasses("", ["person"]);
    expect(withPerson).toBe("person");

    const withoutPerson = toggleCategoryClasses("person, car", ["person"]);
    expect(withoutPerson).toBe("car");

    const withVehicles = toggleCategoryClasses("person", ["car", "truck"]);
    expect(withVehicles).toBe("person, car, truck");
  });
});

describe("QuickCategories component", () => {
  it("renders all categories and indicates selection", () => {
    const onChange = vi.fn();
    render(<QuickCategories classes="person" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "People" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Vehicles" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bags & Luggage" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Animals" })).toBeTruthy();
  });

  it("calls onChange with toggled classes on click", () => {
    const onChange = vi.fn();
    render(<QuickCategories classes="person" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Vehicles" }));
    expect(onChange).toHaveBeenCalledWith("person, car, truck, bus, motorcycle, bicycle");

    fireEvent.click(screen.getByRole("button", { name: "People" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("disables all buttons when disabled prop is true", () => {
    render(<QuickCategories classes="" onChange={vi.fn()} disabled />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.every((btn) => (btn as HTMLButtonElement).disabled)).toBe(true);
  });
});
